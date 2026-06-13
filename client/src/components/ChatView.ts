import {getMessages, postMessage} from '../lib/api';
import {getLoggedUser} from '../lib/auth';
import {connectMessagesSocket} from '../lib/websocket';
import {createElement, render} from '../lib/dom';
import {createStore} from '../lib/store';
import type {Message} from '../types';
import {MessageList} from './MessageList';
import {MessageComposer} from './MessageComposer';

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

  if (message.images?.length && !message.text) {
    return `${message.images.length} image${message.images.length > 1 ? 's' : ''}`;
  }

  return message.text || 'New activity';
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

function ChatHeader(messages: Message[], userName: string) {
  return createElement('header', {className: 'chat-header'}, [
    createElement('div', {className: 'chat-heading'}, [
      createElement('div', {className: 'room-avatar', text: 'G'}),
      createElement('div', {}, [
        createElement('h1', {text: 'General room'}),
        createElement('p', {text: `${messages.length} messages · signed in as ${userName}`})
      ])
    ]),
    createElement('div', {className: 'chat-actions'}, [
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
      createElement('p', {text: 'A quiet place for websocket chatter, images, and tiny reactions.'})
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
    ]),
    createElement('div', {className: 'details-card'}, [
      createElement('div', {className: 'section-label', text: 'Shared'}),
      createElement('button', {className: 'detail-link', type: 'button'}, [
        createElement('span', {className: 'material-icons icon', text: 'image'}),
        createElement('span', {text: 'Media gallery'})
      ]),
      createElement('button', {className: 'detail-link', type: 'button'}, [
        createElement('span', {className: 'material-icons icon', text: 'push_pin'}),
        createElement('span', {text: 'Pinned messages'})
      ])
    ])
  ]);
}

export function ChatView() {
  const user = getLoggedUser();
  const messages = createStore<Message[]>([]);

  const sidebarSlot = createElement('div');
  const headerSlot = createElement('div');
  const messagesSlot = createElement('div', {className: 'messages-pane'});
  const detailsSlot = createElement('div');
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
    ])
  ]);

  messages.subscribe((state) => {
    const authId = user?._id || '';
    const userName = user?.first_name || 'You';
    render(sidebarSlot, Sidebar(state, authId));
    render(headerSlot, ChatHeader(state, userName));
    render(messagesSlot, MessageList(state, user?._id || ''));
    render(detailsSlot, ChatDetails(state, authId));
  });

  getMessages()
    .then(({data, error}) => {
      if (!error && data) {
        messages.set(data);
      }
    });

  connectMessagesSocket((message) => {
    messages.update((state) => [...state, message]);
  });

  return container;
}
