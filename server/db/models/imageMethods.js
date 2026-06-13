const {randomUUID} = require('crypto');
const {db} = require('../db');
const {images} = require('../schema');

const createImages = async (
  imagePaths,
  author_id,
  afterSaveAll = () => {
  }
) => {
  if (!imagePaths.length) {
    afterSaveAll([]);
    return [];
  }

  await db.insert(images).values(imagePaths.map((imagePath) => ({
    id: randomUUID(),
    path: imagePath,
    authorId: author_id,
  })));

  afterSaveAll(imagePaths);
  return imagePaths;
};

module.exports = {
  createImages,
};
