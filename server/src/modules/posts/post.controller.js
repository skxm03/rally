import * as postService from './post.service.js';

export const createPost = async (req, res, next) => {
  try {
    const { communityId, title, content, imageUrl } = req.body;
    const result = await postService.createPost({
      communityId,
      authorId: req.user.id,
      title,
      content,
      imageUrl,
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await postService.getPostById(id, req.user?.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const result = await postService.updatePost(id, req.user.id, { title, content });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await postService.deletePost(id, req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const votePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { voteValue } = req.body;
    const result = await postService.votePost(id, req.user.id, voteValue);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
