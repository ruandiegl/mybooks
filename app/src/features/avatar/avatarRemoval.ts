import type { AvatarDescriptor } from '../../types/api';
export async function runAvatarRemoval(isCurrent:()=>boolean,remove:()=>Promise<AvatarDescriptor>,committed:(receipt:AvatarDescriptor)=>void){
 if(!isCurrent())return;
 const receipt=await remove();
 if(isCurrent())committed(receipt);
}
