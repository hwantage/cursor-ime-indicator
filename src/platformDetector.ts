export type LanguageChangeCallback = (inputSourceId: string) => void;

export interface PlatformDetector {
  start(): Promise<boolean>;
  startPolling(): void;
  stop(): void;
  dispose(): void;
}
