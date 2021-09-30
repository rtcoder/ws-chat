const Message = ({message}) => {
  return (
    <div className={`message`}
         data-id={message._id}>
      <div className="text">{message.text}</div>
    </div>
  );
};

export default Message;
