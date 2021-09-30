import './Auth.css';
import React from "react";
import {login, register} from "../../api/auth";
import {setAuthToken, setLoggedUser} from "../../utils/auth-helpers";

class Auth extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      viewType: 'login',
      loginFormData: {
        email: '',
        password: ''
      },
      registerFormData: {
        email: '',
        password: '',
        first_name: '',
        last_name: ''
      },
      loginMessage: '',
      registerMessage: ''
    };

    this.handleLoginFormPasswordChange = this.handleLoginFormPasswordChange.bind(this);
    this.handleLoginFormEmailChange = this.handleLoginFormEmailChange.bind(this);
    this.handleRegisterFormPasswordChange = this.handleRegisterFormPasswordChange.bind(this);
    this.handleRegisterFormEmailChange = this.handleRegisterFormEmailChange.bind(this);
    this.handleRegisterFormFirstNameChange = this.handleRegisterFormFirstNameChange.bind(this);
    this.handleRegisterFormLastNameChange = this.handleRegisterFormLastNameChange.bind(this);
  }

  setViewType(val) {
    this.setState({viewType: val});
  }

  updateRegisterFormData(obj) {
    const registerFormData = this.state.registerFormData;
    Object.assign(registerFormData, obj);
    this.setState({registerFormData});
  }

  updateLoginFormData(obj) {
    const loginFormData = this.state.loginFormData;
    Object.assign(loginFormData, obj);
    this.setState({loginFormData});
  }

  handleLoginFormPasswordChange(e) {
    this.updateLoginFormData({password: e.target.value});
  }

  handleLoginFormEmailChange(e) {
    this.updateLoginFormData({email: e.target.value});
  }

  handleRegisterFormPasswordChange(e) {
    this.updateRegisterFormData({password: e.target.value});
  }

  handleRegisterFormEmailChange(e) {
    this.updateRegisterFormData({email: e.target.value});
  }

  handleRegisterFormFirstNameChange(e) {
    this.updateRegisterFormData({first_name: e.target.value});
  }

  handleRegisterFormLastNameChange(e) {
    this.updateRegisterFormData({last_name: e.target.value});
  }

  login() {
    login(this.state.loginFormData)
      .then(({data, error}) => {
        if (error) {
          console.log(error)
          this.setState({loginMessage: this.getResponseMessage(error)});
          return;
        }
        if (data.token) {
          setAuthToken(data.token);
          const user = data;
          delete user.token;
          delete user.token;
          setLoggedUser(user);
          this.props.afterLogin();
        }
      });
  }

  register() {
    register(this.state.registerFormData)
      .then(({data, error}) => {
        if (error) {
          this.setState({registerMessage: this.getResponseMessage(error)});
          return;
        }
      });
  }

  getResponseMessage(response) {
    if (response.message) {
      let details = '';
      if (response.details?.body?.length) {
        details = response.details.body.map(field => field.message).join(', ');
      }
      return details.length ? `${response.message}: ${details}` : response.message;
    }
    return '';
  }

  render() {
    return (
      <div className="auth-container">
        <div className="chat-logo">WS Chat</div>

        <div className={`forms view-${this.state.viewType}`}>

          <div className="login">
            <p>Sign in</p>
            <input type="email" name="email" placeholder="Email"
                   value={this.state.loginFormData.email}
                   onChange={this.handleLoginFormEmailChange}/>
            <input type="password" name="password" placeholder="Password"
                   value={this.state.loginFormData.password}
                   onChange={this.handleLoginFormPasswordChange}/>
            <div className="message">{this.state.loginMessage}</div>
            <div className="buttons">
              <button type="button" onClick={() => this.login()}>Sign in</button>
              <p className="link" onClick={() => this.setViewType('register')}>or Sign up</p>
            </div>
          </div>

          <div className="register">
            <p>Sign up</p>
            <input type="text" name="first_name" placeholder="First name"
                   value={this.state.registerFormData.first_name}
                   onChange={this.handleRegisterFormFirstNameChange}/>
            <input type="text" name="last_name" placeholder="Last name"
                   value={this.state.registerFormData.last_name}
                   onChange={this.handleRegisterFormLastNameChange}/>
            <input type="email" name="email" placeholder="Email"
                   value={this.state.registerFormData.email}
                   onChange={this.handleRegisterFormEmailChange}/>
            <input type="password" name="password" placeholder="Password"
                   value={this.state.registerFormData.password}
                   onChange={this.handleRegisterFormPasswordChange}/>
            <div className="message">{this.state.registerMessage}</div>
            <div className="buttons">
              <button type="button">Sign up</button>
              <p className="link" onClick={() => this.setViewType('login')}>or Sign in</p>
            </div>
          </div>

        </div>
      </div>
    );
  }
}

export default Auth;
