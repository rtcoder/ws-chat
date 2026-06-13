import {getAuthToken} from './auth';
import {WS_URL} from './config';
import {decodeJson} from './encoding';
import type {Message} from '../types';

export function connectMessagesSocket(onMessage: (message: Message) => void) {
  let socket: WebSocket | null = null;
  let reconnectTimer = 0;
  let closedByUser = false;

  const connect = () => {
    const token = getAuthToken();
    if (!token) {
      return;
    }

    socket = new WebSocket(`${WS_URL}?t=${token}`);

    socket.addEventListener('open', () => {
      console.info('WebSocket Client Connected');
    });

    socket.addEventListener('message', ({data}) => {
      if (typeof data !== 'string') {
        return;
      }

      onMessage(decodeJson<Message>(data));
    });

    socket.addEventListener('close', () => {
      console.info('Websocket Client Disconnected');
      if (!closedByUser) {
        reconnectTimer = window.setTimeout(connect, 3000);
      }
    });
  };

  connect();

  return () => {
    closedByUser = true;
    window.clearTimeout(reconnectTimer);
    socket?.close();
  };
}
