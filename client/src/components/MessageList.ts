import {belongsToUser, getAttachmentIcon, getMessageMedia, mapMessagesToGroups} from '../lib/messages';
import {createElement, icon, image, video} from '../lib/dom';
import type {MediaItem, Message} from '../types';

function renderMediaThumb(media: MediaItem) {
  return media.kind === 'video'
    ? createElement('div', {className: 'media-tile media-video'}, [
      media.poster ? image(media.poster, 'message-video-thumb') : video(media.path, 'message-video-thumb'),
      createElement('span', {className: 'material-icons media-play-icon', text: 'play_circle'})
    ])
    : media.kind === 'image'
      ? createElement('div', {className: 'media-tile'}, [image(media.path)])
      : createElement('div', {className: 'media-tile media-file'}, [
        media.poster
          ? image(media.poster, 'message-file-thumb')
          : createElement('div', {className: 'file-fallback'}, [
            icon(getAttachmentIcon(media), 'file-fallback-icon'),
            createElement('span', {
              className: 'file-fallback-ext',
              text: media.name?.split('.').pop()?.toUpperCase() || 'FILE'
            })
          ])
      ]);
}

function MessageBubble(
  message: Message,
  canDelete: boolean,
  onPreviewMedia: (media: MediaItem) => void,
  onDeleteMessage: (messageId: string) => void
) {
  const mediaItems = getMessageMedia(message);
  let imagesDivClassName = 'images';
  const imagesLength = mediaItems.length;

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

  if (mediaItems.length) {
    content.append(createElement('div', {className: imagesDivClassName}, mediaItems.map((media) => (
      createElement('div', {className: 'attachment-item'}, [
        createElement('button', {
          className: 'image-handler',
          type: 'button',
          title: media.kind === 'file' ? 'Open file' : 'Preview media',
          on: {
            click: () => onPreviewMedia(media)
          }
        }, [renderMediaThumb(media)]),
        createElement('span', {
          className: 'attachment-name',
          text: media.name || media.path.split('/').pop() || 'Attachment'
        })
      ])
    ))));
  }

  const options = createElement('div', {className: 'options'}, [
    icon('reply'),
    canDelete
      ? createElement('span', {
        className: 'material-icons icon',
        text: 'delete',
        on: {
          click: () => onDeleteMessage(message._id)
        }
      })
      : null
  ]);

  return createElement('div', {className: 'message', attrs: {'data-id': message._id}}, [content, options]);
}

export function MessageList(
  messages: Message[],
  authId: string,
  onPreviewMedia: (media: MediaItem) => void,
  onDeleteMessage: (messageId: string) => void
) {
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
          MessageBubble(message, messageBelongsToLoggedUser, onPreviewMedia, onDeleteMessage)
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
