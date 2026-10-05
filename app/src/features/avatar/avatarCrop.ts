import type { AvatarCropRect, AvatarTransform } from './avatarTypes';
type Dimensions = { width: number; height: number };
export function validateAvatarFile(mimeType: string | undefined | null, size: number) {
  if (!['image/jpeg','image/png','image/webp','image/heic','image/heif'].includes(mimeType ?? '')) throw new Error('Escolha uma foto JPEG, PNG, WebP ou HEIC compatível.');
  if (!Number.isInteger(size) || size <= 0 || size > 24 * 1024 * 1024) throw new Error('Escolha uma foto de até 24 MB.');
}
export function validateAvatarDimensions(width: number, height: number) {
  if (![width,height].every(Number.isFinite) || Math.min(width,height) < 128 || width * height > 40_000_000) throw new Error('Escolha uma imagem entre 128 pixels e 40 megapixels.');
}
const bounded = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
function scale(source: Dimensions, diameter: number, zoom: number) {
  if (diameter <= 0 || !Number.isFinite(diameter)) throw new Error('Aguarde o editor carregar.');
  if (![source.width,source.height].every(Number.isFinite) || Math.min(source.width,source.height) <= 0 || source.width*source.height > 40_000_000) throw new Error('A foto não pôde ser preparada.');
  return Math.max(diameter/source.width, diameter/source.height) * zoom;
}
export function clampAvatarTransform(source: Dimensions, diameter: number, transform: AvatarTransform): AvatarTransform {
  const zoom = bounded(Number.isFinite(transform.zoom) ? transform.zoom : 1,1,3), s = scale(source,diameter,zoom);
  const x = Math.max(0,(source.width*s-diameter)/2), y = Math.max(0,(source.height*s-diameter)/2);
  return { zoom, offsetX: bounded(Number.isFinite(transform.offsetX) ? transform.offsetX : 0,-x,x), offsetY: bounded(Number.isFinite(transform.offsetY) ? transform.offsetY : 0,-y,y) };
}
export function getAvatarCropRect(source: Dimensions, diameter: number, transform: AvatarTransform): AvatarCropRect {
  const t = clampAvatarTransform(source,diameter,transform), s = scale(source,diameter,t.zoom);
  const side = Math.max(1,Math.min(source.width,source.height,Math.floor(diameter/s)));
  return { originX: bounded(Math.round((source.width-side)/2-t.offsetX/s),0,source.width-side),
    originY: bounded(Math.round((source.height-side)/2-t.offsetY/s),0,source.height-side), width: side, height: side };
}
export function zoomAvatarAtPoint(source: Dimensions, diameter: number, transform: AvatarTransform, zoom: number, focal: {x:number;y:number}): AvatarTransform {
  const nextZoom = bounded(zoom,1,3), ratio = nextZoom/transform.zoom;
  return clampAvatarTransform(source,diameter,{ zoom:nextZoom, offsetX:focal.x-(focal.x-transform.offsetX)*ratio, offsetY:focal.y-(focal.y-transform.offsetY)*ratio });
}
export function reframeAvatarTransform(source: Dimensions, oldDiameter: number, nextDiameter: number, transform: AvatarTransform) {
  return clampAvatarTransform(source,nextDiameter,{...transform,offsetX:transform.offsetX*nextDiameter/oldDiameter,offsetY:transform.offsetY*nextDiameter/oldDiameter});
}
export function validateAvatarCropRect(source: Dimensions, rect: AvatarCropRect) {
  if (![rect.originX,rect.originY,rect.width,rect.height].every(Number.isInteger) || rect.width <= 0 || rect.width !== rect.height ||
    rect.originX < 0 || rect.originY < 0 || rect.originX+rect.width > source.width || rect.originY+rect.height > source.height) throw new Error('Ajuste novamente o enquadramento da foto.');
}
export function stepAvatarTransform(source: Dimensions, diameter: number, transform: AvatarTransform, direction:'left'|'right'|'up'|'down') {
  return clampAvatarTransform(source,diameter,{...transform,offsetX:transform.offsetX+(direction==='left'?-20:direction==='right'?20:0),offsetY:transform.offsetY+(direction==='up'?-20:direction==='down'?20:0)});
}
