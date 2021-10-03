import './EmojiList.css';
import React, {useEffect, useState} from "react";
import Icon from "../../Icon";
import {fetchApi} from "../../api/fetch-api";

const EmojiList = ({onInsertEmoji}) => {
  const [emojis, setEmojis] = useState([]);
  const [showEmojiList, setShowEmojiList] = useState(false);
  useEffect(() => {
    fetchApi('/json/emoji.json')
      .then(({data}) => {
        setEmojis(data);
        console.log(data);
      });

    // document.addEventListener('click', hideOnClickDocument);
  }, []);

  const send = emoji => {
    onInsertEmoji(emoji);
  };
  //
  // const hideOnClickDocument = e => {
  //   console.log({showEmojiList})
  //   if (!showEmojiList) {
  //     return;
  //   }
  //   const classes = e.path.map(el => el.className).filter(el => !!el);
  //   if (!classes.includes('emojis-container') && !classes.includes('emoji')) {
  //     setShowEmojiList(false);
  //   }
  //   console.log(classes);
  // };

  const toggleEmojis = () => {
    setShowEmojiList(prev => !prev);
  };

  return (
    <div className="emoji">
      <Icon onClick={toggleEmojis}>tag_faces</Icon>
      {
        showEmojiList
          ? <div className="emojis-container">
            {
              emojis.map((emojiType, key) =>
                <div key={key}>
                  <p>{emojiType.name}</p>

                  <div className="list-emoji">
                    {
                      emojiType.list.map((item, index) =>
                        <div key={index} className="emoji-item" onClick={() => send(item)}>{item}</div>
                      )
                    }
                  </div>
                </div>
              )
            }
          </div>
          : ''
      }
    </div>
  );
};

export default EmojiList;
