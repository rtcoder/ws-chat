export type User = {
  _id: string;
  first_name: string;
  last_name?: string;
  avatar?: string;
};

export type Message = {
  _id: string;
  text: string;
  images: string[];
  type: string;
  author: User;
  isOnlyEmoji?: boolean;
};

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
