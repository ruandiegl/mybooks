import type { AvatarTransform,AvatarCropRect } from './avatarTypes';
export function updateCropperTransform(previous:AvatarTransform,change:Partial<AvatarTransform>,measurementCurrent=true):AvatarTransform {
 return measurementCurrent ? {...previous,...change} : previous;
}
export function cropperPixelRect(source:{width:number;height:number},area:{x:number;y:number;width:number;height:number}):AvatarCropRect {
 const side=Math.max(1,Math.min(source.width,source.height,Math.round(area.width),Math.round(area.height)));
 return {originX:Math.max(0,Math.min(source.width-side,Math.round(area.x))),originY:Math.max(0,Math.min(source.height-side,Math.round(area.y))),width:side,height:side};
}
