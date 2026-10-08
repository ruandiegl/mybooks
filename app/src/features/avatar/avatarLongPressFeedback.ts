import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export async function avatarLongPressFeedback(): Promise<void> {
  try {
    if (Platform.OS === 'ios') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (Platform.OS === 'android') await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Long_Press);
    else if (Platform.OS === 'web' && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(12);
    // Safari/PWA on iPhone has no vibration API. Visual feedback still opens normally.
  } catch {
    // A disabled/unavailable haptics engine must never prevent viewing the photo.
  }
}
