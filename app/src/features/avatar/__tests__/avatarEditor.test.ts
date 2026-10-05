import { describe,expect,it } from 'vitest';
import { updateCropperTransform,cropperPixelRect } from '../avatarCropperState';
describe('web cropper callback contract',()=>{
 it('retains paired zoom and position updates without stale render closures',()=>{
  const zoomed=updateCropperTransform({zoom:1,offsetX:0,offsetY:0},{zoom:2});
  expect(updateCropperTransform(zoomed,{offsetX:60,offsetY:-20})).toEqual({zoom:2,offsetX:60,offsetY:-20});
 });
 it('limits rounded export to source bounds and retains a pixel at extreme zoom',()=>{
  expect(cropperPixelRect({width:7,height:1000},{x:7,y:-20,width:.2,height:.2})).toEqual({originX:6,originY:0,width:1,height:1});
 });
 it('ignores cropper position callbacks measured before the viewport resize is applied',()=>{
  expect(updateCropperTransform({zoom:1.2,offsetX:16,offsetY:0},{offsetX:20},false)).toEqual({zoom:1.2,offsetX:16,offsetY:0});
 });
});
