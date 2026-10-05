// @vitest-environment jsdom
import React from 'react';
import { act,cleanup,fireEvent,render,screen } from '@testing-library/react';
import { afterEach,describe,expect,it,vi } from 'vitest';
const device=vi.hoisted(()=>({dimensions:{width:364,height:1000,scale:1,fontScale:1},gesture:undefined as any}));
vi.mock('react-native',async()=>{
 const native=await import('react-native-web') as unknown as typeof import('react-native'),React=await import('react');
 // Native decoder and responder are device boundaries; crop/editor logic remains real.
 const Image=React.forwardRef<HTMLImageElement,any>((props,ref)=>{React.useEffect(()=>props.onLoad?.(),[props.source.uri]);return React.createElement('img',{ref,src:props.source.uri,alt:''});});
 return {...native,useWindowDimensions:()=>device.dimensions,Image,Animated:{...native.Animated,Image},PanResponder:{create:(handlers:any)=>{device.gesture=handlers;return {panHandlers:{}};}}};
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
  fireEvent.click(screen.getByRole('button',{name:'Mover foto para a direita'}));
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
});
