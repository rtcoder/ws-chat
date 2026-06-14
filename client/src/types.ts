export type User = {
  _id: string;
  first_name: string;
  last_name?: string;
  avatar?: string;
};

export enum MediaKind {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file',
}

export enum AttachmentCategory {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  PDF = 'pdf',
  ARCHIVE = 'archive',
  SHEET = 'sheet',
  DOCUMENT = 'document',
  TEXT = 'text',
  FILE = 'file',
}

export type MediaItem = {
  path: string;
  kind: MediaKind;
  name?: string | null;
  poster?: string | null;
  mimeType?: string | null;
  waveform?: number[] | null;
  duration?: number | null;
};

export type MediaUpload = {
  file: string;
  kind: MediaKind;
  name: string;
  poster?: string | null;
  mimeType?: string | null;
  waveform?: number[] | null;
  duration?: number | null;
};
export type SendMsgValue = {text: string; media: MediaUpload[]; type: string; replyTo?: string | null};
export type SendMessage = (value: SendMsgValue) => void;
export type Message = {
  _id: string;
  text: string;
  media?: MediaItem[];
  images: string[];
  type: string;
  author: User;
  isOnlyEmoji?: boolean;
  replyTo?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type MessageDelete = {
  type: 'message_delete';
  data: {
    messageId: string;
  };
};

export type SocketPayload =
  | Message
  | MessageDelete;

export type MessageGroup = {
  author: User;
  messages: Message[];
};

export type ApiResult<T> = {
  data: T | null;
  error: any;
  status: number;
};

export type EmojiItem = {
  character: string;
  unicodeName: string;
  group: string;
  subGroup: string;
};

export type EmojiGroup = {
  name: string;
  subgroups: Array<{
    name: string;
    emojis: Array<Pick<EmojiItem, 'character' | 'unicodeName'>>;
  }>;
};

export type Unsubscribe = () => void;

export type CreateElementAttrs<K extends keyof HTMLElementTagNameMap> = Partial<HTMLElementTagNameMap[K]> & {
  className?: string;
  text?: string;
  attrs?: Record<string, string>;
  on?: Partial<Record<keyof HTMLElementEventMap, EventListener>>;
};

export type CreateElementChildren = Array<Node | string | null | undefined>;
