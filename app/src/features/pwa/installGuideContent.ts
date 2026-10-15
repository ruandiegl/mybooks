import type { GuidePlatform } from './pwa.types';

export const guideOptions: { value: GuidePlatform; label: string }[] = [
  { value: 'ios', label: 'iPhone/iPad' }, { value: 'android', label: 'Android' }, { value: 'other', label: 'Outro navegador' },
];
export const guideSteps: Record<GuidePlatform, string[]> = {
  ios: [
    'Abra este site no Safari do iPhone ou iPad.',
    'Abra o menu do navegador e toque em Compartilhar. A posição pode variar conforme a versão.',
    'Escolha Adicionar à Tela de Início. Se a opção estiver oculta, procure em Editar Ações no menu.',
    'Ative Abrir como App da Web, quando essa opção aparecer, e toque em Adicionar.',
  ],
  android: [
    'Abra este site no Chrome ou em outro navegador compatível no Android.',
    'Use Instalar TrocaLivros, se esse botão estiver disponível aqui.',
    'Caso contrário, abra o menu do navegador e procure Instalar aplicativo ou Adicionar à tela inicial, quando disponível.',
    'Confirme a ação e abra o TrocaLivros pelo ícone. Algumas opções criam apenas um atalho, dependendo do navegador.',
  ],
  other: [
    'Se você abriu pelo Instagram, WhatsApp ou outro aplicativo, use o menu dele para abrir no Safari ou Chrome.',
    'Procure a opção de instalar ou adicionar à tela inicial no navegador. O nome e a disponibilidade podem variar.',
    'Se não encontrar a opção, você ainda pode usar o TrocaLivros no navegador em uma janela de até 1024 px.',
  ],
};
export function suggestGuidePlatform(device: { userAgent: string; platform: string; maxTouchPoints: number }): GuidePlatform {
  if (/iPad|iPhone|iPod/i.test(device.userAgent) || (device.platform === 'MacIntel' && device.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(device.userAgent)) return 'android';
  return 'other';
}
