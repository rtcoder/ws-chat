import {AttachmentCategory, MediaItem, MediaKind, Message, MessageGroup, User} from '../types';

export const MESSAGE_TYPES = {
  MESSAGE: 'msg',
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

export function isVideoPath(src: string) {
  const normalized = src.split('?')[0].toLowerCase();
  return normalized.startsWith('data:video/') || ['.mp4', '.webm', '.ogg', '.mov', '.m4v'].some((ext) => normalized.endsWith(ext));
}

export function isImagePath(src: string) {
  const normalized = src.split('?')[0].toLowerCase();
  return normalized.startsWith('data:image/') || ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.avif'].some((ext) => normalized.endsWith(ext));
}

export function getFileExtension(name = '') {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
}

export function getAttachmentCategory(media: Pick<MediaItem, 'kind' | 'name' | 'mimeType'> & {
  path?: string
}): AttachmentCategory {
  const extension = getFileExtension(media.name || media.path || '');
  const mimeType = (media.mimeType || '').toLowerCase();

  if (media.kind === MediaKind.IMAGE) {
    return AttachmentCategory.IMAGE;
  }

  if (media.kind === MediaKind.VIDEO) {
    return AttachmentCategory.VIDEO;
  }

  if (mimeType.includes('pdf') || extension === 'pdf') {
    return AttachmentCategory.PDF;
  }

  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension) || mimeType.includes('zip') || mimeType.includes('compressed')) {
    return AttachmentCategory.ARCHIVE;
  }

  if (['xls', 'xlsx', 'csv', 'ods'].includes(extension) || mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
    return AttachmentCategory.SHEET;
  }

  if (['doc', 'docx', 'odt', 'rtf'].includes(extension) || mimeType.includes('word') || mimeType.includes('document')) {
    return AttachmentCategory.DOCUMENT;
  }

  if (['txt', 'md', 'json', 'xml', 'yml', 'yaml', 'log'].includes(extension) || mimeType.startsWith('text/')) {
    return AttachmentCategory.TEXT;
  }

  return AttachmentCategory.FILE;
}

export function getAttachmentIcon(media: Pick<MediaItem, 'kind' | 'name' | 'mimeType'> & { path?: string }) {
  switch (getAttachmentCategory(media)) {
    case 'pdf':
      return 'picture_as_pdf';
    case 'archive':
      return 'folder_zip';
    case 'sheet':
      return 'table_chart';
    case 'document':
      return 'description';
    case 'text':
      return 'article';
    default:
      return 'draft';
  }
}

export function getMessageMedia(message: Message): MediaItem[] {
  if (Array.isArray(message.media) && message.media.length) {
    return message.media;
  }

  return (message.images || []).map((path): MediaItem => ({
    path,
    kind: isVideoPath(path) ? MediaKind.VIDEO : (isImagePath(path) ? MediaKind.IMAGE : MediaKind.FILE),
    name: path.split('/').pop() || null,
    poster: isVideoPath(path) ? null : path,
    mimeType: null,
  }));
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
