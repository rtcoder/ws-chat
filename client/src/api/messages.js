import {fetchApi} from "./fetch-api";
import {getAuthToken} from "../utils/auth-helpers";

const apiUrl = 'http://localhost:8000/api/messages';

export const getMessages = () => {
  return fetchApi(apiUrl, {
    headers: {
      'x-access-token': getAuthToken()
    }
  });
};

export const postMessage = (data) => {
  return fetchApi(apiUrl, {
    method: 'POST',
    body: JSON.stringify({data}),
    headers: {
      'x-access-token': getAuthToken()
    }
  });
};

export const sendMessage = (value) => {
  return fetchApi(apiUrl, {
    method: 'POST',
    body: JSON.stringify({message: value}),
    headers: {
      'x-access-token': getAuthToken()
    }
  });
};
