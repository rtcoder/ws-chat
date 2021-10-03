import './Reactions.css';
import Icon from "../../../Icon";

const Reactions = () => {
  return (
    <div className="reactions">
      <Icon className="favorite">favorite</Icon>
      <Icon className="thumb_up">thumb_up</Icon>
      <Icon className="thumb_down">thumb_down</Icon>
    </div>
  );
};

export default Reactions;
