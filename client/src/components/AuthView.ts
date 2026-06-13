import {login, register} from '../lib/api';
import {createElement} from '../lib/dom';

function getResponseMessage(response: any) {
  if (!response?.message) {
    return '';
  }

  const details = response.details?.body?.length
    ? response.details.body.map((field: {message: string}) => field.message).join(', ')
    : '';

  return details.length ? `${response.message}: ${details}` : response.message;
}

export function AuthView(afterLogin: () => void) {
  let viewType = 'login';

  const container = createElement('div', {className: 'auth-container'});
  const forms = createElement('div', {className: 'forms view-login'});
  const loginMessage = createElement('div', {className: 'message'});
  const registerMessage = createElement('div', {className: 'message'});

  const setViewType = (nextViewType: string) => {
    viewType = nextViewType;
    forms.className = `forms view-${viewType}`;
  };

  const loginEmail = createElement('input', {
    type: 'email',
    name: 'email',
    placeholder: 'Email'
  });
  const loginPassword = createElement('input', {
    type: 'password',
    name: 'password',
    placeholder: 'Password'
  });
  const registerFirstName = createElement('input', {
    type: 'text',
    name: 'first_name',
    placeholder: 'First name'
  });
  const registerLastName = createElement('input', {
    type: 'text',
    name: 'last_name',
    placeholder: 'Last name'
  });
  const registerEmail = createElement('input', {
    type: 'email',
    name: 'email',
    placeholder: 'Email'
  });
  const registerPassword = createElement('input', {
    type: 'password',
    name: 'password',
    placeholder: 'Password'
  });

  const loginPanel = createElement('div', {className: 'login'}, [
    createElement('p', {text: 'Sign in'}),
    loginEmail,
    loginPassword,
    loginMessage,
    createElement('div', {className: 'buttons'}, [
      createElement('button', {
        type: 'button',
        text: 'Sign in',
        on: {
          click: async () => {
            const result = await login({
              email: loginEmail.value,
              password: loginPassword.value
            });

            if (result.error) {
              loginMessage.textContent = getResponseMessage(result.error);
              return;
            }

            afterLogin();
          }
        }
      }),
      createElement('p', {
        className: 'link',
        text: 'or Sign up',
        on: {click: () => setViewType('register')}
      })
    ])
  ]);

  const registerPanel = createElement('div', {className: 'register'}, [
    createElement('p', {text: 'Sign up'}),
    registerFirstName,
    registerLastName,
    registerEmail,
    registerPassword,
    registerMessage,
    createElement('div', {className: 'buttons'}, [
      createElement('button', {
        type: 'button',
        text: 'Sign up',
        on: {
          click: async () => {
            const result = await register({
              first_name: registerFirstName.value,
              last_name: registerLastName.value,
              email: registerEmail.value,
              password: registerPassword.value
            });

            registerMessage.textContent = result.error ? getResponseMessage(result.error) : '';
          }
        }
      }),
      createElement('p', {
        className: 'link',
        text: 'or Sign in',
        on: {click: () => setViewType('login')}
      })
    ])
  ]);

  forms.append(loginPanel, registerPanel);
  container.append(createElement('div', {className: 'chat-logo', text: 'WS Chat'}), forms);

  return container;
}
