import './Message.css';
import Icon from "../../Icon";

const Message = ({message}) => {
  return (
    <div className={`message`}
         data-id={message._id}>
      <div className="content-message">
        <div className="text">{message.text}</div>
      </div>

      <div className="options">
        <Icon>emoji_emotions</Icon>
        <Icon>reply</Icon>
      </div>
    </div>
  );
};

export default Message;
