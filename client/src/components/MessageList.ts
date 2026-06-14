import {audio, createElement, icon, image, video} from '../lib/dom';
import {belongsToUser, getAttachmentIcon, getMessageMedia, mapMessagesToGroups} from '../lib/messages';
import {MediaItem, MediaKind, Message} from '../types';

function renderMediaThumb(media: MediaItem) {
  return media.kind === MediaKind.VIDEO
    ? createElement('div', {className: 'media-tile media-video'}, [
      media.poster ? image(media.poster, 'message-video-thumb') : video(media.path, 'message-video-thumb'),
      createElement('span', {className: 'material-icons media-play-icon', text: 'play_circle'})
    ])
    : media.kind === MediaKind.IMAGE
      ? createElement('div', {className: 'media-tile'}, [image(media.path)])
      : media.kind === MediaKind.AUDIO
        ? createElement('div', {className: 'media-tile media-audio'}, [
          media.poster
            ? image(media.poster, 'message-file-thumb')
            : createElement('div', {className: 'file-fallback'}, [
              icon('graphic_eq', 'file-fallback-icon'),
              createElement('span', {
                className: 'file-fallback-ext',
                text: 'AUDIO'
              })
            ])
        ])
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

function formatDuration(duration?: number | null) {
  if (!duration || !Number.isFinite(duration)) {
    return '0:00';
  }

  const totalSeconds = Math.max(0, Math.round(duration));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function AudioAttachment(media: MediaItem) {
  const audioNode = audio(media.path, 'attachment-audio');
  const attachment = createElement('div', {className: 'audio-attachment'});
  const progress = createElement('div', {className: 'audio-waveform-progress'});
  const durationLabel = createElement('span', {
    className: 'audio-duration',
    text: formatDuration(media.duration)
  });
  const playButton = createElement('button', {
    type: 'button',
    className: 'audio-toggle',
    title: 'Play audio'
  }, [icon('play_arrow')]);
  const waveformValues = media.waveform?.length
    ? media.waveform
    : Array.from({length: 72}, (_, index) => (index % 12 === 0 ? 0.7 : 0.08));
  const liveBars = waveformValues.map(() => createElement('span', {className: 'audio-waveform-bar'}));
  const waveform = createElement('div', {className: 'audio-waveform'}, [
    media.poster
      ? image(media.poster, 'audio-waveform-image', `${media.name || 'Audio'} waveform`)
      : createElement('div', {className: 'audio-waveform-fallback'}, [icon('graphic_eq')]),
    createElement('div', {className: 'audio-waveform-glow'}),
    progress,
    createElement('div', {className: 'audio-waveform-live'}, liveBars)
  ]);
  let animationFrame = 0;

  const updateWaveformBars = () => {
    const baseOffset = audioNode.duration
      ? Math.floor((audioNode.currentTime / audioNode.duration) * waveformValues.length * 3)
      : 0;
    const time = performance.now() / 180;

    liveBars.forEach((bar, index) => {
      const sample = waveformValues[(index + baseOffset) % waveformValues.length] || 0.05;
      const motion = 0.82 + (Math.sin(time + (index * 0.42)) * 0.18);
      const height = Math.max(10, Math.min(100, (sample * motion) * 100));
      bar.style.height = `${height}%`;
      bar.style.opacity = `${0.42 + (sample * 0.5)}`;
    });
  };

  const tickWaveform = () => {
    updateWaveformBars();
    if (!audioNode.paused) {
      animationFrame = window.requestAnimationFrame(tickWaveform);
    }
  };

  if (media.poster) {
    progress.append(
      image(media.poster, 'audio-waveform-image active', `${media.name || 'Audio'} waveform active`),
      createElement('div', {className: 'audio-waveform-shimmer'})
    );
  }

  const syncProgress = () => {
    const ratio = audioNode.duration ? audioNode.currentTime / audioNode.duration : 0;
    progress.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
    durationLabel.textContent = formatDuration(audioNode.duration - audioNode.currentTime || audioNode.duration || media.duration);
  };
  updateWaveformBars();

  playButton.addEventListener('click', () => {
    if (audioNode.paused) {
      void audioNode.play();
      playButton.replaceChildren(icon('pause'));
      playButton.title = 'Pause audio';
      attachment.classList.add('is-playing');
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(tickWaveform);
      return;
    }

    audioNode.pause();
    playButton.replaceChildren(icon('play_arrow'));
    playButton.title = 'Play audio';
      attachment.classList.remove('is-playing');
    window.cancelAnimationFrame(animationFrame);
  });

  audioNode.addEventListener('timeupdate', syncProgress);
  audioNode.addEventListener('loadedmetadata', syncProgress);
  audioNode.addEventListener('ended', () => {
    progress.style.width = '100%';
    playButton.replaceChildren(icon('play_arrow'));
    playButton.title = 'Play audio';
    attachment.classList.remove('is-playing');
    window.cancelAnimationFrame(animationFrame);
    updateWaveformBars();
  });
  audioNode.addEventListener('pause', () => {
    if (audioNode.ended) {
      return;
    }

    playButton.replaceChildren(icon('play_arrow'));
    playButton.title = 'Play audio';
    attachment.classList.remove('is-playing');
    window.cancelAnimationFrame(animationFrame);
    updateWaveformBars();
  });
  audioNode.addEventListener('play', () => {
    playButton.replaceChildren(icon('pause'));
    playButton.title = 'Pause audio';
    attachment.classList.add('is-playing');
    window.cancelAnimationFrame(animationFrame);
    animationFrame = window.requestAnimationFrame(tickWaveform);
  });

  waveform.addEventListener('click', (event) => {
    const rect = waveform.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));

    if (audioNode.duration) {
      audioNode.currentTime = audioNode.duration * ratio;
      syncProgress();
    }
  });

  attachment.append(
    playButton,
    createElement('div', {className: 'audio-body'}, [
      waveform,
      createElement('div', {className: 'audio-meta'}, [
        createElement('span', {
          className: 'attachment-name',
          text: media.name || media.path.split('/').pop() || 'Audio'
        }),
        durationLabel
      ])
    ]),
    audioNode
  );

  return attachment;
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
      createElement('div', {className: `attachment-item ${media.kind === 'audio' ? 'audio-item' : ''}`.trim()}, [
        ...(media.kind === 'audio'
          ? [AudioAttachment(media)]
          : [
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
