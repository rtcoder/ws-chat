const path = require('path');

const getRuntimeRoot = () => path.resolve(process.env.WS_CHAT_ROOT || process.cwd());

const getUploadsDir = () => path.resolve(process.env.UPLOADS_DIR || path.join(getRuntimeRoot(), 'uploads'));

const getClientDistDir = () => path.resolve(process.env.CLIENT_DIST_DIR || path.join(getRuntimeRoot(), 'public'));

const toStoredUploadPath = (fileName) => path.posix.join('uploads', fileName);

const resolveStoredUploadPath = (storedPath) => {
  const normalizedPath = String(storedPath || '').replace(/\\/g, '/');
  const uploadPrefix = 'uploads/';
  const relativePath = normalizedPath.startsWith(uploadPrefix)
    ? normalizedPath.slice(uploadPrefix.length)
    : normalizedPath;

  return path.join(getUploadsDir(), relativePath);
};

module.exports = {
  getClientDistDir,
  getRuntimeRoot,
  getUploadsDir,
  resolveStoredUploadPath,
  toStoredUploadPath,
};
