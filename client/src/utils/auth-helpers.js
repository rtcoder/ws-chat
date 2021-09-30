export const getLoggedUser = () => {
  const user = localStorage.getItem('loggedUser');
  return user ?
    JSON.parse(decodeURIComponent(escape(window.atob(user))))
    : null;
};

export const setLoggedUser = user => {
  const value = window.btoa(unescape(encodeURIComponent(JSON.stringify(user))));
  localStorage.setItem('loggedUser', value);
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const setAuthToken = (token) => {
  localStorage.setItem('token', token);
};
