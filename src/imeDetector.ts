import * as vscode from 'vscode';
import { PlatformDetector } from './platformDetector';
import { MacosDetector } from './macosDetector';
import { WindowsDetector } from './windowsDetector';

type LanguageChangeListener = (inputSourceId: string) => void;

export class ImeDetector {
  private detector: PlatformDetector | undefined;
  private listeners: LanguageChangeListener[] = [];
  private currentInputSource = '';
  private globalStoragePath: string;
  private extensionPath: string;
  private outputChannel: vscode.OutputChannel;

  constructor(context: vscode.ExtensionContext) {
    this.globalStoragePath = context.globalStorageUri.fsPath;
    this.extensionPath = context.extensionPath;
    this.outputChannel = vscode.window.createOutputChannel('Cursor IME Indicator');
  }

  onLanguageChange(listener: LanguageChangeListener): void {
    this.listeners.push(listener);
  }

  private notify(inputSourceId: string): void {
    const trimmed = inputSourceId.trim();
    if (!trimmed || trimmed === this.currentInputSource) {
      return;
    }
    this.currentInputSource = trimmed;
    for (const listener of this.listeners) {
      listener(trimmed);
    }
  }

  async start(): Promise<void> {
    if (process.platform === 'darwin') {
      this.detector = new MacosDetector(
        this.globalStoragePath, this.extensionPath, this.outputChannel,
        (id) => this.notify(id)
      );
    } else if (process.platform === 'win32') {
      this.detector = new WindowsDetector(
        this.globalStoragePath, this.extensionPath, this.outputChannel,
        (id) => this.notify(id)
      );
    } else {
      this.log(`Platform '${process.platform}' not yet supported`);
      return;
    }

    try {
      const started = await this.detector.start();
      if (!started) {
        this.log('Native watcher unavailable, falling back to polling');
        this.detector.startPolling();
      }
    } catch (err: any) {
      this.log(`Start failed: ${err.message}, falling back to polling`);
      try {
        this.detector.startPolling();
      } catch (pollErr: any) {
        this.log(`Polling also failed: ${pollErr.message}`);
      }
    }
  }

  private log(message: string): void {
    this.outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
  }

  stop(): void {
    this.detector?.stop();
  }

  dispose(): void {
    this.detector?.dispose();
    this.outputChannel.dispose();
  }
}
