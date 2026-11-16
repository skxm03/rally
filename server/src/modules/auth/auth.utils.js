import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'rally_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const formatUser = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.display_name,
    bio: row.bio,
    karma: row.karma,
    createdAt: row.created_at,
  };
};

export const hashPassword = async (password) => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const validateRegistrationInput = ({ username, email, password }) => {
  if (!username || !email || !password) {
    const error = new Error('Username, email, and password are required');
    error.status = 400;
    throw error;
  }

  const cleanUsername = username.trim();
  const cleanEmail = email.trim().toLowerCase();

  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  if (!usernameRegex.test(cleanUsername)) {
    const error = new Error('Username must be 3-30 alphanumeric characters or underscores');
    error.status = 400;
    throw error;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    const error = new Error('Invalid email address format');
    error.status = 400;
    throw error;
  }

  if (typeof password !== 'string' || password.length < 8) {
    const error = new Error('Password must be at least 8 characters long');
    error.status = 400;
    throw error;
  }

  return { cleanUsername, cleanEmail };
};
