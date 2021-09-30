import {getMessages, postMessage} from "../../api/messages";
import {mapMessagesToGroups} from "../../utils/messages-helpers";
import Messages from "../messages/Messages";
import {useEffect, useState} from "react";
import {getLoggedUser} from "../../utils/auth-helpers";

function Chat() {
  const authId = getLoggedUser()._id;

  const [messages, setMessages] = useState([]);
  const [messagesPlain, setMessagesPlain] = useState([]);


  const appendMessages = messagesList => {
    const newMessagesPlain = [...messagesPlain, ...messagesList];
    console.log({newMessagesPlain, messagesPlain});
    setMessagesPlain(newMessagesPlain);
    setMessages(mapMessagesToGroups(newMessagesPlain));
  };

  useEffect(() => {
    getMessages()
      .then(({data, error}) => {
        if (error) {
          return [];
        }
        setMessagesPlain(data);
        return mapMessagesToGroups(data);
      })
      .then(messages => setMessages(messages));
  }, []);

  const keyDown = (e) => {
    if (e.key === 'Enter' && !e.ctrlKey) {
      e.preventDefault();
      if (!e.target.value.trim()) {
        return;
      }

      postMessage({text: e.target.value.trim()}).then(val => console.log(val))
        .then(() => {
          appendMessages([{
            author: "John Doe",
            authorId: authId,
            image: null,
            text: e.target.value.trim(),
          }]);
        });
      e.target.value = '';
    }
  };


  return (
    <div className="chat-container">
      Chat container
      <div className="content-wrapper">
        <Messages messagesGroups={messages} authId={authId}/>

        <textarea onKeyDown={keyDown}/>
      </div>
    </div>
  );
}

export default Chat;
