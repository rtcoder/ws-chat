declare module '*.css';

interface ImportMetaEnv {
  readonly VITE_API_PORT?: string;
  readonly VITE_WS_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
