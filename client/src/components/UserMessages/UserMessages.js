import './UserMessages.css';
import Message from "../message/Message";

const UserMessages = ({group, authId}) => {
  return (
    <div className={`user-messages-group ${group.author._id === authId ? 'right' : 'left'}`}>
      <div className="user">{group.author.first_name}</div>
      <div className="group">
        {
          group.messages.length
            ? group.messages.map((msg, key) =>
              <Message key={key} message={msg}/>
            )
            : ''
        }
      </div>
    </div>
  );
};

export default UserMessages;
