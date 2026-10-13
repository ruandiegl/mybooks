export type SettingsRoute = 'menu' | 'editProfile' | 'account' | 'appearance' | 'password' | 'notifications' | 'help' | 'about' | 'confirmSignOut' | 'confirmSignOutAll' | 'confirmDiscard';
export const settingsTitles: Record<SettingsRoute, string> = {
  menu: 'Configurações', editProfile: 'Editar perfil', account: 'Minha conta', appearance: 'Aparência',
  password: 'Senha e segurança', notifications: 'Notificações', help: 'Ajuda', about: 'Sobre o TrocaLivros',
  confirmSignOut: 'Sair da conta', confirmSignOutAll: 'Sair de todos os dispositivos', confirmDiscard: 'Descartar alterações?'
};
