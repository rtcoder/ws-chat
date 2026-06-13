import './index.css';
import './styles.css';
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
