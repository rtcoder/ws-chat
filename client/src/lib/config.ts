const apiPort = import.meta.env.VITE_API_PORT || '4001';
const wsPort = import.meta.env.VITE_WS_PORT || '8001';

export const API_URL = `http://localhost:${apiPort}`;
export const WS_URL = `ws://127.0.0.1:${wsPort}`;
