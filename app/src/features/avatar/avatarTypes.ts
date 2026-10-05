export type AvatarSource = { uri: string; width: number; height: number; ownedResource: boolean };
export type AvatarTransform = { zoom: number; offsetX: number; offsetY: number };
export type AvatarCropRect = { originX: number; originY: number; width: number; height: number };
export type PreparedAvatar = AvatarSource & { mimeType: 'image/png'; size: number; width: 512; height: 512 };
export function avatarDescriptorOf(user?:{avatarUrl?:string|null;avatarUrlExpiresAt?:string|null;avatarVersion?:number}|null){
  return {avatarUrl:user?.avatarUrl??null,avatarUrlExpiresAt:user?.avatarUrlExpiresAt??null,avatarVersion:user?.avatarVersion??0};
}
