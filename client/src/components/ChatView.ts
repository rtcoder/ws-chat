import {getMessages, postMessage} from '../lib/api';
import {getLoggedUser} from '../lib/auth';
import {connectMessagesSocket} from '../lib/websocket';
import {createElement, render} from '../lib/dom';
import {createStore} from '../lib/store';
import type {Message} from '../types';
import {MessageList} from './MessageList';
import {MessageComposer} from './MessageComposer';

export function ChatView() {
  const user = getLoggedUser();
  const messages = createStore<Message[]>([]);

  const messagesSlot = createElement('div');
  const container = createElement('div', {className: 'chat-container'}, [
    createElement('div', {className: 'content-wrapper'}, [
      createElement('div', {className: 'chats-list', text: 'lista'}),
      createElement('div', {className: 'chat'}, [
        messagesSlot,
        MessageComposer((value) => {
          postMessage(value);
        })
      ]),
      createElement('div', {className: 'chat-info', text: 'info'})
    ])
  ]);

  messages.subscribe((state) => {
    render(messagesSlot, MessageList(state, user?._id || ''));
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
