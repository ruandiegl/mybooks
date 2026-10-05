import { api } from '../../services/api';
import type { ApiEnvelope,AvatarDescriptor } from '../../types/api';
import type { PreparedAvatar } from './avatarTypes';
import type { AvatarGrant } from './avatarUpload';
import { AvatarUploadError } from './avatarUpload';
function descriptor(data:AvatarDescriptor):AvatarDescriptor {
 if(!data||!Number.isInteger(data.avatarVersion)||data.avatarVersion<0)throw new AvatarUploadError('O envio de fotos ainda não está disponível. Tente novamente mais tarde.','AVATAR_PROTOCOL_UNSUPPORTED');
 return {avatarUrl:data.avatarUrl??null,avatarUrlExpiresAt:data.avatarUrlExpiresAt??null,avatarVersion:data.avatarVersion};
}
export const avatarApi={
 async presign(photo:PreparedAvatar):Promise<AvatarGrant>{return (await api.post<ApiEnvelope<AvatarGrant>>('/api/v1/me/avatar/presign',{mimeType:photo.mimeType,size:photo.size,width:512,height:512,protocolVersion:2})).data.data;},
 async complete(imageId:string):Promise<AvatarDescriptor>{return descriptor((await api.post<ApiEnvelope<AvatarDescriptor>>('/api/v1/me/avatar/complete',{imageId})).data.data);},
 async remove():Promise<AvatarDescriptor>{return descriptor((await api.delete<ApiEnvelope<AvatarDescriptor>>('/api/v1/me/avatar',{headers:{Prefer:'return=representation'}})).data.data);}
};
