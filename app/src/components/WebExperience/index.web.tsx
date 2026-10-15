import { useState, type PropsWithChildren } from 'react';
import { WebViewportGate } from '../WebViewportGate/index.web';
import { DesktopAccessNotice } from '../DesktopAccessNotice/index.web';
import { PwaInstallSettingsPanel } from '../PwaInstallPanel/index.web';
import { AppButton } from '../AppButton';
import { useAppTheme } from '../../providers/ThemeProvider';

export function WebExperience({ children }: PropsWithChildren) {
  const { theme } = useAppTheme();
  const [guide, setGuide] = useState(false);
  const notice = guide ? <main style={{ boxSizing: 'border-box', padding: 'max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left))', width: '100%', maxWidth: 608, margin: 'auto', fontFamily: theme.typography.regular }}>
    <AppButton label="Voltar ao acesso no celular" variant="ghost" icon="arrow-back" onPress={() => setGuide(false)} />
    <h1 style={{ fontFamily: theme.typography.bold, fontSize: 28, lineHeight: 1.3 }}>Instalar no celular ou tablet</h1><PwaInstallSettingsPanel allowDirectInstall={false} />
  </main> : <DesktopAccessNotice onShowGuide={() => setGuide(true)} />;
  return <WebViewportGate notice={notice}>{children}</WebViewportGate>;
}
