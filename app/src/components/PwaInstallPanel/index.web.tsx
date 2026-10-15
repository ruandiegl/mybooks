import { useState } from 'react';
import { AppButton } from '../AppButton';
import { usePwaInstall } from '../../features/pwa/PwaInstallContext';
import { guideOptions, guideSteps, suggestGuidePlatform } from '../../features/pwa/installGuideContent';
import type { GuidePlatform } from '../../features/pwa/pwa.types';
import { useAppTheme } from '../../providers/ThemeProvider';
import { getPublicHandoffUrl } from '../../features/pwa/handoffUrl';
import { installStyles } from './styles.web';

export function PwaInstallSettingsPanel({ allowDirectInstall = true }: { allowDirectInstall?: boolean } = {}) {
  const [platform, setPlatform] = useState<GuidePlatform>(() => suggestGuidePlatform(navigator));
  return <PwaInstallPanel platform={platform} onPlatformChange={setPlatform} allowDirectInstall={allowDirectInstall} />;
}
export function PwaInstallPanel({ platform, onPlatformChange, allowDirectInstall = true }: { platform: GuidePlatform; onPlatformChange(value: GuidePlatform): void; allowDirectInstall?: boolean }) {
  const { theme } = useAppTheme();
  const { state, error, requestInstall } = usePwaInstall();
  const [copyStatus, setCopyStatus] = useState('');
  const installed = state === 'standalone' || state === 'confirmed';
  const url = getPublicHandoffUrl(window.location.origin);
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopyStatus('Link copiado.'); }
    catch { setCopyStatus('Selecione o link acima e copie pelo menu do navegador.'); }
  }
  return <section className="tl-install" aria-label="Guia de instalação"><style>{installStyles(theme)}</style>
    {installed ? <p className="tl-install-status">O TrocaLivros já está disponível como aplicativo. Abra pelo ícone na tela inicial.</p> : <p>Adicione o TrocaLivros à tela inicial para abrir como um aplicativo.</p>}
    <div className="tl-install-platforms" role="group" aria-label="Escolha seu dispositivo">{guideOptions.map(option => <button type="button" key={option.value} aria-pressed={platform === option.value} onClick={() => onPlatformChange(option.value)}>{option.label}</button>)}</div>
    <ol>{guideSteps[platform].map(step => <li key={step}>{step}</li>)}</ol>
    {allowDirectInstall && (state === 'ready' || state === 'prompting') ? <AppButton label="Instalar TrocaLivros" loading={state === 'prompting'} icon="download" onPress={() => { void requestInstall(); }} /> : null}
    {state === 'accepted' ? <p role="status">Instalação solicitada. Conclua a confirmação no navegador.</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    <a className="tl-install-url" href={url}>{url}</a>
    <AppButton label="Copiar link" variant="outline" icon="content-copy" onPress={() => { void copy(); }} />
    <p role="status" aria-live="polite">{copyStatus}</p>
    <p className="tl-install-note">É necessário estar conectado à internet para usar sua conta. No iPhone/iPad, a instalação precisa ser confirmada pelo menu do navegador.</p>
  </section>;
}
