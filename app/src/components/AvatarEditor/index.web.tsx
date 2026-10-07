import { useEffect,useRef,useState } from 'react';
import { useWindowDimensions } from 'react-native';
import Cropper from 'react-easy-crop';
import { updateCropperTransform,cropperPixelRect } from '../../features/avatar/avatarCropperState';
import { getAvatarCropRect,reframeAvatarTransform,zoomAvatarAtPoint } from '../../features/avatar/avatarCrop';
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
 const pixels=getAvatarCropRect(source,diameter,t);
 const recordCrop=(_area:unknown,area:{x:number;y:number;width:number;height:number})=>{if(currentDiameter.current===diameter){rect.current=cropperPixelRect(source,area);setCropDiameter(diameter);}};
 return <AvatarEditorControls {...props} ready={ready} lowResolution={pixels.width<512}
  onSave={()=>{if(ready&&rect.current)props.onSave(rect.current);}}>
  <div ref={stage} style={{...webStyles.stage,width:diameter+32,height:diameter+32}} onContextMenu={event=>event.preventDefault()} onKeyDown={event=>{
   if(busy||event.ctrlKey||event.metaKey||event.altKey)return;
   const delta=event.key==='+'||event.key==='='?0.1:event.key==='-'||event.key==='_'?-0.1:0;
   if(!delta)return;
   event.preventDefault();setT(old=>zoomAvatarAtPoint(source,diameter,old,old.zoom+delta,{x:0,y:0}));
  }}>
   <Cropper key={diameter} image={source.uri} aspect={1} cropShape="round" cropSize={{width:diameter,height:diameter}}
    crop={{x:t.offsetX,y:t.offsetY}} zoom={t.zoom*baseZoom} minZoom={baseZoom} maxZoom={baseZoom*3}
    objectFit="contain" restrictPosition showGrid={false} keyboardStep={20}
    onMediaLoaded={()=>setLoadedDiameter(diameter)}
    onCropChange={position=>{if(!busy){const current=currentDiameter.current===diameter;setT(old=>updateCropperTransform(old,{offsetX:position.x,offsetY:position.y},current));}}}
    onZoomChange={z=>{if(!busy&&currentDiameter.current===diameter)setT(old=>updateCropperTransform(old,{zoom:z/baseZoom}));}}
    onCropComplete={recordCrop} onCropAreaChange={recordCrop}
    onTouchRequest={()=>!busy} onWheelRequest={()=>!busy} mediaProps={{draggable:false}}
    cropperProps={{tabIndex:busy?-1:0,role:'group','aria-label':'Prévia circular. Arraste e use dois dedos para ajustar. No teclado, use as setas para mover e mais ou menos para ampliar.'}}
    style={{cropAreaStyle:webStyles.cropArea,mediaStyle:webStyles.media,containerStyle:{opacity:loadedDiameter===diameter?1:0,pointerEvents:busy?'none':'auto'}}}/>
  </div>
 </AvatarEditorControls>;
}
