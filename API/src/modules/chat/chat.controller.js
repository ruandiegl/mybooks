import { chatService } from './chat.service.js';

export async function listConversations(req, res) {
  const result = await chatService.listConversations(req.currentUser.id);
  return res.status(200).json({ data: result });
}

export async function listMessages(req, res) {
  const result = await chatService.listMessages(
    req.currentUser.id,
    req.params.conversationId,
    req.query
  );
  return res.status(200).json({ data: result });
}

export async function sendMessage(req, res) {
  const result = await chatService.sendMessage(
    req.currentUser.id,
    req.params.conversationId,
    req.body
  );
  return res.status(201).json({ data: result });
}

export async function markRead(req, res) {
  await chatService.markRead(req.currentUser.id, req.params.conversationId);
  return res.status(204).send();
}
