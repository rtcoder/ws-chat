import {getAuthToken, setAuthToken, setLoggedUser} from './auth';
import {API_URL} from './config';
import {encodeJson} from './encoding';
import type {ApiResult, MediaUpload, Message, User} from '../types';

async function fetchApi<T>(input: RequestInfo | URL, init: RequestInit = {}): Promise<ApiResult<T>> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(input, {...init, headers});
  const result: ApiResult<T> = {
    error: null,
    data: null,
    status: response.status
  };

  if (response.status >= 400) {
    result.error = await response.json().catch(() => ({message: response.statusText}));
    return result;
  }

  result.data = await response.json().catch(() => null);
  return result;
}

export function getMessages() {
  return fetchApi<Message[]>(`${API_URL}/api/messages`, {
    headers: {
      'x-access-token': getAuthToken() || ''
    }
  });
}

export function postMessage(value: {text: string; media: MediaUpload[]; type: string}) {
  return fetchApi<void>(`${API_URL}/api/messages`, {
    method: 'POST',
    body: JSON.stringify({
      data: encodeJson({
        type: 'message_add',
        data: value
      })
    }),
    headers: {
      'x-access-token': getAuthToken() || ''
    }
  });
}

export async function login(payload: {email: string; password: string}) {
  const result = await fetchApi<User & {token?: string}>(`${API_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (result.data?.token) {
    const {token, ...user} = result.data;
    setAuthToken(token);
    setLoggedUser(user);
  }

  return result;
}

export function register(payload: {email: string; password: string; first_name: string; last_name: string}) {
  return fetchApi(`${API_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
