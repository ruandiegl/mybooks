// @vitest-environment jsdom
import React from 'react';
import { act,cleanup,fireEvent,render,screen } from '@testing-library/react';
import { afterEach,describe,expect,it,vi } from 'vitest';
const device=vi.hoisted(()=>({dimensions:{width:364,height:1000,scale:1,fontScale:1},gesture:undefined as any,accessibility:undefined as any}));
vi.mock('react-native',async()=>{
 const native=await import('react-native-web') as unknown as typeof import('react-native'),React=await import('react');
 // Native decoder and responder are device boundaries; crop/editor logic remains real.
 const Image=React.forwardRef<HTMLImageElement,any>((props,ref)=>{React.useEffect(()=>props.onLoad?.(),[props.source.uri]);return React.createElement('img',{ref,src:props.source.uri,alt:''});});
 const View=(props:any)=>{if(props.accessibilityLabel==='Enquadramento da foto de perfil')device.accessibility=props;return React.createElement(native.View,props);};
 return {...native,View,useWindowDimensions:()=>device.dimensions,Image,Animated:{...native.Animated,Image},PanResponder:{create:(handlers:any)=>{device.gesture=handlers;return {panHandlers:{}};}}};
});
vi.mock('@expo/vector-icons/MaterialIcons',()=>({default:()=>null}));
import { AvatarEditor } from '../../../components/AvatarEditor';
afterEach(()=>{cleanup();device.dimensions={width:364,height:1000,scale:1,fontScale:1};});
const source={uri:'https://synthetic.test/image.png',width:900,height:600,ownedResource:false};
const touch=(x:number,y:number)=>({locationX:x,locationY:y,pageX:x,pageY:y});
describe('mounted native crop gesture baseline',()=>{
 it('keeps the source area when the viewport resizes during a pinch',()=>{
  const saved:any[]=[];
  const props={source,busy:false,onSave:(rect:any)=>saved.push(rect),onCancel:()=>{},onChooseAnother:()=>{}};
  const mounted=render(<AvatarEditor {...props}/>);
  act(()=>device.gesture.onPanResponderGrant({nativeEvent:{touches:[touch(166,166)]}}));
  act(()=>device.gesture.onPanResponderMove({nativeEvent:{touches:[touch(186,166)]}}));
  fireEvent.click(screen.getByRole('button',{name:'Salvar foto'}));
  expect(saved[0]).toEqual({originX:110,originY:0,width:600,height:600});
  const event={nativeEvent:{touches:[touch(100,140),touch(180,140)]}};
  act(()=>device.gesture.onPanResponderGrant(event));
  device.dimensions={width:464,height:1000,scale:1,fontScale:1};
  mounted.rerender(<AvatarEditor {...props}/>);
  act(()=>device.gesture.onPanResponderMove(event));
  fireEvent.click(screen.getByRole('button',{name:'Salvar foto'}));
  expect(saved[1]).toEqual({originX:110,originY:0,width:600,height:600});
 });
 it('retains screen-reader crop actions without visual adjustment buttons',()=>{
  const saved:any[]=[];
  render(<AvatarEditor source={source} busy={false} onSave={rect=>saved.push(rect)} onCancel={()=>{}} onChooseAnother={()=>{}}/>);
  act(()=>device.accessibility.onAccessibilityAction?.({nativeEvent:{actionName:'increment'}}));
  act(()=>device.accessibility.onAccessibilityAction?.({nativeEvent:{actionName:'right'}}));
  fireEvent.click(screen.getByRole('button',{name:'Salvar foto'}));
  expect(saved).toEqual([{originX:141,originY:28,width:545,height:545}]);
 });
 it('saves the crop shown after a centered pinch and one-finger positioning',()=>{
  const saved:any[]=[];
  render(<AvatarEditor source={source} busy={false} onSave={rect=>saved.push(rect)} onCancel={()=>{}} onChooseAnother={()=>{}}/>);
  expect(screen.getAllByRole('button')).toHaveLength(2);
  act(()=>device.gesture.onPanResponderGrant({nativeEvent:{touches:[touch(126,166),touch(206,166)]}}));
  act(()=>device.gesture.onPanResponderMove({nativeEvent:{touches:[touch(86,166),touch(246,166)]}}));
  act(()=>device.gesture.onPanResponderMove({nativeEvent:{touches:[touch(166,166)]}}));
  act(()=>device.gesture.onPanResponderMove({nativeEvent:{touches:[touch(196,186)]}}));
  fireEvent.click(screen.getByRole('button',{name:'Salvar foto'}));
  expect(saved).toEqual([{originX:270,originY:130,width:300,height:300}]);
 });
});
