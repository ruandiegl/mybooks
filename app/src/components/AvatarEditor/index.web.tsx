import { useEffect,useRef,useState } from 'react';
import { useWindowDimensions } from 'react-native';
import Cropper from 'react-easy-crop';
import { updateCropperTransform,cropperPixelRect } from '../../features/avatar/avatarCropperState';
import { clampAvatarTransform,getAvatarCropRect,reframeAvatarTransform,stepAvatarTransform,zoomAvatarAtPoint } from '../../features/avatar/avatarCrop';
import type { AvatarTransform,AvatarCropRect } from '../../features/avatar/avatarTypes';
import { AvatarEditorControls } from './AvatarEditorControls';
import type { AvatarEditorProps } from './AvatarEditor.types';
import { webStyles } from './styles.web';

export function AvatarEditor(props:AvatarEditorProps) {
 const {source,busy}=props,{width,height}=useWindowDimensions();
 const diameter=Math.max(128,Math.min(320,width-64,height-300));
 const [view,setView]=useState({diameter,transform:{zoom:1,offsetX:0,offsetY:0} as AvatarTransform});
 const [loadedDiameter,setLoadedDiameter]=useState<number>(),[cropDiameter,setCropDiameter]=useState<number>();
 const currentDiameter=useRef(diameter);currentDiameter.current=diameter;
 const stage=useRef<HTMLDivElement>(null),rect=useRef<AvatarCropRect|null>(null);
 const t=reframeAvatarTransform(source,view.diameter,diameter,view.transform);
 const setT=(update:(old:AvatarTransform)=>AvatarTransform)=>setView(old=>({diameter,transform:update(reframeAvatarTransform(source,old.diameter,diameter,old.transform))}));
 // Match the cropper's contain sizing up front. No old zoom/measurement frame on resize.
 const mediaScale=Math.min(1,(diameter+32)/source.width,(diameter+32)/source.height);
 const baseZoom=Math.max(diameter/(source.width*mediaScale),diameter/(source.height*mediaScale));
 const ready=loadedDiameter===diameter&&cropDiameter===diameter;
 useEffect(()=>{if(ready)stage.current?.querySelector<HTMLElement>('[tabindex]')?.focus();},[ready]);
 const change=(next:AvatarTransform)=>setT(()=>clampAvatarTransform(source,diameter,next));
 const pixels=getAvatarCropRect(source,diameter,t);
 return <AvatarEditorControls {...props} zoom={t.zoom} ready={ready} lowResolution={pixels.width<512}
  onMove={direction=>change(stepAvatarTransform(source,diameter,t,direction))}
  onZoom={z=>change(zoomAvatarAtPoint(source,diameter,t,z,{x:0,y:0}))}
  onCenter={()=>change({...t,offsetX:0,offsetY:0})}
  onSave={()=>{if(ready&&rect.current)props.onSave(rect.current);}}>
  <div ref={stage} style={{...webStyles.stage,width:diameter+32,height:diameter+32}}>
   <Cropper key={diameter} image={source.uri} aspect={1} cropShape="round" cropSize={{width:diameter,height:diameter}}
    crop={{x:t.offsetX,y:t.offsetY}} zoom={t.zoom*baseZoom} minZoom={baseZoom} maxZoom={baseZoom*3}
    objectFit="contain" restrictPosition showGrid={false} keyboardStep={20}
    onMediaLoaded={()=>setLoadedDiameter(diameter)}
    onCropChange={position=>{if(!busy){const current=currentDiameter.current===diameter;setT(old=>updateCropperTransform(old,{offsetX:position.x,offsetY:position.y},current));}}}
    onZoomChange={z=>{if(!busy&&currentDiameter.current===diameter)setT(old=>updateCropperTransform(old,{zoom:z/baseZoom}));}}
    onCropComplete={(_area,area)=>{if(currentDiameter.current===diameter){rect.current=cropperPixelRect(source,area);setCropDiameter(diameter);}}}
    cropperProps={{tabIndex:busy?-1:0,role:'group','aria-label':'Prévia circular. Use as setas do teclado para mover a foto.'}}
    style={{cropAreaStyle:webStyles.cropArea,containerStyle:{opacity:loadedDiameter===diameter?1:0,pointerEvents:busy?'none':'auto'}}}/>
  </div>
 </AvatarEditorControls>;
}
