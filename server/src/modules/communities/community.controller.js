import * as commService from './community.service.js';

export const createCommunity = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const result = await commService.createCommunity({
      name,
      description,
      createdBy: req.user.id,
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getCommunities = async (req, res, next) => {
  try {
    const currentUserId = req.user?.id || null;
    const result = await commService.getCommunities(currentUserId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getCommunityByName = async (req, res, next) => {
  try {
    const { name } = req.params;
    const currentUserId = req.user?.id || null;
    const result = await commService.getCommunityByName(name, currentUserId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const joinCommunity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await commService.joinCommunity(parseInt(id, 10), req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const leaveCommunity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await commService.leaveCommunity(parseInt(id, 10), req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
