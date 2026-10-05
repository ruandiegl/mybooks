import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/modules/media/avatar.service.js',()=>({avatarService:{delete:async()=>({avatarUrl:null,avatarUrlExpiresAt:null,avatarVersion:7})}}));
const { usersRouter }=await import('../src/modules/users/users.routes.js');
const app=express();
app.use((req,_res,next)=>{req.currentUser={id:'owner'};next();});
app.use('/api/v1',usersRouter);
describe('avatar deletion receipt compatibility',()=>{
 it('returns the committed version only when the new client requests it',async()=>{
  const res=await request(app).delete('/api/v1/me/avatar').set('Prefer','return=representation');
  expect(res.status).toBe(200);
  expect(res.body.data).toEqual({avatarUrl:null,avatarUrlExpiresAt:null,avatarVersion:7});
 });
 it('preserves the legacy empty 204 response',async()=>{
  const res=await request(app).delete('/api/v1/me/avatar');
  expect(res.status).toBe(204);expect(res.text).toBe('');
 });
});
