import * as commentService from './comment.service.js';

export const createComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { parentCommentId, content } = req.body;
    const result = await commentService.createComment({
      postId,
      authorId: req.user.id,
      parentCommentId,
      content,
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getComments = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const result = await commentService.getCommentsTree(postId, req.user?.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const result = await commentService.updateComment(id, req.user.id, { content });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await commentService.deleteComment(id, req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const voteComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { voteValue } = req.body;
    const result = await commentService.voteComment(id, req.user.id, voteValue);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
