import './EmojiList.css';
import React, {useEffect, useState} from "react";
import Icon from "../../Icon";
import {fetchApi} from "../../api/fetch-api";

const EmojiList = ({onInsertEmoji}) => {
  const [emojis, setEmojis] = useState([]);
  const [showEmojiList, setShowEmojiList] = useState(false);
  const [searchEmoji, setSearchEmoji] = useState('');

  useEffect(() => {
    fetchApi('/json/emojis.json')
      .then(({data}) => {
        const groupsWithSubGroups = [];
        const groups = [...new Set(data.map(({group}) => group))];
        const subGroups = data.map(({group, subGroup}) => ({group, subGroup}));
        groups.forEach(groupName => {
          const groupFilled = {
            name: groupName,
            subgroups: []
          };
          groupFilled.subgroups = [...new Set(
            subGroups
              .filter(({group}) => group === groupName)
              .map(({subGroup}) => subGroup)
          )].map(subGroupName => {
            return {
              subGroupName,
              emojis: data
                .filter(({group, subGroup}) => group === groupName && subGroup === subGroupName)
                .map(({character, unicodeName}) => ({character, unicodeName}))
            };
          });
          groupsWithSubGroups.push(groupFilled);
        });
        setEmojis(groupsWithSubGroups);
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
    setSearchEmoji('');
  };

  const searchEmojiChange = e => {
    setSearchEmoji(e.target.value);
  };

  const emojiMatchToSearch = emoji => emoji.unicodeName.includes(searchEmoji);

  return (
    <div className="emoji">
      <Icon onClick={toggleEmojis}>tag_faces</Icon>
      {
        showEmojiList
          ? <div className="emojis-container">
            <div className="search">
              <input type="text" value={searchEmoji} onChange={searchEmojiChange}/>
            </div>
            {
              emojis.map((category, key) =>
                <div key={key}>
                  <h2>{category.name.replaceAll('-',' ')}</h2>

                  {
                    category.subgroups.map((subGroup, groupKey) =>
                      <div className="sub-group" key={groupKey}>
                        <h3>{subGroup.subGroupName.replaceAll('-',' ')}</h3>

                        <div className="list-emoji">
                          {
                            subGroup.emojis
                              .filter(emojiMatchToSearch)
                              .map((item, index) =>
                                <div key={index}
                                     className="emoji-item"
                                     title={item.unicodeName}
                                     onClick={() => send(item.character)}>{item.character}</div>
                              )
                          }
                        </div>
                      </div>
                    )
                  }

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
