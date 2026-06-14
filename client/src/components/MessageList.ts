import {audio, createElement, icon, image, video} from '../lib/dom';
import {belongsToUser, getAttachmentIcon, getMessageMedia, mapMessagesToGroups} from '../lib/messages';
import {MediaItem, MediaKind, Message} from '../types';

const MESSAGE_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

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

function getReplyText(message?: Message | null) {
  if (!message) {
    return 'Original message unavailable';
  }

  if (message.text) {
    return message.text;
  }

  const mediaItems = getMessageMedia(message);

  if (!mediaItems.length) {
    return 'Attachment';
  }

  if (mediaItems.length === 1) {
    return mediaItems[0].name || `${mediaItems[0].kind} attachment`;
  }

  return `${mediaItems.length} attachments`;
}

function getReactionSummary(message: Message) {
  const summary = new Map<string, {count: number; reactedByMe: boolean}>();

  (message.reactions || []).forEach((reaction) => {
    const current = summary.get(reaction.type) || {count: 0, reactedByMe: false};
    current.count += 1;
    summary.set(reaction.type, current);
  });

  return summary;
}

function ReactionSummary(message: Message, authId: string, onReactMessage: (message: Message, reaction: string) => void) {
  const summary = getReactionSummary(message);

  (message.reactions || []).forEach((reaction) => {
    const current = summary.get(reaction.type);
    if (current) {
      current.reactedByMe = current.reactedByMe || reaction.user === authId;
    }
  });

  if (!summary.size) {
    return null;
  }

  return createElement('div', {className: 'reaction-summary'}, [...summary.entries()].map(([reaction, item]) => (
    createElement('button', {
      type: 'button',
      className: `reaction-pill ${item.reactedByMe ? 'active' : ''}`.trim(),
      title: `React ${reaction}`,
      on: {
        click: () => onReactMessage(message, reaction)
      }
    }, [
      createElement('span', {text: reaction}),
      createElement('span', {className: 'reaction-count', text: String(item.count)})
    ])
  )));
}

function AudioAttachment(media: MediaItem) {
  const audioNode = audio(media.path, 'attachment-audio');
  const attachment = createElement('div', {className: 'audio-attachment'});
  const durationLabel = createElement('span', {
    className: 'audio-duration',
    text: formatDuration(media.duration)
  });
  const playButton = createElement('button', {
    type: 'button',
    className: 'audio-toggle',
    title: 'Play audio'
  }, [icon('play_arrow')]);
  const liveCanvas = createElement('canvas', {className: 'audio-waveform-canvas'});
  const waveform = createElement('div', {className: 'audio-waveform'}, [
    media.poster
      ? image(media.poster, 'audio-waveform-image', `${media.name || 'Audio'} waveform`)
      : createElement('div', {className: 'audio-waveform-fallback'}, [icon('graphic_eq')]),
    liveCanvas
  ]);
  let animationFrame = 0;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let sourceNode: MediaElementAudioSourceNode | null = null;
  let timeDomainData: Uint8Array<ArrayBuffer> | null = null;
  let liveReady = false;
  let liveFailed = false;

  const ensureLiveWaveform = () => {
    if (liveFailed) {
      return;
    }

    if (liveReady && audioContext && analyser && timeDomainData) {
      if (audioContext.state === 'suspended') {
        void audioContext.resume();
      }
      return;
    }

    const BrowserAudioContext = window.AudioContext || (window as typeof window & {
      webkitAudioContext?: typeof AudioContext
    }).webkitAudioContext;

    if (!BrowserAudioContext) {
      return;
    }

    try {
      audioContext = new BrowserAudioContext();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.82;
      timeDomainData = new Uint8Array(new ArrayBuffer(analyser.fftSize));
      sourceNode = audioContext.createMediaElementSource(audioNode);
      sourceNode.connect(analyser);
      analyser.connect(audioContext.destination);
      liveReady = true;
    } catch (error) {
      console.error('Live waveform init failed', error);
      liveFailed = true;
      attachment.classList.add('live-waveform-disabled');
    }
  };

  const drawLiveWaveform = () => {
    if (!analyser || !timeDomainData) {
      return;
    }
    const data = timeDomainData as Uint8Array;

    const context = liveCanvas.getContext('2d');

    if (!context) {
      return;
    }

    const rect = waveform.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));

    if (liveCanvas.width !== width || liveCanvas.height !== height) {
      liveCanvas.width = width;
      liveCanvas.height = height;
    }

    analyser.getByteTimeDomainData(data as unknown as Uint8Array<ArrayBuffer>);
    context.clearRect(0, 0, width, height);
    context.scale(1, 1);

    const midY = height / 2;
    const progressRatio = audioNode.duration ? audioNode.currentTime / audioNode.duration : 0;
    const playedX = width * progressRatio;

    context.lineCap = 'round';
    context.lineJoin = 'round';

    const drawPath = (strokeStyle: string, lineWidth: number, clipWidth = width) => {
      context.save();
      context.beginPath();
      context.rect(0, 0, clipWidth, height);
      context.clip();
      context.beginPath();

      for (let index = 0; index < data.length; index += 1) {
        const sample = (data[index] - 128) / 128;
        const x = (index / (data.length - 1)) * width;
        const y = midY + (sample * (height * 0.34));

        if (index === 0) {
          context.moveTo(x, y);
          continue;
        }

        context.lineTo(x, y);
      }

      context.strokeStyle = strokeStyle;
      context.lineWidth = lineWidth;
      context.stroke();
      context.restore();
    };

    drawPath('rgba(148, 163, 184, 0.35)', 4);
    drawPath('#94a3b8', 1.5);
    drawPath('rgba(34, 211, 238, 0.24)', 6, playedX);
    drawPath('#22d3ee', 2, playedX);
  };

  const tickWaveform = () => {
    drawLiveWaveform();
    if (!audioNode.paused) {
      animationFrame = window.requestAnimationFrame(tickWaveform);
    }
  };

  const syncProgress = () => {
    durationLabel.textContent = formatDuration(audioNode.duration - audioNode.currentTime || audioNode.duration || media.duration);
  };

  playButton.addEventListener('click', () => {
    if (audioNode.paused) {
      const playResult = audioNode.play();

      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(() => {
          playButton.replaceChildren(icon('play_arrow'));
          playButton.title = 'Play audio';
          attachment.classList.remove('is-playing');
        });
      }
      return;
    }

    audioNode.pause();
  });

  audioNode.addEventListener('timeupdate', syncProgress);
  audioNode.addEventListener('loadedmetadata', syncProgress);
  audioNode.addEventListener('ended', () => {
    playButton.replaceChildren(icon('play_arrow'));
    playButton.title = 'Play audio';
    attachment.classList.remove('is-playing');
    window.cancelAnimationFrame(animationFrame);
  });
  audioNode.addEventListener('pause', () => {
    if (audioNode.ended) {
      return;
    }

    playButton.replaceChildren(icon('play_arrow'));
    playButton.title = 'Play audio';
    attachment.classList.remove('is-playing');
    window.cancelAnimationFrame(animationFrame);
  });
  audioNode.addEventListener('play', () => {
    ensureLiveWaveform();
    playButton.replaceChildren(icon('pause'));
    playButton.title = 'Pause audio';
    attachment.classList.add('is-playing');
    if (!liveFailed) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(tickWaveform);
    }
  });

  waveform.addEventListener('click', (event) => {
    const rect = waveform.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));

    if (audioNode.duration) {
      audioNode.currentTime = audioNode.duration * ratio;
      syncProgress();
      if (!audioNode.paused) {
        drawLiveWaveform();
      }
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
  replyMessage: Message | null,
  canDelete: boolean,
  authId: string,
  onPreviewMedia: (media: MediaItem) => void,
  onDeleteMessage: (messageId: string) => void,
  onReplyMessage: (message: Message) => void,
  onReactMessage: (message: Message, reaction: string) => void
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

  const content = createElement('div', {className: 'content-message'}, []);

  if (message.replyTo) {
    content.append(createElement('div', {
      className: 'message-reply-preview',
      title: replyMessage ? 'Reply target' : 'Original message unavailable'
    }, [
      createElement('span', {className: 'message-reply-bar'}),
      createElement('span', {className: 'message-reply-copy'}, [
        createElement('span', {
          className: 'message-reply-author',
          text: replyMessage?.author.first_name || 'Deleted message'
        }),
        createElement('span', {
          className: 'message-reply-text',
          text: getReplyText(replyMessage)
        })
      ])
    ]));
  }

  if (message.text) {
    content.append(createElement('div', {
      className: `text ${message.isOnlyEmoji ? 'only-emoji' : ''}`.trim(),
      text: message.text
    }));
  }

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

  let closeReactionPicker: (event?: Event) => void = () => {};
  const reactionPicker = createElement('div', {className: 'reaction-picker'}, MESSAGE_REACTIONS.map((reaction) => (
    createElement('button', {
      type: 'button',
      className: 'reaction-option',
      title: `React ${reaction}`,
      on: {
        click: () => {
          onReactMessage(message, reaction);
          closeReactionPicker();
        }
      }
    }, [reaction])
  )));
  const reactionToggle = createElement('button', {
    className: 'message-option-button',
    type: 'button',
    title: 'Add reaction',
    on: {
      click: (event) => {
        event.stopPropagation();
        reactionPicker.classList.toggle('open');

        if (reactionPicker.classList.contains('open')) {
          document.addEventListener('pointerdown', closeReactionPicker);
        } else {
          document.removeEventListener('pointerdown', closeReactionPicker);
        }
      }
    }
  }, [icon('add_reaction')]);
  const reactionsContainer = createElement('div', {className: 'reactions-container'}, [
    reactionToggle,
    reactionPicker,
  ]);
  const options = createElement('div', {className: 'options'}, [
    reactionsContainer,
    createElement('button', {
      className: 'message-option-button',
      type: 'button',
      title: 'Reply',
      on: {
        click: () => onReplyMessage(message)
      }
    }, [icon('reply')]),
    canDelete
      ? createElement('button', {
        className: 'message-option-button',
        type: 'button',
        title: 'Delete',
        on: {
          click: () => onDeleteMessage(message._id)
        }
      }, [icon('delete')])
      : null
  ]);
  closeReactionPicker = (event?: Event) => {
    if (event?.target instanceof Node && options.contains(event.target)) {
      return;
    }

    reactionPicker.classList.remove('open');
    document.removeEventListener('pointerdown', closeReactionPicker);
  };

  const reactionSummary = ReactionSummary(message, authId, onReactMessage);

  return createElement('div', {className: 'message', attrs: {'data-id': message._id}}, [
    createElement('div', {className: 'message-stack'}, [
      content,
      reactionSummary
    ]),
    options
  ]);
}

export function MessageList(
  messages: Message[],
  authId: string,
  onPreviewMedia: (media: MediaItem) => void,
  onDeleteMessage: (messageId: string) => void,
  onReplyMessage: (message: Message) => void,
  onReactMessage: (message: Message, reaction: string) => void
) {
  const container = createElement('div', {className: 'messages'});
  const groups = mapMessagesToGroups(messages);
  const messagesById = new Map(messages.map((message) => [message._id, message]));

  groups.forEach((group) => {
    const messageBelongsToLoggedUser = belongsToUser(group.author, authId);
    const userIcon = group.author.avatar
      ? image(group.author.avatar)
      : icon('account_circle');

    container.append(createElement('div', {
      className: `user-messages-group ${messageBelongsToLoggedUser ? 'right' : 'left'}`
    }, [
      createElement('div', {className: 'user-icon'}, [userIcon]),
      createElement('div', {className: 'user-group-content'}, [
        createElement('div', {className: 'user-name', text: group.author.first_name}),
        createElement('div', {className: 'group'}, group.messages.map((message) => (
          MessageBubble(
            message,
            message.replyTo ? messagesById.get(message.replyTo) || null : null,
            messageBelongsToLoggedUser,
            authId,
            onPreviewMedia,
            onDeleteMessage,
            onReplyMessage,
            onReactMessage
          )
        )))
      ]),
    ]));
  });

  queueMicrotask(() => {
    container.scrollTop = container.scrollHeight;
  });

  return container;
}
