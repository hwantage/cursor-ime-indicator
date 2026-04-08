import { spawn, execSync, ChildProcess, execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { PlatformDetector, LanguageChangeCallback } from './platformDetector';

export class WindowsDetector implements PlatformDetector {
  private watcherProcess: ChildProcess | undefined;
  private pollTimer: ReturnType<typeof setInterval> | undefined;
  private globalStoragePath: string;
  private extensionPath: string;
  private outputChannel: vscode.OutputChannel;
  private onLanguageChange: LanguageChangeCallback;

  constructor(
    globalStoragePath: string,
    extensionPath: string,
    outputChannel: vscode.OutputChannel,
    onLanguageChange: LanguageChangeCallback
  ) {
    this.globalStoragePath = globalStoragePath;
    this.extensionPath = extensionPath;
    this.outputChannel = outputChannel;
    this.onLanguageChange = onLanguageChange;
  }

  async start(): Promise<boolean> {
    try {
      const binaryPath = await this.ensureNativeBinary();
      if (!binaryPath) {
        return false;
      }

      this.log(`Starting native watcher: ${binaryPath}`);

      this.watcherProcess = spawn(binaryPath, [], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdoutBuffer = '';
      this.watcherProcess.stdout?.setEncoding('utf-8');
      this.watcherProcess.stdout?.on('data', (data: string) => {
        stdoutBuffer += data;
        const lines = stdoutBuffer.split('\n');
        stdoutBuffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            this.onLanguageChange(trimmed);
          }
        }
      });

      this.watcherProcess.stderr?.setEncoding('utf-8');
      this.watcherProcess.stderr?.on('data', (data: string) => {
        this.log(`Native watcher stderr: ${data.trim()}`);
      });

      this.watcherProcess.on('error', (err) => {
        this.log(`Native watcher error: ${err.message}`);
        this.watcherProcess = undefined;
        this.startPolling();
      });

      this.watcherProcess.on('exit', (code) => {
        this.log(`Native watcher exited with code ${code}`);
        this.watcherProcess = undefined;
        if (code !== 0) {
          this.startPolling();
        }
      });

      return true;
    } catch (err: any) {
      this.log(`Failed to start native watcher: ${err.message}`);
      return false;
    }
  }

  private async ensureNativeBinary(): Promise<string | null> {
    const binDir = path.join(this.globalStoragePath, 'bin');
    const binaryPath = path.join(binDir, 'im-detect.exe');
    const csSource = path.join(this.extensionPath, 'native', 'windows', 'im-detect.cs');

    if (!fs.existsSync(csSource)) {
      this.log('C# source not found');
      return null;
    }

    // Check if binary exists and is up-to-date
    const binaryExists = fs.existsSync(binaryPath);
    if (binaryExists) {
      try {
        const srcMtime = fs.statSync(csSource).mtimeMs;
        const binMtime = fs.statSync(binaryPath).mtimeMs;
        if (binMtime >= srcMtime) {
          return binaryPath;
        }
        this.log('Native helper outdated, recompiling...');
      } catch {
        // If stat fails, try using existing binary
        return binaryPath;
      }
    }

    // Try to compile
    fs.mkdirSync(binDir, { recursive: true });

    const cscPath = this.findCscExe();
    if (!cscPath) {
      this.log('csc.exe not found');
      // If old binary exists but couldn't be recompiled, use it anyway
      return binaryExists ? binaryPath : null;
    }

    // If old binary is locked, try deleting first
    if (binaryExists) {
      try {
        fs.unlinkSync(binaryPath);
      } catch {
        this.log('Could not delete old binary (may be locked), using existing');
        return binaryPath;
      }
    }

    try {
      this.log(`Compiling native helper with ${cscPath}...`);
      execSync(
        `"${cscPath}" /optimize /out:"${binaryPath}" "${csSource}"`,
        { timeout: 60000, encoding: 'utf-8' }
      );
      this.log('Native helper compiled successfully');
      return binaryPath;
    } catch (err: any) {
      this.log(`C# compilation failed: ${err.message}`);
      return null;
    }
  }

  private findCscExe(): string | null {
    const frameworkPaths = [
      path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
      path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe'),
    ];

    for (const p of frameworkPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    try {
      const result = execSync('where csc.exe', { encoding: 'utf-8', timeout: 5000 });
      const firstLine = result.trim().split('\n')[0]?.trim();
      if (firstLine && fs.existsSync(firstLine)) {
        return firstLine;
      }
    } catch {
      // not in PATH
    }

    return null;
  }

  startPolling(): void {
    if (this.watcherProcess || this.pollTimer) {
      return;
    }

    // Tier 2: Persistent PowerShell process with IME detection
    const psScript = path.join(this.extensionPath, 'native', 'windows', 'im-detect.ps1');
    if (fs.existsSync(psScript)) {
      try {
        this.log('Trying PowerShell persistent fallback');

        this.watcherProcess = spawn(
          'powershell',
          ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psScript],
          { stdio: ['ignore', 'pipe', 'pipe'] }
        );

        let psStdoutBuffer = '';
        this.watcherProcess.stdout?.setEncoding('utf-8');
        this.watcherProcess.stdout?.on('data', (data: string) => {
          psStdoutBuffer += data;
          const lines = psStdoutBuffer.split('\n');
          psStdoutBuffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
              this.onLanguageChange(trimmed);
            }
          }
        });

        this.watcherProcess.stderr?.setEncoding('utf-8');
        this.watcherProcess.stderr?.on('data', (data: string) => {
          this.log(`PS fallback stderr: ${data.trim()}`);
        });

        this.watcherProcess.on('error', (err) => {
          this.log(`PS fallback error: ${err.message}`);
          this.watcherProcess = undefined;
          this.startSimplePolling();
        });

        this.watcherProcess.on('exit', (code) => {
          this.log(`PS fallback exited with code ${code}`);
          this.watcherProcess = undefined;
          if (code !== 0) {
            this.startSimplePolling();
          }
        });

        return;
      } catch (err: any) {
        this.log(`PS fallback spawn failed: ${err.message}`);
      }
    }

    // Tier 3: Simple interval-based polling (guaranteed to work)
    this.startSimplePolling();
  }

  private startSimplePolling(): void {
    if (this.pollTimer || this.watcherProcess) {
      return;
    }

    const config = vscode.workspace.getConfiguration('cursorImeIndicator');
    const interval = config.get<number>('pollingInterval', 300);

    this.log(`Starting simple polling fallback (interval: ${interval}ms)`);

    this.pollWindowsSimple();

    this.pollTimer = setInterval(() => {
      this.pollWindowsSimple();
    }, interval);
  }

  private pollWindowsSimple(): void {
    const psCommand = `
      $def = @'
      using System;
      using System.Runtime.InteropServices;
      using System.Globalization;
      public class IMEDetector {
          [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
          [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pId);
          [DllImport("user32.dll")] public static extern IntPtr GetKeyboardLayout(uint idThread);
          [DllImport("imm32.dll")] public static extern IntPtr ImmGetDefaultIMEWnd(IntPtr hWnd);
          [DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
          public static string Detect() {
              IntPtr hwnd = GetForegroundWindow();
              uint pId;
              uint threadId = GetWindowThreadProcessId(hwnd, out pId);
              IntPtr hkl = GetKeyboardLayout(threadId);
              string cultureName = CultureInfo.GetCultureInfo((int)hkl & 0xFFFF).Name;
              if (cultureName.StartsWith("ko") || cultureName.StartsWith("ja") || cultureName.StartsWith("zh")) {
                  IntPtr imeWnd = ImmGetDefaultIMEWnd(hwnd);
                  if (imeWnd != IntPtr.Zero) {
                      int mode = (int)SendMessage(imeWnd, 0x0283u, (IntPtr)1, IntPtr.Zero);
                      if ((mode & 1) == 0) return "en-US";
                  }
              }
              return cultureName;
          }
      }
'@
      Add-Type -TypeDefinition $def -ErrorAction SilentlyContinue
      [IMEDetector]::Detect()
    `.replace(/\n/g, ' ');

    execFile(
      'powershell',
      ['-NoProfile', '-Command', psCommand],
      { encoding: 'utf-8', timeout: 5000 },
      (err, stdout) => {
        if (err) {
          return;
        }
        const trimmed = stdout.trim();
        if (trimmed) {
          this.onLanguageChange(trimmed);
        }
      }
    );
  }

  private log(message: string): void {
    this.outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
  }

  stop(): void {
    if (this.watcherProcess) {
      this.watcherProcess.kill();
      this.watcherProcess = undefined;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  dispose(): void {
    this.stop();
  }
}
