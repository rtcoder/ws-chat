import './Message.css';
import Icon from "../../Icon";
import React from "react";
import Image from "../../Image";

const Message = ({message, canDelete}) => {
  let imagesDivClassName = "images";
  const imagesLength = message.images.length;
  if (imagesLength) {
    const classes = {
      c1: 'i1',
      c2: 'i2',
      c4: 'i4'
    };
    imagesDivClassName += ` ${classes[`c${imagesLength}`] || ''}`;
    imagesDivClassName = imagesDivClassName.trim();
  }
  return (
    <div className={`message`}
         data-id={message._id}>
      <div className="content-message">
        <div className={`text ${message.isOnlyEmoji ? 'only-emoji' : ''}`}>{message.text}</div>
        {
          message.images.length
            ? <div className={imagesDivClassName}>
              {message.images.map((file, index) =>
                <div key={index} className="image-handler">
                  <Image src={file}/>
                </div>
              )}
            </div>
            : ''
        }
      </div>

      <div className="options">
        {/*<Reactions/>*/}
        <Icon>reply</Icon>
        {canDelete ? <Icon>delete</Icon> : ''}
      </div>
    </div>
  );
};

export default Message;
