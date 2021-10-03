import './Message.css';
import Icon from "../../Icon";
import Reactions from "./Reactions/Reactions";
import React from "react";
import Image from "../../Image";

const Message = ({message}) => {
  return (
    <div className={`message`}
         data-id={message._id}>
      <div className="content-message">
        <div className={`text ${message.isOnlyEmoji ? 'only-emoji' : ''}`}>{message.text}</div>
        {
          message.images.length
            ? <div className="images">
              {message.images.map((file, index) => <Image key={index} src={file}/>)}
            </div>
            : ''
        }
      </div>

      <div className="options">
        {/*<Reactions/>*/}
        <Icon>reply</Icon>
        <Icon>delete</Icon>
      </div>
    </div>
  );
};

export default Message;
