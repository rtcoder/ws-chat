const Icon = ({className, children, onClick}) => {
  className = ("icon material-icons " + (className || '')).trim();
  return (
    <i className={className}
       onClick={onClick}>{children}</i>
  );
};

export default Icon;
