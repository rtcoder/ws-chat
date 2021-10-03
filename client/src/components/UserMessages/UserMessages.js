import './UserMessages.css';
import Message from "../message/Message";
import Icon from "../../Icon";
import Image from "../../Image";

const UserMessages = ({group, authId}) => {
  const {author, messages} = group;
  const messageBelongsToLoggedUser = author._id === authId;
  return (
    <div className={`user-messages-group ${messageBelongsToLoggedUser ? 'right' : 'left'}`}>
      <div className="user-group-content">
        <div className="user-name">{author.first_name}</div>
        <div className="group">
          {
            messages.length
              ? messages.map((msg, key) =>
                <Message key={key} message={msg} canDelete={messageBelongsToLoggedUser}/>
              )
              : ''
          }
        </div>
      </div>
      <div className="user-icon">
        {
          author.avatar
            ?
            <Image src="https://th.bing.com/th/id/OIP.tb_57ZQ51gNqsOIw1BWX2wHaEo?pid=ImgDet&rs=1"/>
            : <Icon>account_circle</Icon>
        }
      </div>
    </div>
  );
};

export default UserMessages;
