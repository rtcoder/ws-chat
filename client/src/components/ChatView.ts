import {deleteMessage, getChats, getMessages, postMessage} from '../lib/api';
import {getLoggedUser, logout} from '../lib/auth';
import {getMessageMedia} from '../lib/messages';
import {connectMessagesSocket} from '../lib/websocket';
import {createElement, icon, image, render, resolveMediaSrc, video} from '../lib/dom';
import {createStore} from '../lib/store';
import type {ChatSummary, MediaItem, Message} from '../types';
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

function getUniqueContacts(chats: ChatSummary[], authId: string) {
  const contacts = new Map();

  chats.forEach((chat) => {
    chat.members.forEach((member) => {
      if (member._id !== authId) {
        contacts.set(member._id, member);
      }
    });
  });

  return [...contacts.values()];
}

function formatMessagePreview(chat?: ChatSummary) {
  if (!chat?.latestMessage) {
    return 'No messages yet';
  }

  if (chat.latestMessage.mediaCount && !chat.latestMessage.text) {
    return `${chat.latestMessage.mediaCount} media item${chat.latestMessage.mediaCount > 1 ? 's' : ''}`;
  }

  return chat.latestMessage.text || 'New activity';
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

function SidebarContact(name: string, status: string, active = false, onClick?: () => void) {
  return createElement('button', {
    className: `conversation-item ${active ? 'active' : ''}`.trim(),
    type: 'button',
    on: onClick ? {click: () => onClick()} : undefined
  }, [
    createElement('span', {className: 'avatar-shell', text: initials(name)}),
    createElement('span', {className: 'conversation-copy'}, [
      createElement('span', {className: 'conversation-title', text: name}),
      createElement('span', {className: 'conversation-preview', text: status})
    ])
  ]);
}

function Sidebar(
  chats: ChatSummary[],
  activeChatId: string | null,
  authId: string,
  onSelectChat: (chatId: string) => void,
  onLogout: () => void
) {
  const contacts = getUniqueContacts(chats, authId);

  return createElement('aside', {className: 'app-sidebar'}, [
    createElement('div', {className: 'brand-row'}, [
      createElement('div', {className: 'brand-group'}, [
        createElement('div', {className: 'brand-mark', text: 'W'}),
        createElement('div', {}, [
          createElement('div', {className: 'brand-name', text: 'WS Chat'}),
          createElement('div', {className: 'brand-subtitle', text: 'Realtime workspace'})
        ])
      ]),
      createElement('button', {
        type: 'button',
        className: 'sidebar-logout',
        title: 'Log out',
        on: {
          click: () => onLogout()
        }
      }, [
        icon('logout'),
        createElement('span', {text: 'Log out'})
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
      ...(chats.length
        ? chats.map((chat) => SidebarContact(
          chat.name,
          formatMessagePreview(chat),
          chat.id === activeChatId,
          () => onSelectChat(chat.id)
        ))
        : [
          SidebarContact('No conversations yet', 'Start by sending a message')
        ])
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

function getChatAvatarLabel(chat: ChatSummary | null) {
  if (!chat) {
    return 'W';
  }

  return initials(chat.name).slice(0, 2) || 'W';
}

function ChatHeader(
  activeChat: ChatSummary | null,
  messages: Message[],
  userName: string,
  mediaCount: number,
  onOpenMedia: () => void
) {
  return createElement('header', {className: 'chat-header'}, [
    createElement('div', {className: 'chat-heading'}, [
      createElement('div', {className: 'room-avatar', text: getChatAvatarLabel(activeChat)}),
      createElement('div', {}, [
        createElement('h1', {text: activeChat?.name || 'Conversation'}),
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

function getChatDescription(activeChat: ChatSummary | null) {
  if (!activeChat) {
    return 'Pick a conversation to start reading and sending messages.';
  }

  if (activeChat.type === 'direct') {
    return 'Private conversation between two people.';
  }

  if (activeChat.type === 'channel') {
    return 'Shared room for the whole workspace.';
  }

  return 'Group conversation with shared updates and media.';
}

function ChatDetails(activeChat: ChatSummary | null, chats: ChatSummary[], messages: Message[], authId: string) {
  const contacts = getUniqueContacts(chats, authId);

  return createElement('aside', {className: 'chat-details'}, [
    createElement('div', {className: 'details-card room-card'}, [
      createElement('div', {className: 'room-avatar large', text: getChatAvatarLabel(activeChat)}),
      createElement('h2', {text: activeChat?.name || 'Conversation'}),
      createElement('p', {text: getChatDescription(activeChat)})
    ]),
    createElement('div', {className: 'details-card'}, [
      createElement('div', {className: 'section-label', text: 'In this room'}),
      createElement('div', {className: 'stats-grid'}, [
        createElement('div', {}, [
          createElement('strong', {text: String(messages.length)}),
          createElement('span', {text: 'Messages'})
        ]),
        createElement('div', {}, [
          createElement('strong', {text: String(Math.max(activeChat?.members.length || contacts.length + 1, 1))}),
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
  const chats = createStore<ChatSummary[]>([]);
  const activeChatId = createStore<string | null>(null);
  const messages = createStore<Message[]>([]);
  const mediaGalleryOpen = createStore(false);
  const previewMedia = createStore<MediaItem | null>(null);
  const replyToMessage = createStore<Message | null>(null);

  const sidebarSlot = createElement('div');
  const headerSlot = createElement('div');
  const messagesSlot = createElement('div', {className: 'messages-pane'});
  const detailsSlot = createElement('div');
  const composerSlot = createElement('div', {className: 'composer-panel'});
  const modalSlot = createElement('div');
  const previewSlot = createElement('div');
  const loadMessagesForChat = (chatId: string | null) => {
    getMessages(chatId)
      .then(({data, error}) => {
        if (!error && data) {
          messages.set(data);
          replyToMessage.set(null);
        }
      });
  };
  const handleLogout = () => {
    logout();
    window.location.reload();
  };
  const removeMessage = (messageId: string) => {
    deleteMessage(messageId)
      .then(({error, status}) => {
        if (!error && status < 400) {
          messages.update((state) => state.filter((message) => message._id !== messageId));
          if (replyToMessage.get()?._id === messageId) {
            replyToMessage.set(null);
          }
        }
      });
  };
  const container = createElement('div', {className: 'chat-container'}, [
    createElement('div', {className: 'app-shell'}, [
      sidebarSlot,
      createElement('main', {className: 'chat'}, [
        headerSlot,
        messagesSlot,
        composerSlot
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
    const activeChat = chats.get().find((chat) => chat.id === activeChatId.get()) || null;
    render(sidebarSlot, Sidebar(
      chats.get(),
      activeChatId.get(),
      authId,
      (chatId) => {
        if (chatId !== activeChatId.get()) {
          activeChatId.set(chatId);
        }
      },
      handleLogout
    ));
    render(headerSlot, ChatHeader(activeChat, state, userName, mediaCount, () => mediaGalleryOpen.set(true)));
    render(messagesSlot, MessageList(
      state,
      user?._id || '',
      (media) => previewMedia.set(media),
      removeMessage,
      (message) => replyToMessage.set(message)
    ));
    render(detailsSlot, ChatDetails(activeChat, chats.get(), state, authId));
    render(modalSlot, MediaGalleryModal(state, mediaGalleryOpen.get(), () => mediaGalleryOpen.set(false)));
    render(previewSlot, MediaPreviewModal(previewMedia.get(), () => previewMedia.set(null)));

    const currentReplyId = replyToMessage.get()?._id;
    if (currentReplyId) {
      const refreshedReplyMessage = state.find((message) => message._id === currentReplyId) || null;
      if (refreshedReplyMessage !== replyToMessage.get()) {
        replyToMessage.set(refreshedReplyMessage);
      }
    }
  });

  chats.subscribe((state) => {
    const authId = user?._id || '';
    const activeChat = state.find((chat) => chat.id === activeChatId.get()) || null;

    if (!activeChatId.get() && state.length) {
      activeChatId.set(state[0].id);
      return;
    }

    render(sidebarSlot, Sidebar(
      state,
      activeChatId.get(),
      authId,
      (chatId) => {
        if (chatId !== activeChatId.get()) {
          activeChatId.set(chatId);
        }
      },
      handleLogout
    ));
    render(headerSlot, ChatHeader(activeChat, messages.get(), user?.first_name || 'You', getMediaEntries(messages.get()).length, () => mediaGalleryOpen.set(true)));
    render(detailsSlot, ChatDetails(activeChat, state, messages.get(), authId));
  });

  activeChatId.subscribe((chatId) => {
    if (!chatId) {
      return;
    }

    loadMessagesForChat(chatId);
  });

  mediaGalleryOpen.subscribe((open) => {
    render(modalSlot, MediaGalleryModal(messages.get(), open, () => mediaGalleryOpen.set(false)));
  });

  previewMedia.subscribe((src) => {
    render(previewSlot, MediaPreviewModal(src, () => previewMedia.set(null)));
  });

  replyToMessage.subscribe((message) => {
    render(composerSlot, MessageComposer({
      replyTo: message,
      onCancelReply: () => replyToMessage.set(null),
      onSendMessage: (value) => {
        postMessage({
          ...value,
          chatId: activeChatId.get() || undefined
        });
      }
    }));
  });

  getChats()
    .then(({data, error}) => {
      if (!error && data) {
        chats.set(data);
      }
    });

  connectMessagesSocket((payload) => {
    if (isDeleteSocketPayload(payload)) {
      messages.update((state) => state.filter((message) => message._id !== payload.data.messageId));
      return;
    }

    const currentChatId = activeChatId.get();

    if (payload.chatId && currentChatId && payload.chatId !== currentChatId) {
      getChats().then(({data, error}) => {
        if (!error && data) {
          chats.set(data);
        }
      });
      return;
    }

    messages.update((state) => [...state, payload]);
    getChats().then(({data, error}) => {
      if (!error && data) {
        chats.set(data);
      }
    });
  });

  return container;
}
