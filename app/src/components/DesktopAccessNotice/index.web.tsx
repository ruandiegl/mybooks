import { useState } from 'react';
import { AppButton } from '../AppButton';
import { useAppTheme } from '../../providers/ThemeProvider';
import { getPublicHandoffUrl } from '../../features/pwa/handoffUrl';
import { QrCode } from './QrCode.web';
import { noticeStyles } from './styles.web';

export function DesktopAccessNotice({ onShowGuide }: { onShowGuide(): void }) {
  const { theme } = useAppTheme();
  const [message, setMessage] = useState('');
  const url = getPublicHandoffUrl(window.location.origin);
  async function copy() {
    try { await navigator.clipboard.writeText(url); setMessage('Link copiado. Abra no celular ou tablet.'); }
    catch { setMessage('Selecione o link abaixo do QR code e copie pelo menu do navegador.'); }
  }
  return <main className="tl-desktop"><style>{noticeStyles(theme)}</style><div className="tl-desktop-layout">
    <section><div className="tl-desktop-brand">TrocaLivros</div>
      <h1>Continue no celular ou tablet</h1>
      <p>O TrocaLivros foi pensado para telas menores. Acesse pelo celular ou tablet para descobrir livros e organizar suas trocas.</p>
      <div className="tl-desktop-actions"><AppButton label="Copiar link" icon="content-copy" onPress={() => { void copy(); }} /><AppButton label="Como instalar no celular" variant="outline" onPress={onShowGuide} /></div>
      <p role="status" aria-live="polite" className="tl-desktop-small">{message || 'Compatível com janelas de até 1024 px. No tablet, experimente girar o dispositivo ou reduzir a janela.'}</p>
    </section>
    <section className="tl-desktop-qr" aria-label="Continue em outro dispositivo"><QrCode url={url} /><p>Aponte a câmera do celular para abrir.</p><a className="tl-desktop-url" href={url}>{url}</a></section>
  </div></main>;
}
