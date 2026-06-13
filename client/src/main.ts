import './index.css';
import './components/Auth/Auth.css';
import './components/Chat/Chat.css';
import './components/ChatMessageInput/ChatMessageInput.css';
import './components/EmojiList/EmojiList.css';
import './components/messages/Messages.css';
import './components/UserMessages/UserMessages.css';
import './components/message/Message.css';
import {isAuthenticated} from './lib/auth';
import {render} from './lib/dom';
import {AuthView} from './components/AuthView';
import {ChatView} from './components/ChatView';

const root = document.querySelector('#root');

if (!root) {
  throw new Error('Root element was not found.');
}

const appRoot = root;

function drawApp() {
  render(appRoot, isAuthenticated() ? ChatView() : AuthView(drawApp));
}

drawApp();
