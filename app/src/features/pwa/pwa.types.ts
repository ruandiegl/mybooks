export type InstallState = 'unavailable' | 'manual' | 'ready' | 'prompting' | 'accepted' | 'confirmed' | 'standalone';
export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable' | 'error';
export type GuidePlatform = 'ios' | 'android' | 'other';
export type DeferredInstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};
export type InstallBridge = { pending: DeferredInstallPrompt | null; installed: boolean };
export type PwaInstallContextValue = {
  state: InstallState;
  error: string | null;
  requestInstall(): Promise<InstallOutcome>;
};
declare global {
  interface Window { __trocalivrosPwaInstallBridge?: InstallBridge; }
  interface Navigator { standalone?: boolean; }
}
