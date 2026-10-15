// Browser-only fixture: real RN Web modals, no account/provider/API.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { WebViewportGate } from '../../components/WebViewportGate/index.web';
import { MatchModal } from '../../components/MatchModal';
import { ProfileSettingsModal } from '../../components/ProfileSettingsModal';
function Runtime() {
  const [settings, setSettings] = useState(false); const [match, setMatch] = useState(false); const [draft, setDraft] = useState(''); const [cropping, setCropping] = useState(false);
  return <><button onClick={() => setSettings(true)}>Abrir configurações</button><button onClick={() => setMatch(true)}>Abrir match</button>
    <ProfileSettingsModal visible={settings} route="editProfile" busy={false} cropping={cropping} available={[]} onBack={() => { if (cropping) setCropping(false); else setSettings(false); }} onClose={() => setSettings(false)} onRoute={() => {}}>
      {cropping ? <><p>Recorte em andamento</p><button onClick={() => setCropping(false)}>Cancelar recorte</button></> : <><input aria-label="Rascunho do perfil" value={draft} onChange={event => setDraft(event.target.value)} /><button onClick={() => setCropping(true)}>Iniciar recorte</button></>}
    </ProfileSettingsModal>
    <MatchModal visible={match} reduceMotion onClose={() => setMatch(false)} onMessages={() => {}} />
  </>;
}
createRoot(document.getElementById('root')!).render(<WebViewportGate notice={<main><h1>Continue no celular ou tablet</h1><button>Guia de instalação</button></main>}><Runtime /></WebViewportGate>);
