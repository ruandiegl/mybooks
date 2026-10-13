import type { ReactNode } from 'react';
import type { SettingsRoute } from '../../features/settings/settingsTypes';
export type ProfileSettingsModalProps = {
  visible: boolean; route: SettingsRoute; busy: boolean; cropping?: boolean;
  onBack(): void; onClose(): void; onRoute(route: SettingsRoute): void;
  available: SettingsRoute[]; children?: ReactNode; appearanceLabel?: string;
};
