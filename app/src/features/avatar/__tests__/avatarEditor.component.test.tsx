// @vitest-environment jsdom
import React from 'react';
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
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
 it('saves a button movement without requiring zoom or gesture-end',async()=>{
  let saved:unknown;
  render(<AvatarEditor source={{uri:'https://synthetic.test/image.png',width:900,height:600,ownedResource:false}} busy={false} onSave={rect=>{saved=rect;}} onCancel={()=>{}} onChooseAnother={()=>{}}/>);
  const save=screen.getByRole('button',{name:'Salvar foto'});
  await waitFor(()=>expect(save.getAttribute('aria-disabled')).not.toBe('true'));
  fireEvent.click(screen.getByRole('button',{name:'Mover foto para a direita'}));
  fireEvent.click(save);
  expect(saved).toEqual({originX:110,originY:0,width:600,height:600});
 });
 it('saves centralization rather than the last completed drag',async()=>{
  let saved:unknown;
  render(<AvatarEditor source={{uri:'https://synthetic.test/image.png',width:900,height:600,ownedResource:false}} busy={false} onSave={rect=>{saved=rect;}} onCancel={()=>{}} onChooseAnother={()=>{}}/>);
  const save=screen.getByRole('button',{name:'Salvar foto'});
  await waitFor(()=>expect(save.getAttribute('aria-disabled')).not.toBe('true'));
  // A keyboard release emits a completed crop in the real installed cropper.
  fireEvent.keyDown(screen.getByRole('group'),{key:'ArrowRight'});
  fireEvent.keyUp(screen.getByRole('group'),{key:'ArrowRight'});
  fireEvent.click(screen.getByRole('button',{name:'Centralizar'}));
  fireEvent.click(save);
  expect(saved).toEqual({originX:150,originY:0,width:600,height:600});
 });
});
