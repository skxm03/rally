import * as authRepo from './auth.repository.js';
import {
  formatUser,
  hashPassword,
  comparePassword,
  generateToken,
  validateRegistrationInput,
} from './auth.utils.js';

export const registerUser = async ({ username, email, password, displayName }) => {
  const { cleanUsername, cleanEmail } = validateRegistrationInput({ username, email, password });

  const existingUser = await authRepo.findUserByUsernameOrEmail(cleanUsername, cleanEmail);
  if (existingUser) {
    const isUsernameTaken = existingUser.username.toLowerCase() === cleanUsername.toLowerCase();
    const message = isUsernameTaken
      ? 'Username is already taken'
      : 'Email is already registered';
    const error = new Error(message);
    error.status = 409;
    throw error;
  }

  const passwordHash = await hashPassword(password);
  const cleanDisplayName = displayName?.trim() || cleanUsername;

  const row = await authRepo.createUser({
    username: cleanUsername,
    email: cleanEmail,
    passwordHash,
    displayName: cleanDisplayName,
  });

  const user = formatUser(row);
  const token = generateToken(user);

  return { user, token };
};

export const loginUser = async ({ identifier, password }) => {
  if (!identifier || !password) {
    const error = new Error('Identifier and password are required');
    error.status = 400;
    throw error;
  }

  const cleanIdentifier = identifier.trim();
  const userRow = await authRepo.findUserByIdentifier(cleanIdentifier);

  if (!userRow) {
    const error = new Error('Invalid email/username or password');
    error.status = 401;
    throw error;
  }

  const isMatch = await comparePassword(password, userRow.password_hash);
  if (!isMatch) {
    const error = new Error('Invalid email/username or password');
    error.status = 401;
    throw error;
  }

  const user = formatUser(userRow);
  const token = generateToken(user);

  return { user, token };
};

export const getUserById = async (id) => {
  const userRow = await authRepo.findUserById(id);
  if (!userRow) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  return formatUser(userRow);
};
