import { registerUser, loginUser, getUserById } from './auth.service.js';

export const register = async (req, res, next) => {
  try {
    const { username, email, password, displayName } = req.body;
    const { user, token } = await registerUser({ username, email, password, displayName });
    res.status(201).json({ user, token });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    const { user, token } = await loginUser({ identifier, password });
    res.status(200).json({ user, token });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const me = async (req, res, next) => {
  try {
    const user = await getUserById(req.user.id);
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};
