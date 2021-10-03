import './Chat.css';
import {getMessages,postMessage} from "../../api/messages";
import {mapMessagesToGroups} from "../../utils/messages-helpers";
import Messages from "../messages/Messages";
import React from "react";
import {getAuthToken, getLoggedUser} from "../../utils/auth-helpers";
import {w3cwebsocket as W3CWebSocket} from "websocket";
import ChatMessageInput from "../ChatMessageInput/ChatMessageInput";


const WS_ACTIONS = {
  MESSAGE_ADD: 'message_add',
  MESSAGE_DELETE: 'message_delete',
  REACTION_ADD: 'reaction_add',
};

class Chat extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      messages: [],
      messagesPlain: [],
      authId: getLoggedUser()._id,
      clientWs: null
    };
    this.messagesRef = React.createRef();
  }

  startWs() {
    const client = new W3CWebSocket(`ws://127.0.0.1:8001?t=${getAuthToken()}`);

    client.onopen = () => {
      console.info('WebSocket Client Connected');
    };
    client.onmessage = ({data}) => {
      const decoded = this.decodeMessage(data);
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
    return JSON.parse(
      decodeURIComponent(
        escape(
          Buffer.from(message, 'base64').toString()
        )
      )
    );
  }

  encodeMessage(message) {
    return Buffer.from(
      unescape(
        encodeURIComponent(
          JSON.stringify(message)
        )
      )
    ).toString('base64');
  }

  appendMessages(messagesList) {
    const newMessagesPlain = [...this.state.messagesPlain, ...messagesList];
    this.setState({messagesPlain: newMessagesPlain});
    this.setState({messages: mapMessagesToGroups(newMessagesPlain)});

    this.scrollMessagesDown();
  }

  scrollMessagesDown() {
    this.messagesRef.current.scrollTop = this.messagesRef.current.scrollHeight;
  }

  sendMessage(value) {
    postMessage(this.encodeMessage({
      type: WS_ACTIONS.MESSAGE_ADD,
      data: value
    }));
    // this.state.clientWs.send(this.encodeMessage({
    //   type: WS_ACTIONS.MESSAGE_ADD,
    //   data: value
    // }));
  }

  render() {
    const {messages, authId} = this.state;
    return (
      <div className="chat-container">
        <div className="content-wrapper">
          <div className="chats-list">
            lista
          </div>
          <div className="chat">

            <Messages messagesGroups={messages} authId={authId} refMessages={this.messagesRef}/>

            <ChatMessageInput onSendMessage={value => this.sendMessage(value)}/>

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
