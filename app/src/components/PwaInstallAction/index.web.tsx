import { useState } from 'react';
import { AppButton } from '../AppButton';
import { usePwaInstall } from '../../features/pwa/PwaInstallContext';
import { InstallGuideModal } from './InstallGuideModal.web';

export function PwaInstallAction() {
  const { state, error, requestInstall } = usePwaInstall();
  const [guide, setGuide] = useState(false);
  if (state === 'standalone' || state === 'confirmed' || state === 'unavailable') return null;
  return <div className="tl-install tl-install-action">
    <AppButton label={state === 'ready' || state === 'prompting' ? 'Instalar TrocaLivros' : 'Como instalar'} variant="ghost" icon="download" loading={state === 'prompting'} onPress={() => { if (state === 'ready') void requestInstall(); else setGuide(true); }} />
    {state === 'accepted' ? <p role="status">Instalação solicitada. Conclua no navegador.</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    {guide ? <InstallGuideModal onClose={() => setGuide(false)} /> : null}
  </div>;
}
