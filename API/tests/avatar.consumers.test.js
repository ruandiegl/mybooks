import { beforeEach,describe,expect,it,vi } from 'vitest';
const mocks=vi.hoisted(()=>({sign:vi.fn(),user:vi.fn(),received:vi.fn(),sent:vi.fn(),matches:vi.fn(),conversations:vi.fn(),messages:vi.fn()}));
vi.mock('../src/modules/media/storage.service.js',()=>({storageService:{getPresignedGetUrl:mocks.sign}}));
vi.mock('../src/modules/users/users.repository.js',()=>({usersRepository:{findByIdWithStats:mocks.user}}));
vi.mock('../src/modules/likes/likes.repository.js',()=>({likesRepository:{findReceivedLikes:mocks.received,findSentLikes:mocks.sent}}));
vi.mock('../src/modules/premium/premium.service.js',async(importOriginal)=>{
 const actual=await importOriginal();
 return {...actual,premiumService:{...actual.premiumService,hasActiveTrial:async()=>true}};
});
vi.mock('../src/modules/matches/matches.repository.js',()=>({matchesRepository:{listForUser:mocks.matches}}));
vi.mock('../src/modules/chat/chat.repository.js',()=>({chatRepository:{listConversations:mocks.conversations,listMessages:mocks.messages,findMembership:async()=>({userId:'self'})}}));
const {serializeBook}=await import('../src/modules/books/books.serializer.js');
const {usersService}=await import('../src/modules/users/users.service.js');
const {likesService}=await import('../src/modules/likes/likes.service.js');
const {matchesService}=await import('../src/modules/matches/matches.service.js');
const {chatService}=await import('../src/modules/chat/chat.service.js');
const person={id:'10000000-0000-4000-8000-000000000001',name:'Leitora',city:'SP',email:'private@example.test',phone:'private-phone',passwordHash:'private-hash',avatarUrl:null,avatarStorageKey:'avatars/10000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000001.jpg',avatarVersion:3,interests:[]};
const descriptor={avatarUrl:'https://r2.example/signed-avatar',avatarUrlExpiresAt:'2026-10-05T15:05:00.000Z',avatarVersion:3};
function publicAvatar(user){expect(user).toMatchObject(descriptor);for(const field of ['avatarStorageKey','passwordHash','email','phone'])expect(user).not.toHaveProperty(field);}
describe('avatar descriptor consumers and data allowlists',()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.sign.mockResolvedValue({url:descriptor.avatarUrl,expiresAt:descriptor.avatarUrlExpiresAt});});
 it('projects a book owner with renewable avatar and no internal fields',async()=>{
  const book=await serializeBook({id:'book',title:'Livro',authors:[],images:[],owner:person});publicAvatar(book.owner);
 });
 it('includes signed metadata in own profile while keeping credential fields private',async()=>{
  mocks.user.mockResolvedValue({...person,stats:{bookCount:1,matchCount:0,conversationCount:0}});
  const profile=await usersService.getMe(person.id);
  expect(profile).toMatchObject({...descriptor,email:person.email});
  expect(profile).not.toHaveProperty('avatarStorageKey');expect(profile).not.toHaveProperty('passwordHash');
 });
 it('projects both received and sent likes instead of returning raw relations',async()=>{
  mocks.received.mockResolvedValue([{id:'like',actor:{...person,books:[]},targetBook:{id:'book',title:'Livro',images:[]},createdAt:new Date()}]);
  mocks.sent.mockResolvedValue([{id:'like',targetBook:{id:'book',title:'Livro',images:[],owner:person},createdAt:new Date()}]);
  publicAvatar((await likesService.getReceivedLikes('self',{})).items[0].actor);
  publicAvatar((await likesService.getSentLikes('self',{})).items[0].owner);
 });
 it('projects matches and conversation peers using the same descriptor',async()=>{
  const match={id:'match',userAId:'self',userA:{id:'self',name:'Self'},userB:person};
  mocks.matches.mockResolvedValue([match]);mocks.conversations.mockResolvedValue([{id:'conversation',matchId:'match',match,messages:[]}]);
  publicAvatar((await matchesService.list('self'))[0].otherUser);publicAvatar((await chatService.listConversations('self'))[0].otherUser);
 });
 it('projects senders in message history without returning private user fields',async()=>{
  mocks.messages.mockResolvedValue([{id:'message',body:'Olá',sender:person,senderId:person.id,conversationId:'20000000-0000-4000-8000-000000000001'}]);
  publicAvatar((await chatService.listMessages('self','20000000-0000-4000-8000-000000000001',{})).items[0].sender);
 });
 it('does not turn unavailable image signing into an identity failure',async()=>{
  mocks.user.mockResolvedValue(person);mocks.sign.mockRejectedValue(new Error('unavailable'));
  expect(await usersService.getMe(person.id)).toMatchObject({id:person.id,avatarUrl:null,avatarVersion:3});
 });
});
