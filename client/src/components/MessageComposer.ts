import {createElement, icon, image} from '../lib/dom';
import {MESSAGE_TYPES, replaceTextEmojis} from '../lib/messages';
import {EmojiPicker} from './EmojiPicker';

export function MessageComposer(onSendMessage: (value: {text: string; images: string[]; type: string}) => void) {
  let files: string[] = [];
  let inputContainerHeight = 40;

  const textarea = createElement('textarea', {
    rows: 1,
    placeholder: 'Aa'
  });
  const fileInput = createElement('input', {
    type: 'file',
    multiple: true,
    accept: 'image/*'
  });
  const inputFieldContainer = createElement('div', {className: 'input-field-container'});
  const preview = createElement('div', {className: 'files-preview'});
  const textFieldContainer = createElement('div', {className: 'text-field-container'});

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

      return createElement('div', {}, [remove, image(file)]);
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

    onSendMessage({text: value, images: files, type: MESSAGE_TYPES.MESSAGE});
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

    let processedFiles = 0;
    filesList.forEach((file) => {
      const reader = new FileReader();
      reader.addEventListener('load', (event) => {
        if (typeof event.target?.result === 'string') {
          files = [...files, event.target.result];
          drawPreview();
        }

        processedFiles++;
        if (processedFiles === filesList.length) {
          fileInput.value = '';
        }
      });
      reader.readAsDataURL(file);
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
      createElement('label', {}, [fileInput, icon('add_photo_alternate')]),
      inputFieldContainer,
      createElement('button', {type: 'button', on: {click: sendMessage}}, [icon('send')])
    ])
  ]);
}
