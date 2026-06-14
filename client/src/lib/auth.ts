import {decodeJson, encodeJson} from './encoding';
import type {User} from '../types';

const USER_KEY = 'loggedUser';
const TOKEN_KEY = 'token';

export function getLoggedUser() {
  const user = localStorage.getItem(USER_KEY);
  return user ? decodeJson<User>(user) : null;
}

export function setLoggedUser(user: User) {
  localStorage.setItem(USER_KEY, encodeJson(user));
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function logout() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getLoggedUser() && getAuthToken());
}
