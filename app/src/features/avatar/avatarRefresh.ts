import type { User } from '../../types/api';
const expiryFields = new Set(['avatarUrlExpiresAt','coverUrlExpiresAt','expiresAt']);
export function getAvatarRefreshDelay(data:unknown,now=Date.now(),lastAttempt=0):number|false {
 const expirations:number[]=[],visited=new Set<object>();
 function visit(value:unknown){if(!value||typeof value!=='object'||visited.has(value))return;visited.add(value);
  for(const [key,item] of Object.entries(value)){if(expiryFields.has(key)&&typeof item==='string'){const time=Date.parse(item);if(Number.isFinite(time))expirations.push(time);}else if(item&&typeof item==='object')visit(item);}
 }
 visit(data);if(!expirations.length)return false;
 const remaining=Math.min(...expirations)-now;
 return Math.max(5000,lastAttempt+30000-now,remaining-Math.min(30000,Math.max(0,remaining)*.2));
}
export function mergeAvatarVersion<T extends Pick<User,'id'|'avatarVersion'|'avatarUrl'|'avatarUrlExpiresAt'>>(current:Pick<User,'id'|'avatarVersion'|'avatarUrl'|'avatarUrlExpiresAt'>|null|undefined,incoming:T):T {
 if(!current||current.id!==incoming.id||(current.avatarVersion??0)<=(incoming.avatarVersion??0))return incoming;
 return {...incoming,avatarUrl:current.avatarUrl,avatarUrlExpiresAt:current.avatarUrlExpiresAt,avatarVersion:current.avatarVersion};
}
