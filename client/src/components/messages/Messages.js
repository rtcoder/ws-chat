import './Messages.css';
import UserMessages from "../UserMessages/UserMessages";

const Messages = ({messagesGroups, authId}) => {
  return (
    <div className="messages">
      {
        messagesGroups.length
          ? messagesGroups.map((group, key) =>
            <UserMessages key={key} group={group} authId={authId}/>
          )
          : ''
      }
    </div>
  );
};

export default Messages;
