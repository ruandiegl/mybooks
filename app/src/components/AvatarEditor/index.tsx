import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, PanResponder, StyleSheet, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { clampAvatarTransform,getAvatarCropRect,reframeAvatarTransform,stepAvatarTransform,zoomAvatarAtPoint } from '../../features/avatar/avatarCrop';
import type { AvatarTransform } from '../../features/avatar/avatarTypes';
import { theme } from '../../styles/theme';
import { AvatarEditorControls } from './AvatarEditorControls';
import type { AvatarEditorProps } from './AvatarEditor.types';
import { styles } from './styles';

export function AvatarEditor(props:AvatarEditorProps) {
 const {source,busy,previewUri}=props;
 const {width,height}=useWindowDimensions();
 const diameter=Math.max(128,Math.min(320,width-64,height-300)),stageSize=diameter+32;
 const transform=useRef<AvatarTransform>({zoom:1,offsetX:0,offsetY:0});
 const [shown,setShown]=useState(transform.current),[ready,setReady]=useState(false),[failed,setFailed]=useState(false);
 const position=useRef(new Animated.ValueXY()).current,zoom=useRef(new Animated.Value(1)).current;
 const previousDiameter=useRef(diameter);
 const start=useRef<{count:number;point:{x:number;y:number};distance:number;transform:AvatarTransform}|null>(null);
 function update(next:AvatarTransform,announce=false) {
  const t=clampAvatarTransform(source,diameter,next);transform.current=t;position.setValue({x:t.offsetX,y:t.offsetY});zoom.setValue(t.zoom);
  if(announce)setShown(t);
 }
 useEffect(()=>{update(reframeAvatarTransform(source,previousDiameter.current,diameter,transform.current),true);previousDiameter.current=diameter;},[diameter,source]);
 const responder=useMemo(()=> {
  const sample=(event:GestureResponderEvent)=>{
   const touches=event.nativeEvent.touches;
   if(!touches.length)return null;
   const x=touches.length>1?(touches[0].locationX+touches[1].locationX)/2:touches[0].locationX;
   const y=touches.length>1?(touches[0].locationY+touches[1].locationY)/2:touches[0].locationY;
   return {count:touches.length>1?2:1,point:{x:x-stageSize/2,y:y-stageSize/2},distance:touches.length>1?Math.max(1,Math.hypot(touches[0].pageX-touches[1].pageX,touches[0].pageY-touches[1].pageY)):1};
  };
  const begin=(e:GestureResponderEvent)=>{const p=sample(e);start.current=p?{...p,transform:{...transform.current}}:null;};
  const end=()=>{start.current=null;setShown({...transform.current});};
  return PanResponder.create({
   onStartShouldSetPanResponder:()=>!busy,onMoveShouldSetPanResponder:()=>!busy,
   onPanResponderGrant:begin,onPanResponderMove:e=>{
    const p=sample(e),initial=start.current;if(!p||busy)return;
    if(!initial||p.count!==initial.count){begin(e);return;}
    const t=p.count===2?zoomAvatarAtPoint(source,diameter,initial.transform,initial.transform.zoom*p.distance/initial.distance,initial.point):initial.transform;
    update({...t,offsetX:t.offsetX+p.point.x-initial.point.x,offsetY:t.offsetY+p.point.y-initial.point.y});
   },onPanResponderRelease:end,onPanResponderTerminate:end,onPanResponderTerminationRequest:()=>false
  });
 },[source,diameter,busy]);
 const base=Math.max(diameter/source.width,diameter/source.height),w=source.width*base,h=source.height*base;
 const pictureStyle={position:'absolute' as const,width:w,height:h,transform:[{translateX:position.x},{translateY:position.y},{scale:zoom}]};
 const rect=getAvatarCropRect(source,diameter,shown);
 return <AvatarEditorControls {...props} zoom={shown.zoom} ready={ready&&!failed} lowResolution={rect.width<512}
  error={props.error||(failed?'Não foi possível abrir a prévia. Escolha outra foto.':undefined)}
  onMove={direction=>update(stepAvatarTransform(source,diameter,transform.current,direction),true)}
  onZoom={z=>update(zoomAvatarAtPoint(source,diameter,transform.current,z,{x:0,y:0}),true)}
  onCenter={()=>update({...transform.current,offsetX:0,offsetY:0},true)}
  onSave={()=>props.onSave(getAvatarCropRect(source,diameter,transform.current))}>
  <View style={[styles.stage,{width:stageSize,height:stageSize}]} pointerEvents="box-only" {...responder.panHandlers} accessible accessibilityRole="image" accessibilityLabel="Prévia circular da foto de perfil. Ajuste com os controles abaixo.">
   <Animated.Image source={{uri:source.uri}} style={[pictureStyle,{left:(stageSize-w)/2,top:(stageSize-h)/2}]} resizeMode="stretch" accessible={false}/>
   <View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:theme.colors.overlay}]}/>
   <View pointerEvents="none" style={[styles.circle,{width:diameter,height:diameter,borderRadius:diameter/2}]}>
    {busy&&previewUri?<Image source={{uri:previewUri}} style={{width:'100%',height:'100%'}} resizeMode="contain" accessible={false}/>:
    <Animated.Image source={{uri:source.uri}} style={[pictureStyle,{left:(diameter-w)/2,top:(diameter-h)/2}]} resizeMode="stretch" onLoad={()=>{setReady(true);setFailed(false);}} onError={()=>{setReady(false);setFailed(true);}} accessible={false}/>}
   </View>
   <View pointerEvents="none" style={[styles.ring,{width:diameter,height:diameter,borderRadius:diameter/2}]}/>
  </View>
 </AvatarEditorControls>;
}
