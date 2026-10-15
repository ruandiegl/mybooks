export type SettingsRoute = 'menu' | 'editProfile' | 'account' | 'appearance' | 'password' | 'notifications' | 'help' | 'about' | 'install' | 'confirmSignOut' | 'confirmSignOutAll' | 'confirmDiscard';
export const settingsTitles: Record<SettingsRoute, string> = {
  menu: 'Configurações', editProfile: 'Editar perfil', account: 'Minha conta', appearance: 'Aparência',
  password: 'Senha e segurança', notifications: 'Notificações', help: 'Ajuda', about: 'Sobre o TrocaLivros',
  install: 'Instalar aplicativo', confirmSignOut: 'Sair da conta', confirmSignOutAll: 'Sair de todos os dispositivos', confirmDiscard: 'Descartar alterações?'
};
