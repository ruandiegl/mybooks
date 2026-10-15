// Browser-only fixture: real RN Web modals, no account/provider/API.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { WebViewportGate } from '../../components/WebViewportGate/index.web';
import { MatchModal } from '../../components/MatchModal';
import { ProfileSettingsModal } from '../../components/ProfileSettingsModal';
function Runtime() {
  const [settings, setSettings] = useState(false); const [match, setMatch] = useState(false); const [draft, setDraft] = useState('');
  return <><button onClick={() => setSettings(true)}>Abrir configurações</button><button onClick={() => setMatch(true)}>Abrir match</button>
    <ProfileSettingsModal visible={settings} route="editProfile" busy={false} available={[]} onBack={() => setSettings(false)} onClose={() => setSettings(false)} onRoute={() => {}}><input aria-label="Rascunho do perfil" value={draft} onChange={event => setDraft(event.target.value)} /></ProfileSettingsModal>
    <MatchModal visible={match} reduceMotion onClose={() => setMatch(false)} onMessages={() => {}} />
  </>;
}
createRoot(document.getElementById('root')!).render(<WebViewportGate notice={<main><h1>Continue no celular ou tablet</h1><button>Guia de instalação</button></main>}><Runtime /></WebViewportGate>);
