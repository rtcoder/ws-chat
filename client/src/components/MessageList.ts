import {belongsToUser, mapMessagesToGroups} from '../lib/messages';
import {createElement, icon, image} from '../lib/dom';
import type {Message} from '../types';

function MessageBubble(message: Message, canDelete: boolean) {
  let imagesDivClassName = 'images';
  const imagesLength = message.images.length;

  if (imagesLength) {
    const classes: Record<string, string> = {
      c1: 'i1',
      c2: 'i2',
      c4: 'i4'
    };
    imagesDivClassName = `${imagesDivClassName} ${classes[`c${imagesLength}`] || ''}`.trim();
  }

  const text = createElement('div', {
    className: `text ${message.isOnlyEmoji ? 'only-emoji' : ''}`.trim(),
    text: message.text
  });
  const content = createElement('div', {className: 'content-message'}, [text]);

  if (message.images.length) {
    content.append(createElement('div', {className: imagesDivClassName}, message.images.map((file) => (
      createElement('div', {className: 'image-handler'}, [image(file)])
    ))));
  }

  const options = createElement('div', {className: 'options'}, [
    icon('reply'),
    canDelete ? icon('delete') : null
  ]);

  return createElement('div', {className: 'message', attrs: {'data-id': message._id}}, [content, options]);
}

export function MessageList(messages: Message[], authId: string) {
  const container = createElement('div', {className: 'messages'});
  const groups = mapMessagesToGroups(messages);

  groups.forEach((group) => {
    const messageBelongsToLoggedUser = belongsToUser(group.author, authId);
    const userIcon = group.author.avatar
      ? image('https://th.bing.com/th/id/OIP.tb_57ZQ51gNqsOIw1BWX2wHaEo?pid=ImgDet&rs=1')
      : icon('account_circle');

    container.append(createElement('div', {
      className: `user-messages-group ${messageBelongsToLoggedUser ? 'right' : 'left'}`
    }, [
      createElement('div', {className: 'user-group-content'}, [
        createElement('div', {className: 'user-name', text: group.author.first_name}),
        createElement('div', {className: 'group'}, group.messages.map((message) => (
          MessageBubble(message, messageBelongsToLoggedUser)
        )))
      ]),
      createElement('div', {className: 'user-icon'}, [userIcon])
    ]));
  });

  queueMicrotask(() => {
    container.scrollTop = container.scrollHeight;
  });

  return container;
}
