import { spawn, execSync, ChildProcess, execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { PlatformDetector, LanguageChangeCallback } from './platformDetector';

export class MacosDetector implements PlatformDetector {
  private nativeProcess: ChildProcess | undefined;
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

      this.nativeProcess = spawn(binaryPath, [], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdoutBuffer = '';
      this.nativeProcess.stdout?.setEncoding('utf-8');
      this.nativeProcess.stdout?.on('data', (data: string) => {
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

      this.nativeProcess.stderr?.setEncoding('utf-8');
      this.nativeProcess.stderr?.on('data', (data: string) => {
        this.log(`Native watcher stderr: ${data.trim()}`);
      });

      this.nativeProcess.on('error', (err) => {
        this.log(`Native watcher error: ${err.message}`);
        this.nativeProcess = undefined;
        this.startPolling();
      });

      this.nativeProcess.on('exit', (code) => {
        this.log(`Native watcher exited with code ${code}`);
        this.nativeProcess = undefined;
      });

      return true;
    } catch (err: any) {
      this.log(`Failed to start native watcher: ${err.message}`);
      return false;
    }
  }

  private async ensureNativeBinary(): Promise<string | null> {
    const binDir = path.join(this.globalStoragePath, 'bin');
    const binaryPath = path.join(binDir, 'im-detect');

    if (fs.existsSync(binaryPath)) {
      return binaryPath;
    }

    const swiftSource = path.join(this.extensionPath, 'native', 'macos', 'im-detect.swift');
    if (!fs.existsSync(swiftSource)) {
      this.log('Swift source not found');
      return null;
    }

    fs.mkdirSync(binDir, { recursive: true });

    try {
      this.log('Compiling native helper...');
      execSync(
        `swiftc -O -o "${binaryPath}" "${swiftSource}" -framework Carbon -framework Cocoa`,
        { timeout: 60000, encoding: 'utf-8' }
      );
      this.log('Native helper compiled successfully');
      return binaryPath;
    } catch (err: any) {
      this.log(`Swift compilation failed: ${err.message}`);
      return null;
    }
  }

  startPolling(): void {
    if (this.pollTimer) {
      return;
    }

    const config = vscode.workspace.getConfiguration('cursorImeIndicator');
    const interval = config.get<number>('pollingInterval', 300);

    this.log(`Starting polling mode (interval: ${interval}ms)`);

    this.pollMacOS();

    this.pollTimer = setInterval(() => {
      this.pollMacOS();
    }, interval);
  }

  private pollMacOS(): void {
    execFile(
      'defaults',
      ['read', `${process.env.HOME}/Library/Preferences/com.apple.HIToolbox.plist`, 'AppleSelectedInputSources'],
      { encoding: 'utf-8', timeout: 2000 },
      (err, stdout) => {
        if (err) {
          return;
        }
        this.parseMacOSDefaultsOutput(stdout);
      }
    );
  }

  private parseMacOSDefaultsOutput(output: string): void {
    const inputModeMatch = output.match(/"Input Mode"\s*=\s*"([^"]+)"/);
    if (inputModeMatch) {
      this.onLanguageChange(inputModeMatch[1]);
      return;
    }

    const layoutMatch = output.match(/"KeyboardLayout Name"\s*=\s*"?([^";}\n]+)/);
    if (layoutMatch) {
      const name = layoutMatch[1].trim();
      this.onLanguageChange(`com.apple.keylayout.${name}`);
      return;
    }

    const bundleMatch = output.match(/"Bundle ID"\s*=\s*"([^"]+)"/);
    if (bundleMatch) {
      this.onLanguageChange(bundleMatch[1]);
    }
  }

  private log(message: string): void {
    this.outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
  }

  stop(): void {
    if (this.nativeProcess) {
      this.nativeProcess.kill('SIGTERM');
      this.nativeProcess = undefined;
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
