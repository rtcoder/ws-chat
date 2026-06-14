import {deleteMessage, getMessages, postMessage} from '../lib/api';
import {getLoggedUser} from '../lib/auth';
import {getMessageMedia} from '../lib/messages';
import {connectMessagesSocket} from '../lib/websocket';
import {createElement, icon, image, render, resolveMediaSrc, video} from '../lib/dom';
import {createStore} from '../lib/store';
import type {MediaItem, Message} from '../types';
import {MessageList} from './MessageList';
import {MessageComposer} from './MessageComposer';

function isDeleteSocketPayload(payload: unknown): payload is {type: 'message_delete'; data: {messageId: string}} {
  return typeof payload === 'object'
    && payload !== null
    && 'type' in payload
    && payload.type === 'message_delete'
    && 'data' in payload
    && typeof payload.data === 'object'
    && payload.data !== null
    && 'messageId' in payload.data;
}

function getUniqueContacts(messages: Message[], authId: string) {
  const contacts = new Map();

  messages.forEach((message) => {
    if (message.author._id !== authId) {
      contacts.set(message.author._id, message.author);
    }
  });

  return [...contacts.values()];
}

function formatMessagePreview(message?: Message) {
  if (!message) {
    return 'No messages yet';
  }

  const mediaItems = getMessageMedia(message);

  if (mediaItems.length && !message.text) {
    return `${mediaItems.length} media item${mediaItems.length > 1 ? 's' : ''}`;
  }

  return message.text || 'New activity';
}

function formatDateLabel(value?: string) {
  if (!value) {
    return 'Just now';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function initials(name = 'WS') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function SidebarContact(name: string, status: string, active = false) {
  return createElement('button', {
    className: `conversation-item ${active ? 'active' : ''}`.trim(),
    type: 'button'
  }, [
    createElement('span', {className: 'avatar-shell', text: initials(name)}),
    createElement('span', {className: 'conversation-copy'}, [
      createElement('span', {className: 'conversation-title', text: name}),
      createElement('span', {className: 'conversation-preview', text: status})
    ])
  ]);
}

function Sidebar(messages: Message[], authId: string) {
  const contacts = getUniqueContacts(messages, authId);
  const lastMessage = messages[messages.length - 1];

  return createElement('aside', {className: 'app-sidebar'}, [
    createElement('div', {className: 'brand-row'}, [
      createElement('div', {className: 'brand-mark', text: 'W'}),
      createElement('div', {}, [
        createElement('div', {className: 'brand-name', text: 'WS Chat'}),
        createElement('div', {className: 'brand-subtitle', text: 'Realtime workspace'})
      ])
    ]),
    createElement('div', {className: 'sidebar-search'}, [
      createElement('span', {className: 'material-icons icon', text: 'search'}),
      createElement('input', {
        placeholder: 'Search conversations',
        attrs: {'aria-label': 'Search conversations'}
      })
    ]),
    createElement('div', {className: 'sidebar-section'}, [
      createElement('div', {className: 'section-label', text: 'Conversations'}),
      SidebarContact('General room', formatMessagePreview(lastMessage), true),
      SidebarContact('Design notes', 'Shared colors and visual ideas'),
      SidebarContact('Project pulse', 'Daily product check-ins')
    ]),
    createElement('div', {className: 'sidebar-section contacts-section'}, [
      createElement('div', {className: 'section-label', text: 'Contacts'}),
      ...(contacts.length
        ? contacts.map((contact) => SidebarContact(contact.first_name, 'Available'))
        : [
          SidebarContact('No contacts yet', 'Messages will create contacts')
        ])
    ])
  ]);
}

function getMediaEntries(messages: Message[]) {
  return messages
    .flatMap((message) => getMessageMedia(message)
      .filter((media) => media.kind === 'image' || media.kind === 'video')
      .map((media, index) => ({
      id: `${message._id}-${index}`,
      src: media.path,
      thumb: media.kind === 'video' ? media.poster || media.path : media.path,
      kind: media.kind,
      name: media.name || media.path.split('/').pop() || 'Media',
      author: message.author.first_name,
      createdAt: message.createdAt,
      caption: message.text,
    })))
    .sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });
}

function ChatHeader(
  messages: Message[],
  userName: string,
  mediaCount: number,
  onOpenMedia: () => void
) {
  return createElement('header', {className: 'chat-header'}, [
    createElement('div', {className: 'chat-heading'}, [
      createElement('div', {className: 'room-avatar', text: 'G'}),
      createElement('div', {}, [
        createElement('h1', {text: 'General room'}),
        createElement('p', {text: `${messages.length} messages · signed in as ${userName}`})
      ])
    ]),
    createElement('div', {className: 'chat-actions'}, [
      createElement('button', {
        type: 'button',
        title: 'Open media gallery',
        className: 'chat-action media-trigger',
        on: {
          click: () => onOpenMedia()
        }
      }, [
        icon('photo_library'),
        createElement('span', {className: 'action-label', text: `Media ${mediaCount}`})
      ]),
      createElement('button', {type: 'button', title: 'Search'}, [
        createElement('span', {className: 'material-icons icon', text: 'search'})
      ]),
      createElement('button', {type: 'button', title: 'Conversation settings'}, [
        createElement('span', {className: 'material-icons icon', text: 'tune'})
      ])
    ])
  ]);
}

function ChatDetails(messages: Message[], authId: string) {
  const contacts = getUniqueContacts(messages, authId);

  return createElement('aside', {className: 'chat-details'}, [
    createElement('div', {className: 'details-card room-card'}, [
      createElement('div', {className: 'room-avatar large', text: 'G'}),
      createElement('h2', {text: 'General room'}),
      createElement('p', {text: 'A quiet place for websocket chatter, media drops, and tiny reactions.'})
    ]),
    createElement('div', {className: 'details-card'}, [
      createElement('div', {className: 'section-label', text: 'In this room'}),
      createElement('div', {className: 'stats-grid'}, [
        createElement('div', {}, [
          createElement('strong', {text: String(messages.length)}),
          createElement('span', {text: 'Messages'})
        ]),
        createElement('div', {}, [
          createElement('strong', {text: String(Math.max(contacts.length + 1, 1))}),
          createElement('span', {text: 'People'})
        ])
      ])
    ])
  ]);
}

function MediaGalleryModal(
  messages: Message[],
  open: boolean,
  onClose: () => void
) {
  if (!open) {
    return createElement('div');
  }

  const mediaEntries = getMediaEntries(messages);

  return createElement('div', {
    className: 'media-modal-backdrop',
    on: {
      click: (event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }
    }
  }, [
    createElement('div', {
      className: 'media-modal',
      attrs: {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Shared media gallery'
      }
    }, [
      createElement('div', {className: 'media-modal-header'}, [
        createElement('div', {}, [
          createElement('div', {className: 'section-label', text: 'Shared media'}),
          createElement('h2', {text: 'Gallery'})
        ]),
        createElement('button', {
          type: 'button',
          className: 'media-modal-close',
          title: 'Close gallery',
          on: {
            click: () => onClose()
          }
        }, [icon('close')])
      ]),
      createElement('div', {className: 'media-modal-body'}, mediaEntries.length
        ? mediaEntries.map((entry) => createElement('article', {className: 'media-item', attrs: {'data-id': entry.id}}, [
          createElement('div', {className: 'media-thumb'}, [
            image(entry.thumb, 'media-image', `${entry.author} media`),
            ...(entry.kind === 'video'
              ? [createElement('span', {className: 'material-icons media-thumb-icon', text: 'play_circle'})]
              : [])
          ]),
          createElement('div', {className: 'media-meta'}, [
            createElement('span', {className: 'media-author', text: entry.author}),
            createElement('span', {className: 'media-date', text: formatDateLabel(entry.createdAt)}),
            createElement('span', {className: 'media-caption', text: entry.caption || entry.name})
          ])
        ]))
        : [
          createElement('div', {className: 'empty-media'}, [
            icon('image'),
            createElement('span', {text: 'No media shared yet'})
          ])
        ])
    ])
  ]);
}

function MediaPreviewModal(
  media: MediaItem | null,
  onClose: () => void
) {
  if (!media) {
    return createElement('div');
  }

  const normalizedSrc = resolveMediaSrc(media.path);

  if (media.kind === 'file') {
    window.open(normalizedSrc, '_blank', 'noopener,noreferrer');
    queueMicrotask(onClose);
    return createElement('div');
  }

  return createElement('div', {
    className: 'media-preview-backdrop',
    on: {
      click: (event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }
    }
  }, [
    createElement('div', {
      className: 'media-preview-modal',
      attrs: {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Media preview'
      }
    }, [
      createElement('button', {
        type: 'button',
        className: 'media-preview-close',
        title: 'Close preview',
        on: {
          click: () => onClose()
        }
      }, [icon('close')]),
      media.kind === 'video'
        ? video(normalizedSrc, 'media-preview-asset', true)
        : image(normalizedSrc, 'media-preview-asset', 'Message attachment preview')
    ])
  ]);
}

export function ChatView() {
  const user = getLoggedUser();
  const messages = createStore<Message[]>([]);
  const mediaGalleryOpen = createStore(false);
  const previewMedia = createStore<MediaItem | null>(null);

  const sidebarSlot = createElement('div');
  const headerSlot = createElement('div');
  const messagesSlot = createElement('div', {className: 'messages-pane'});
  const detailsSlot = createElement('div');
  const modalSlot = createElement('div');
  const previewSlot = createElement('div');
  const removeMessage = (messageId: string) => {
    deleteMessage(messageId)
      .then(({error, status}) => {
        if (!error && status < 400) {
          messages.update((state) => state.filter((message) => message._id !== messageId));
        }
      });
  };
  const container = createElement('div', {className: 'chat-container'}, [
    createElement('div', {className: 'app-shell'}, [
      sidebarSlot,
      createElement('main', {className: 'chat'}, [
        headerSlot,
        messagesSlot,
        createElement('div', {className: 'composer-panel'}, [
          MessageComposer((value) => {
            postMessage(value);
          })
        ])
      ]),
      detailsSlot
    ]),
    modalSlot,
    previewSlot
  ]);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      mediaGalleryOpen.set(false);
      previewMedia.set(null);
    }
  });

  messages.subscribe((state) => {
    const authId = user?._id || '';
    const userName = user?.first_name || 'You';
    const mediaCount = getMediaEntries(state).length;
    render(sidebarSlot, Sidebar(state, authId));
    render(headerSlot, ChatHeader(state, userName, mediaCount, () => mediaGalleryOpen.set(true)));
    render(messagesSlot, MessageList(
      state,
      user?._id || '',
      (media) => previewMedia.set(media),
      removeMessage
    ));
    render(detailsSlot, ChatDetails(state, authId));
    render(modalSlot, MediaGalleryModal(state, mediaGalleryOpen.get(), () => mediaGalleryOpen.set(false)));
    render(previewSlot, MediaPreviewModal(previewMedia.get(), () => previewMedia.set(null)));
  });

  mediaGalleryOpen.subscribe((open) => {
    render(modalSlot, MediaGalleryModal(messages.get(), open, () => mediaGalleryOpen.set(false)));
  });

  previewMedia.subscribe((src) => {
    render(previewSlot, MediaPreviewModal(src, () => previewMedia.set(null)));
  });

  getMessages()
    .then(({data, error}) => {
      if (!error && data) {
        messages.set(data);
      }
    });

  connectMessagesSocket((payload) => {
    if (isDeleteSocketPayload(payload)) {
      messages.update((state) => state.filter((message) => message._id !== payload.data.messageId));
      return;
    }

    messages.update((state) => [...state, payload]);
  });

  return container;
}
