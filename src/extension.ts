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

  // Simulate Language command (Test)
  if (context.extensionMode === vscode.ExtensionMode.Development) {
    vscode.commands.executeCommand('setContext', 'cursorImeIndicator.isDevelopment', true);
    
    context.subscriptions.push(
      vscode.commands.registerCommand('cursorImeIndicator.simulateLanguage', async () => {
        const options = [
          { label: 'Korean', description: 'ko-KR', id: 'ko-KR' },
          { label: 'English', description: 'en-US', id: 'en-US' },
          { label: 'Chinese', description: 'com.apple.inputmethod.SCIM.ITABC', id: 'com.apple.inputmethod.SCIM.ITABC' },
          { label: 'Japanese', description: 'com.apple.inputmethod.Kotoeri.Romaji', id: 'com.apple.inputmethod.Kotoeri.Romaji' },
          { label: 'Russian', description: 'ru-RU', id: 'ru-RU' },
          { label: 'Arabic', description: 'ar-SA', id: 'ar-SA' },
          { label: 'Thai', description: 'th-TH', id: 'th-TH' },
          { label: 'Hindi', description: 'hi-IN', id: 'hi-IN' },
          { label: 'Greek', description: 'el-GR', id: 'el-GR' },
          { label: 'Hebrew', description: 'he-IL', id: 'he-IL' },
          { label: 'German', description: 'de-DE', id: 'de-DE' },
          { label: 'French', description: 'fr-FR', id: 'fr-FR' },
          { label: 'Spanish', description: 'es-ES', id: 'es-ES' },
          { label: 'Italian', description: 'it-IT', id: 'it-IT' },
          { label: 'Portuguese', description: 'pt-PT', id: 'pt-PT' },
          { label: 'Turkish', description: 'tr-TR', id: 'tr-TR' },
          { label: 'Polish', description: 'pl-PL', id: 'pl-PL' },
          { label: 'Dutch', description: 'nl-NL', id: 'nl-NL' },
          { label: 'Swedish', description: 'sv-SE', id: 'sv-SE' },
          { label: 'Norwegian', description: 'no-NO', id: 'no-NO' },
          { label: 'Danish', description: 'da-DK', id: 'da-DK' },
          { label: 'Finnish', description: 'fi-FI', id: 'fi-FI' },
          { label: 'Czech', description: 'cs-CZ', id: 'cs-CZ' },
          { label: 'Hungarian', description: 'hu-HU', id: 'hu-HU' },
          { label: 'Vietnamese', description: 'vi-VN', id: 'vi-VN' },
          { label: 'Custom...', description: 'Enter a custom language identifier', id: 'custom' }
        ];

        const selected = await vscode.window.showQuickPick(options, {
          placeHolder: 'Select a language to test'
        });

        if (selected) {
          let inputSourceId = selected.id;
          
          if (selected.id === 'custom') {
            const customId = await vscode.window.showInputBox({
              prompt: 'Enter a custom IME identifier (e.g., fr-FR, de-DE)',
              placeHolder: 'zh-CN'
            });
            if (!customId) return;
            inputSourceId = customId;
          }

          const label = getLanguageLabel(inputSourceId);
          cursorDecorator?.updateLabel(label);
          vscode.window.showInformationMessage(`[Test] IME language forcefully changed to '${label}' (${inputSourceId}).`);
        }
      })
    );
  }

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
