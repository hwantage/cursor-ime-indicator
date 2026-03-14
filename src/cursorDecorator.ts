import * as vscode from 'vscode';

export class CursorDecorator {
  private decorationType: vscode.TextEditorDecorationType | undefined;
  private currentLabel = '';
  private enabled = true;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    const config = vscode.workspace.getConfiguration('cursorImeIndicator');
    this.enabled = config.get<boolean>('enabled', true);
  }

  updateLabel(label: string): void {
    if (label === this.currentLabel) {
      return;
    }
    this.currentLabel = label;
    this.recreateDecoration();
    this.updatePosition();
  }

  private recreateDecoration(): void {
    this.decorationType?.dispose();

    if (!this.enabled || !this.currentLabel) {
      this.decorationType = undefined;
      return;
    }

    const config = vscode.workspace.getConfiguration('cursorImeIndicator');
    const fontSize = Math.min(config.get<number>('fontSize', 0.8), 3);
    const opacity = config.get<number>('opacity', 0.7);
    const customColor = config.get<string>('color', '');
    const bold = config.get<boolean>('bold', true);

    const color: string | vscode.ThemeColor = customColor
      ? customColor
      : new vscode.ThemeColor('editorCursor.foreground') as any;

    const fontWeight = bold ? 'bold' : 'normal';

    this.decorationType = vscode.window.createTextEditorDecorationType({
      before: {
        contentText: this.currentLabel,
        color,
        fontWeight,
        textDecoration: `none; font-size: ${fontSize}em; display: inline-block; width: 0; height: 0; line-height: 0; margin: 0; padding: 0; border: none; overflow: visible; white-space: nowrap; vertical-align: baseline; transform: translate(2px, ${-1.2 / fontSize}em); opacity: ${opacity}; pointer-events: none; z-index: 1;`,
      },
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });
  }

  updatePosition(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !this.decorationType || !this.enabled) {
      return;
    }

    const pos = editor.selection.active;
    const range = new vscode.Range(pos, pos);
    editor.setDecorations(this.decorationType, [{ range }]);
  }

  clearDecorations(): void {
    const editor = vscode.window.activeTextEditor;
    if (editor && this.decorationType) {
      editor.setDecorations(this.decorationType, []);
    }
  }

  toggle(): void {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.recreateDecoration();
      this.updatePosition();
    } else {
      this.clearDecorations();
      this.decorationType?.dispose();
      this.decorationType = undefined;
    }
    return;
  }

  onConfigChange(): void {
    this.loadConfig();
    this.recreateDecoration();
    this.updatePosition();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  dispose(): void {
    this.decorationType?.dispose();
  }
}
