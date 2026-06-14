import {createElement, icon, image, video} from '../lib/dom';
import {getAttachmentCategory, getAttachmentIcon, MESSAGE_TYPES, replaceTextEmojis} from '../lib/messages';
import type {MediaUpload} from '../types';
import {EmojiPicker} from './EmojiPicker';

export function MessageComposer(onSendMessage: (value: {text: string; media: MediaUpload[]; type: string}) => void) {
  let files: MediaUpload[] = [];
  let inputContainerHeight = 40;

  const textarea = createElement('textarea', {
    rows: 1,
    placeholder: 'Aa'
  });
  const fileInput = createElement('input', {
    type: 'file',
    multiple: true
  });
  const inputFieldContainer = createElement('div', {className: 'input-field-container'});
  const preview = createElement('div', {className: 'files-preview'});
  const textFieldContainer = createElement('div', {className: 'text-field-container'});

  const isVideoFile = (src: string) => src.startsWith('data:video/');
  const isImageFile = (src: string) => src.startsWith('data:image/');

  const renderPreviewMedia = (file: MediaUpload) => isVideoFile(file.file)
    ? createElement('div', {className: 'composer-media-preview composer-video-preview'}, [
      file.poster ? image(file.poster, 'composer-preview-image') : video(file.file, 'composer-preview-video'),
      icon('play_circle', 'composer-preview-play')
    ])
    : isImageFile(file.file)
      ? createElement('div', {className: 'composer-media-preview'}, [image(file.file, 'composer-preview-image')])
      : createElement('div', {className: 'composer-media-preview composer-file-preview'}, [
        file.poster
          ? image(file.poster, 'composer-preview-image')
          : createElement('div', {className: 'composer-file-fallback'}, [
            icon(getAttachmentIcon(file), 'composer-file-icon'),
            createElement('span', {
              className: 'composer-file-ext',
              text: file.name.split('.').pop()?.toUpperCase() || 'FILE'
            })
          ])
      ]);

  const loadDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', (event) => {
      if (typeof event.target?.result === 'string') {
        resolve(event.target.result);
        return;
      }

      reject(new Error('Could not read file'));
    });
    reader.addEventListener('error', () => reject(reader.error || new Error('Could not read file')));
    reader.readAsDataURL(file);
  });

  const generateVideoPoster = (file: File) => new Promise<string | null>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const media = document.createElement('video');
    media.preload = 'metadata';
    media.muted = true;
    media.playsInline = true;
    media.src = objectUrl;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      media.removeAttribute('src');
      media.load();
    };

    media.addEventListener('loadedmetadata', () => {
      if (!Number.isFinite(media.duration) || media.duration <= 0) {
        cleanup();
        resolve(null);
        return;
      }

      media.currentTime = Math.min(Math.max(media.duration / 3, 0.1), Math.max(media.duration - 0.1, 0.1));
    }, {once: true});

    media.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = media.videoWidth || 320;
      canvas.height = media.videoHeight || 180;
      const context = canvas.getContext('2d');

      if (!context) {
        cleanup();
        resolve(null);
        return;
      }

      context.drawImage(media, 0, 0, canvas.width, canvas.height);
      const poster = canvas.toDataURL('image/jpeg', 0.82);
      cleanup();
      resolve(poster);
    }, {once: true});

    media.addEventListener('error', () => {
      cleanup();
      resolve(null);
    }, {once: true});
  });

  const generateTextPoster = async (file: File) => {
    try {
      const content = (await file.text())
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 4);
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const context = canvas.getContext('2d');

      if (!context) {
        return null;
      }

      context.fillStyle = '#0f172a';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#22c55e';
      context.font = '700 22px sans-serif';
      context.fillText('TXT', 18, 34);
      context.fillStyle = '#dbeafe';
      context.font = '14px sans-serif';

      content.forEach((line, index) => {
        context.fillText(line.slice(0, 34), 18, 72 + (index * 32));
      });

      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  };

  const generateFilePoster = async (file: File) => {
    const category = getAttachmentCategory({
      kind: 'file',
      name: file.name,
      mimeType: file.type || null,
      path: file.name,
    });

    if (category === 'text') {
      const textPoster = await generateTextPoster(file);
      if (textPoster) {
        return textPoster;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const context = canvas.getContext('2d');

    if (!context) {
      return null;
    }

    const extension = file.name.split('.').pop()?.toUpperCase() || 'FILE';
    const label = category === 'sheet'
      ? 'SHEET'
      : category === 'archive'
        ? 'ARCHIVE'
        : category === 'document'
          ? 'DOC'
          : category === 'pdf'
            ? 'PDF'
            : 'FILE';

    context.fillStyle = '#111827';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#1f2937';
    context.fillRect(16, 16, canvas.width - 32, canvas.height - 32);
    context.fillStyle = '#38bdf8';
    context.fillRect(16, 16, canvas.width - 32, 56);
    context.fillStyle = '#031018';
    context.font = '700 22px sans-serif';
    context.fillText(label, 28, 52);
    context.fillStyle = '#e6edf7';
    context.font = '700 64px sans-serif';
    context.fillText(extension.slice(0, 4), 24, 148);
    context.fillStyle = '#8b98aa';
    context.font = '14px sans-serif';
    context.fillText(file.name.slice(0, 28), 24, 214);

    return canvas.toDataURL('image/png');
  };

  const updateTextareaHeight = (height: number) => {
    inputContainerHeight = height <= 200 ? Math.max(height, 40) : 200;
    textFieldContainer.style.height = `${inputContainerHeight}px`;
  };

  const drawPreview = () => {
    if (!files.length) {
      preview.remove();
      return;
    }

    preview.replaceChildren(...files.map((file, index) => {
      const remove = icon('close', 'delete-image');
      remove.addEventListener('click', () => {
        files = files.filter((_, fileIndex) => fileIndex !== index);
        drawPreview();
      });

      return createElement('div', {className: 'composer-preview-item'}, [
        remove,
        renderPreviewMedia(file),
        createElement('span', {className: 'composer-preview-name', text: file.name})
      ]);
    }), createElement('div'));

    inputFieldContainer.prepend(preview);
  };

  const sendMessage = () => {
    const value = textarea.value.trim();
    const hasImages = files.length > 0;

    if (!value && !hasImages) {
      textarea.focus();
      return;
    }

    onSendMessage({text: value, media: files, type: MESSAGE_TYPES.MESSAGE});
    files = [];
    textarea.value = '';
    updateTextareaHeight(40);
    drawPreview();
    textarea.focus();
  };

  textarea.addEventListener('keydown', (event) => {
    textarea.value = replaceTextEmojis(textarea.value);

    if (event.key === 'Enter') {
      event.preventDefault();

      if (event.shiftKey) {
        textarea.value = `${textarea.value}\n`;
        updateTextareaHeight(textarea.scrollHeight);
        return;
      }

      sendMessage();
      return;
    }

    updateTextareaHeight(textarea.scrollHeight);
  });

  fileInput.addEventListener('change', () => {
    const filesList = [...(fileInput.files || [])];
    if (!filesList.length) {
      return;
    }

    Promise.all(filesList.map(async (file) => {
      const dataUrl = await loadDataUrl(file);
      const kind = file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('image/')
          ? 'image'
          : 'file';
      const poster = kind === 'video'
        ? await generateVideoPoster(file)
        : kind === 'file'
          ? await generateFilePoster(file)
          : null;

      return {
        file: dataUrl,
        kind,
        name: file.name,
        poster,
        mimeType: file.type || null,
      } satisfies MediaUpload;
    }))
      .then((loadedFiles) => {
        files = [...files, ...loadedFiles];
        drawPreview();
      })
      .finally(() => {
        fileInput.value = '';
      });
  });

  const insertEmoji = (emoji: string) => {
    const [start, end] = [textarea.selectionStart, textarea.selectionEnd];
    textarea.setRangeText(emoji, start, end, 'end');
    textarea.focus();
  };

  textFieldContainer.style.height = `${inputContainerHeight}px`;
  textFieldContainer.append(textarea, EmojiPicker(insertEmoji));
  inputFieldContainer.append(textFieldContainer);

  return createElement('div', {className: 'message-composer'}, [
    createElement('div', {className: 'bottom-bar'}, [
      createElement('label', {}, [fileInput, icon('attach_file')]),
      inputFieldContainer,
      createElement('button', {type: 'button', on: {click: sendMessage}}, [icon('send')])
    ])
  ]);
}
