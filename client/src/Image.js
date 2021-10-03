const Image = ({className, src, alt, onClick}) => {
  if (!src.startsWith('data:image') && !src.startsWith('https://') && !src.startsWith('http://')) {
    src = 'http://localhost:8000/' + src;
  }
  return (
    <img alt={alt} src={src} className={className}
         onClick={onClick}/>
  );
};

export default Image;
