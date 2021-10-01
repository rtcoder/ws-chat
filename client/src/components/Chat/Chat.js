import './Chat.css';
import {getMessages, postMessage} from "../../api/messages";
import {mapMessagesToGroups} from "../../utils/messages-helpers";
import Messages from "../messages/Messages";
import React from "react";
import {getAuthToken, getLoggedUser} from "../../utils/auth-helpers";
import {w3cwebsocket as W3CWebSocket} from "websocket";
import Icon from "../../Icon";


class Chat extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      messages: [],
      messagesPlain: [],
      textareaRows: 1,
      inputContainerHeight: 40,
      authId: getLoggedUser()._id,
      clientWs: null
    };
    this.messagesRef = React.createRef();
  }

  startWs() {
    let client = new W3CWebSocket(`ws://127.0.0.1:8001?token=${getAuthToken()}`);

    client.onopen = () => {
      console.info('WebSocket Client Connected');
    };
    client.onmessage = ({data}) => {
      const decoded = JSON.parse(this.decodeMessage(data));
      this.appendMessages([decoded]);
    };
    client.onclose = () => {
      console.info('Websocket Client Disconnected');
      setTimeout(() => {
        this.startWs();
      }, 3000);
    };

    if (this.state.clientWs) {
      this.state.clientWs.close();
    }

    this.setState({clientWs: client});
  }

  componentDidMount() {
    this.startWs();

    getMessages()
      .then(({data, error}) => {
        const messagesPlain = data;
        if (error) {
          return [];
        }
        this.setState({messagesPlain});
        return mapMessagesToGroups(messagesPlain);
      })
      .then(messages => this.setState({messages}))
      .then(() => this.scrollMessagesDown());
  }

  decodeMessage(message) {
    return decodeURIComponent(
      escape(
        Buffer.from(message, 'base64').toString()
      )
    );
  };

  appendMessages(messagesList) {
    const newMessagesPlain = [...this.state.messagesPlain, ...messagesList];
    this.setState({messagesPlain: newMessagesPlain});
    this.setState({messages: mapMessagesToGroups(newMessagesPlain)});

    this.scrollMessagesDown();
  }

  scrollMessagesDown() {
    this.messagesRef.current.scrollTop = this.messagesRef.current.scrollHeight;
  }

  updateTextareaHeight(height) {
    height = height <= 200
      ? (height > 40 ? height : 40)
      : 200;
    this.setState({inputContainerHeight: height});
  }

  async keyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();

      if (e.shiftKey) {
        e.target.value = e.target.value + '\n';
        this.updateTextareaHeight(e.target.scrollHeight);
        return;
      }

      if (!e.target.value.trim()) {
        return;
      }

      await postMessage({text: e.target.value.trim()});

      // client.send(JSON.stringify({text: e.target.value.trim()}));

      e.target.value = '';
      this.updateTextareaHeight(40);
    } else {
      this.updateTextareaHeight(e.target.scrollHeight);
    }
  };

  render() {
    const {messages, authId, textareaRows, inputContainerHeight} = this.state;
    return (
      <div className="chat-container">
        <div className="content-wrapper">
          <div className="chats-list">
            lista
          </div>
          <div className="chat">

            <Messages messagesGroups={messages} authId={authId} refMessages={this.messagesRef}/>

            <div className="bottom-bar">

              <div className="input-field-container" style={{height: `${inputContainerHeight}px`}}>
                <textarea onKeyDown={e => this.keyDown(e)} placeholder="Aa" rows={textareaRows}/>
              </div>
              <button>
                <Icon>send</Icon>
              </button>
            </div>

          </div>

          <div className="chat-info">
            info
          </div>
        </div>
      </div>
    );
  }
}

export default Chat;
