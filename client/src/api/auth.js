import {fetchApi} from "./fetch-api";

const apiUrl = 'http://localhost:8000/auth';

export const register = ({email, password, first_name, last_name}) => {
  return fetchApi(`${apiUrl}/register`, {
    method: 'POST',
    body: JSON.stringify({email, password, first_name, last_name})
  });
};
export const login = ({email, password}) => {
  return fetchApi(`${apiUrl}/login`, {
    method: 'POST',
    body: JSON.stringify({email, password})
  });
};
