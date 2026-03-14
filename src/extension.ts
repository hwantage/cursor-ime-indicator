import * as vscode from 'vscode';
import { ImeDetector } from './imeDetector';
import { CursorDecorator } from './cursorDecorator';
import { getLanguageLabel } from './languageMap';

let imeDetector: ImeDetector | undefined;
let cursorDecorator: CursorDecorator | undefined;

export function activate(context: vscode.ExtensionContext) {
  cursorDecorator = new CursorDecorator();
  imeDetector = new ImeDetector(context);

  // Wire IME changes to cursor decoration
  imeDetector.onLanguageChange((inputSourceId) => {
    const label = getLanguageLabel(inputSourceId);
    cursorDecorator?.updateLabel(label);
  });

  // Start IME detection
  imeDetector.start();

  // Update decoration position on cursor move
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(() => {
      cursorDecorator?.updatePosition();
    })
  );

  // Update when active editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      cursorDecorator?.updatePosition();
    })
  );

  // Toggle command
  context.subscriptions.push(
    vscode.commands.registerCommand('cursorImeIndicator.toggle', () => {
      cursorDecorator?.toggle();
      const state = cursorDecorator?.isEnabled() ? 'enabled' : 'disabled';
      vscode.window.showInformationMessage(`Cursor IME Indicator: ${state}`);
    })
  );

  // React to config changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('cursorImeIndicator')) {
        cursorDecorator?.onConfigChange();
      }
    })
  );

  // Cleanup
  context.subscriptions.push({
    dispose: () => {
      imeDetector?.dispose();
      cursorDecorator?.dispose();
    },
  });
}

export function deactivate() {
  imeDetector?.dispose();
  cursorDecorator?.dispose();
  imeDetector = undefined;
  cursorDecorator = undefined;
}
