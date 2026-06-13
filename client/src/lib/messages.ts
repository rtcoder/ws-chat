import type {Message, MessageGroup, User} from '../types';

export const MESSAGE_TYPES = {
  MESSAGE: 'msg'
};

export function mapMessagesToGroups(messages: Message[]) {
  const groups: MessageGroup[] = [];

  messages.forEach((message) => {
    const currentGroup = groups[groups.length - 1];

    if (!currentGroup || currentGroup.author._id !== message.author._id) {
      groups.push({author: message.author, messages: [message]});
      return;
    }

    currentGroup.messages.push(message);
  });

  return groups;
}

export function belongsToUser(author: User, authId: string) {
  return author._id === authId;
}

export function replaceTextEmojis(value: string) {
  return value
    .replaceAll(';*', '😘')
    .replaceAll(':*', '😗')
    .replaceAll(':P', '😛')
    .replaceAll(':/', '😕')
    .replaceAll(';(', '😢')
    .replaceAll('-_-', '😑')
    .replaceAll(':O', '😮')
    .replaceAll(':D', '😀')
    .replaceAll(':)', '🙂')
    .replaceAll(':(', '😞')
    .replaceAll('(:', '🙃')
    .replaceAll(';)', '😉')
    .replaceAll('(y)', '👍')
    .replaceAll('(n)', '👎')
    .replaceAll('<3', '❤️')
    .replaceAll('</3', '💔');
}
