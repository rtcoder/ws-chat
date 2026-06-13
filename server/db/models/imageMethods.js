const {randomUUID} = require('crypto');
const {pgQuery} = require('../db');

const createImages = async (
  images,
  author_id,
  afterSaveAll = () => {
  }
) => {
  if (!images.length) {
    afterSaveAll([]);
    return [];
  }

  await Promise.all(images.map((img) => pgQuery(`
    INSERT INTO images (id, path, author_id)
    VALUES ($1, $2, $3)
  `, [randomUUID(), img, author_id])));

  afterSaveAll(images);
  return images;
};

module.exports = {
  createImages,
};
