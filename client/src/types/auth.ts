export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  bio?: string | null;
  karma: number;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}
