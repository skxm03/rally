import * as userService from './user.service.js';

export const getProfile = async (req, res, next) => {
  try {
    const { username } = req.params;
    const profile = await userService.getUserProfile(username);
    res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { displayName, bio } = req.body;
    const result = await userService.updateUserProfile(req.user.id, {
      displayName,
      bio,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
