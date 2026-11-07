export type SettingsRoute = 'menu' | 'editProfile' | 'account' | 'appearance' | 'password' | 'blockedUsers' | 'notifications' | 'help' | 'about' | 'install' | 'confirmSignOut' | 'confirmSignOutAll' | 'confirmDeleteAccount' | 'confirmDiscard';
export const settingsTitles: Record<SettingsRoute, string> = {
  menu: 'Configurações', editProfile: 'Editar perfil', account: 'Minha conta', appearance: 'Aparência',
  password: 'Senha e segurança', blockedUsers: 'Pessoas bloqueadas', notifications: 'Notificações', help: 'Ajuda', about: 'Sobre o TrocaLivros',
  install: 'Instalar aplicativo', confirmSignOut: 'Sair da conta', confirmSignOutAll: 'Sair de todos os dispositivos', confirmDeleteAccount: 'Excluir conta', confirmDiscard: 'Descartar alterações?'
};
