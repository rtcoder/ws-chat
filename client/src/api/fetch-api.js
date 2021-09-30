/**
 * @param input {RequestInfo}
 * @param [init] {RequestInit}
 */
export const fetchApi = (input, init) => {
  init = init || {};
  if (init.headers) {
    init.headers['Content-Type'] = 'application/json';
  } else {
    Object.assign(init, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  return fetch(input, init)
    .then(async res => {
      /**
       * @type {{data: any, error: any, status: number}}
       */
      const data = {
        error: null,
        data: null,
        status: res.status
      };
      if (res.status >= 400) {
        data.error = await res.json();
      } else {
        data.data = await res.json()
          .catch(() => res.text()
            .catch(() => null)
          );
      }
      return data;
    });
};

export function upload(file, listeners = {
  onError: (evt) => {
  },
  onAbort: (evt) => {
  },
  onLoad: (evt) => {
  },
  onProgress: (evt) => {
  }
}) {
  const onError = listeners.onError ? listeners.onError : (evt) => {
  };
  const onAbort = listeners.onAbort ? listeners.onAbort : (evt) => {
  };
  const onLoad = listeners.onLoad ? listeners.onLoad : (evt) => {
  };
  const onProgress = listeners.onProgress ? listeners.onProgress : (evt) => {
  };
  const xhr = new XMLHttpRequest();
  // const token = document.querySelector('meta[name="api-token"]').getAttribute('content');

  xhr.open('POST', '/api/media/', true);
  // xhr.setRequestHeader('Authorization', 'Bearer ' + token)
  xhr.setRequestHeader('Accept', 'application/json');
  xhr.responseType = 'json';

  xhr.addEventListener('error', onError);
  xhr.addEventListener('abort', onAbort);
  xhr.addEventListener('load', onLoad);

  if (xhr.upload) {
    xhr.upload.addEventListener('progress', onProgress);
  }

  const data = new FormData();
  data.append('file', file);
  xhr.send(data);

  return xhr;
}
