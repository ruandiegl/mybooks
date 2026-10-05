import express from 'express';
import request from 'supertest';
import { beforeEach,describe,expect,it,vi } from 'vitest';
const model=vi.hoisted(()=>({photo:'second-photo',grants:0}));
vi.mock('../src/modules/media/avatar.service.js',()=>({avatarService:{
 presign:async()=>{model.grants++;return {imageId:'grant'};},
 complete:async()=>{model.photo='first-photo';return {avatarUrl:'first-photo',avatarVersion:1};},
 delete:async()=>{model.photo='removed';return {avatarUrl:null,avatarVersion:2};}
}}));
const {usersRouter}=await import('../src/modules/users/users.routes.js');
const {errorHandler}=await import('../src/shared/http/errorHandler.js');
const app=express();app.use(express.json());app.use((req,_res,next)=>{req.currentUser={id:'second'};req.requestId='avatar-owner-test';next();});app.use('/api/v1',usersRouter);app.use(errorHandler);
describe('avatar commands expected account fence',()=>{
 beforeEach(()=>{model.photo='second-photo';model.grants=0;});
 it.each(['presign','complete','delete'])('rejects stale %s metadata before mutating the new account',async(action)=>{
  const call=action==='delete'?request(app).delete('/api/v1/me/avatar'):request(app).post('/api/v1/me/avatar/'+action);
  const res=await call.set('X-Avatar-Owner','first').send({imageId:'image'});
  expect(res.status).toBe(409);expect(res.body.error.code).toBe('AVATAR_SESSION_CHANGED');
  expect(model.photo).toBe('second-photo');expect(model.grants).toBe(0);
 });
 it('continues to accept the authenticated account assertion',async()=>{
  expect((await request(app).delete('/api/v1/me/avatar').set('X-Avatar-Owner','second')).status).toBe(204);
  expect(model.photo).toBe('removed');
 });
});
