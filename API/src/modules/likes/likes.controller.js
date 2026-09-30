import { likesService } from './likes.service.js';

export async function listReceivedLikes(req, res) {
  const result = await likesService.getReceivedLikes(req.currentUser.id, req.query);
  return res.status(200).json({ data: result });
}

export async function listSentLikes(req, res) {
  const result = await likesService.getSentLikes(req.currentUser.id, req.query);
  return res.status(200).json({ data: result });
}

export async function getReceivedLikesCount(req, res) {
  const result = await likesService.getReceivedLikesCount(req.currentUser.id);
  return res.status(200).json({ data: result });
}

export async function listBooksWithLikes(req, res) {
  const result = await likesService.getUserBooksWithLikes(req.currentUser.id);
  return res.status(200).json({ data: result });
}
