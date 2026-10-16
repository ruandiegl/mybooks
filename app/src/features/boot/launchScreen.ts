import * as SplashScreen from 'expo-splash-screen';

// Must run at module evaluation, before registerRootComponent. Never await resources here.
try { void SplashScreen.preventAutoHideAsync().catch(() => {}); } catch { /* Optional native bridge. */ }
let released = false;
export async function releaseLaunchScreen(): Promise<void> {
  if (released) return;
  released = true;
  try { SplashScreen.hide(); } catch { /* Missing/unsupported native bridge must not crash React. */ }
}
