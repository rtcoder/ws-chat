import Message from "../message/Message";

const UserMessages = ({group, authId}) => {
  return (
    <div className={`user-messages-group ${group.author._id === authId ? 'right' : 'left'}`}>
      {
        group.messages.length
          ? group.messages.map((msg, key) =>
            <Message key={key} message={msg}/>
          )
          : ''
      }
    </div>
  );
};

export default UserMessages;
