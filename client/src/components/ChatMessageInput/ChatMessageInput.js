import './ChatMessageInput.css';
import React, {createRef, useState} from "react";
import Icon from "../../Icon";
import EmojiList from "../EmojiList/EmojiList";
import Image from "../../Image";


const MESSAGE_TYPES = {
  MESSAGE: 'msg',
  REPLY: 'msg_reply',
  INFO_JOIN_MEMBER: 'new_member',
  INFO_LEFT_MEMBER: 'left_member',
  INFO_CHANGE_COLOR: 'info_change_color',
  INFO_CHANGE_CHAT_NAME: 'info_change_chat_name',
  INFO_CHANGE_NICKNAME: 'info_change_nickname',
};

const ChatMessageInput = ({onSendMessage}) => {
  const [inputContainerHeight, setInputContainerHeight] = useState(40);
  const [files, setFiles] = useState([]);
  const textareaRef = createRef();
  const inputFileRef = createRef();

  const updateTextareaHeight = height => {
    height = height <= 200
      ? (height > 40 ? height : 40)
      : 200;
    setInputContainerHeight(height);
  };

  const keyDown = async e => {
    replaceEmojis();
    if (e.key === 'Enter') {
      e.preventDefault();

      if (e.shiftKey) {
        e.target.value = e.target.value + '\n';
        updateTextareaHeight(e.target.scrollHeight);
        return;
      }
      sendMessage();
    } else {
      updateTextareaHeight(e.target.scrollHeight);
    }
  };
  const replaceEmojis = () => {
    textareaRef.current.value = textareaRef.current.value
      .replaceAll(';*', '😘')
      .replaceAll(':*', '😗')
      .replaceAll(':P', '😛')
      .replaceAll(':/', '😕')
      .replaceAll(';(', '😢')
      .replaceAll('-_-', '😑')
      .replaceAll(':O', '😮')
      .replaceAll(':D', '😀')
      .replaceAll(':)', '🙂')
      .replaceAll(':(', '😞')
      .replaceAll('(:', '🙃')
      .replaceAll(';)', '😉')
      .replaceAll('(y)', '👍')
      .replaceAll('(n)', '👎')
      .replaceAll('<3', '❤️')
      .replaceAll('</3', '💔');

  }

  const sendMessage = () => {
    const value = textareaRef.current.value.trim();
    if (!value) {
      return;
    }

    onSendMessage({text: value, images: files, type: MESSAGE_TYPES.MESSAGE});

    setFiles([]);
    textareaRef.current.value = '';
    updateTextareaHeight(40);
  };
  const changeInputFile = e => {
    const filesList = [...e.target.files];
    if (!filesList.length) {
      return;
    }
    const filesToProcess = filesList.length;
    let processedFiles = 0;
    filesList.forEach(file => {
      const reader = new FileReader();

      reader.onload = (ev) => {
        setFiles(prev => [...prev, ev.target.result]);

        processedFiles++;
        if (processedFiles === filesToProcess) {
          e.target.value = '';
        }
      };

      reader.readAsDataURL(file);
    });
  };

  const insertEmoji = emojis => {
    const el = textareaRef.current;
    const [start, end] = [el.selectionStart, el.selectionEnd];
    console.log(start,end)
    el.setRangeText(emojis, start, end, 'end');
  };

  return (
    <div>
      <div className="bottom-bar">
        <label>
          <input type="file" onChange={changeInputFile} multiple="multiple" ref={inputFileRef} accept="image/*"/>
          <Icon>add_photo_alternate</Icon>
        </label>
        <div className="input-field-container">
          {
            files.length
              ? <div className="files-preview">
                {(files || []).map((file, index) => (
                  <div key={index}>
                    <Icon className="delete-image">close</Icon>
                    <Image src={file}/>
                  </div>
                ))}
                <div></div>
              </div>
              : ''
          }
          <div className="text-field-container" style={{height: `${inputContainerHeight}px`}}>
            <textarea onKeyDown={e => keyDown(e)} placeholder="Aa" rows="1" ref={textareaRef}/>
            <EmojiList onInsertEmoji={insertEmoji}/>
          </div>
        </div>
        <button onClick={() => sendMessage()}>
          <Icon>send</Icon>
        </button>
      </div>
    </div>
  );
};

export default ChatMessageInput;
