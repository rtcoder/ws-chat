import './App.css';
import Auth from "./components/Auth/Auth";
import Chat from "./components/Chat/Chat";
import {getAuthToken, getLoggedUser} from "./utils/auth-helpers";
import {useEffect, useState} from "react";


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useEffect(() => {
    setIsAuthenticated(getLoggedUser() && getAuthToken());
  }, []);

  const afterLogin=()=>{
    setIsAuthenticated(getLoggedUser() && getAuthToken());
  }

  return (
    <div className="App">
      {!isAuthenticated ? <Auth afterLogin={afterLogin}/> : <Chat/>}
    </div>
  );
}

export default App;
