// @vitest-environment jsdom
import React from 'react';
import { act,cleanup,createEvent,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,beforeAll,describe,expect,it,vi } from 'vitest';
vi.mock('react-native',async()=>({...await import('react-native-web'),useWindowDimensions:()=>({width:364,height:1000,scale:1,fontScale:1})}));
vi.mock('@expo/vector-icons/MaterialIcons',()=>({default:()=>null}));
import { AvatarEditor } from '../../../components/AvatarEditor/index.web';
beforeAll(()=>{
 Object.defineProperties(HTMLImageElement.prototype,{naturalWidth:{configurable:true,get:()=>900},naturalHeight:{configurable:true,get:()=>600},offsetWidth:{configurable:true,get:()=>332},offsetHeight:{configurable:true,get:()=>332*2/3},complete:{configurable:true,get:()=>true}});
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){const width=parseFloat(this.style.width)||332,height=parseFloat(this.style.height)||332;return {x:0,y:0,top:0,left:0,width,height,bottom:height,right:width,toJSON:()=>({})};});
});
afterEach(()=>cleanup());
describe('mounted Web editor saves the visible area',()=>{
 it('preserves browser zoom shortcuts while the crop area is focused',async()=>{
  let saved:unknown;
  render(<AvatarEditor source={{uri:'https://synthetic.test/image.png',width:900,height:600,ownedResource:false}} busy={false} onSave={rect=>{saved=rect;}} onCancel={()=>{}} onChooseAnother={()=>{}}/>);
  const save=screen.getByRole('button',{name:'Salvar foto'}),area=screen.getByRole('group');
  await waitFor(()=>expect(save.getAttribute('aria-disabled')).not.toBe('true'));
  for(const modifiers of [{ctrlKey:true},{metaKey:true},{altKey:true}]){
   const shortcut=createEvent.keyDown(area,{key:'+',...modifiers});
   fireEvent(area,shortcut);
   expect(shortcut.defaultPrevented).toBe(false);
  }
  fireEvent.click(save);
  expect(saved).toEqual({originX:150,originY:0,width:600,height:600});
 });
 it('retains keyboard positioning without visible adjustment buttons',async()=>{
  let saved:unknown;
  render(<AvatarEditor source={{uri:'https://synthetic.test/image.png',width:900,height:600,ownedResource:false}} busy={false} onSave={rect=>{saved=rect;}} onCancel={()=>{}} onChooseAnother={()=>{}}/>);
  const save=screen.getByRole('button',{name:'Salvar foto'});
  await waitFor(()=>expect(save.getAttribute('aria-disabled')).not.toBe('true'));
  expect(screen.getAllByRole('button')).toHaveLength(2);
  fireEvent.keyDown(screen.getByRole('group'),{key:'ArrowRight'});
  fireEvent.click(save);
  expect(saved).toEqual({originX:110,originY:0,width:600,height:600});
 });
 it('offers keyboard zoom without adding visible zoom buttons',async()=>{
  let saved:unknown;
  render(<AvatarEditor source={{uri:'https://synthetic.test/image.png',width:900,height:600,ownedResource:false}} busy={false} onSave={rect=>{saved=rect;}} onCancel={()=>{}} onChooseAnother={()=>{}}/>);
  const save=screen.getByRole('button',{name:'Salvar foto'});
  await waitFor(()=>expect(save.getAttribute('aria-disabled')).not.toBe('true'));
  fireEvent.keyDown(screen.getByRole('group'),{key:'+'});
  fireEvent.click(save);
  expect(saved).toEqual({originX:177,originY:27,width:545,height:545});
 });
 it('saves the visible area after touch pinch and drag in the real cropper',async()=>{
  let saved:unknown;
  render(<AvatarEditor source={{uri:'https://synthetic.test/image.png',width:900,height:600,ownedResource:false}} busy={false} onSave={rect=>{saved=rect;}} onCancel={()=>{}} onChooseAnother={()=>{}}/>);
  const save=screen.getByRole('button',{name:'Salvar foto'}),area=screen.getByRole('group');
  await waitFor(()=>expect(save.getAttribute('aria-disabled')).not.toBe('true'));
  const touch=(x:number,y:number,identifier=1)=>({identifier,clientX:x,clientY:y,pageX:x,pageY:y,screenX:x,screenY:y,force:1,radiusX:1,radiusY:1,rotationAngle:0,target:area});
  const start=(touches:any[])=>fireEvent.touchStart(area,{touches,targetTouches:touches,changedTouches:touches});
  const move=(touches:any[])=>fireEvent.touchMove(document,{touches,targetTouches:touches,changedTouches:touches});
  const end=(changedTouches:any[])=>fireEvent.touchEnd(document,{touches:[],targetTouches:[],changedTouches});
  const frame=()=>new Promise<void>(resolve=>window.requestAnimationFrame(()=>resolve()));
  start([touch(126,166),touch(206,166,2)]);
  await act(async()=>{move([touch(86,166),touch(246,166,2)]);await frame();});
  end([touch(86,166),touch(246,166,2)]);
  start([touch(166,166)]);
  await act(async()=>{move([touch(196,186)]);await frame();});
  end([touch(196,186)]);
  fireEvent.click(save);
  expect(saved).toEqual({originX:270,originY:130,width:300,height:300});
 });
});
