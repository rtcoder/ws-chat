const {randomUUID} = require('crypto');
const {db} = require('../db');
const {images} = require('../schema');

const createImages = async (
  mediaItems,
  author_id,
  chatId,
  afterSaveAll = () => {
  }
) => {
  if (!mediaItems.length) {
    afterSaveAll([]);
    return [];
  }

  await db.insert(images).values(mediaItems.map((mediaItem) => ({
    id: randomUUID(),
    path: mediaItem.path,
    type: mediaItem.kind,
    fileName: mediaItem.name || null,
    mimeType: mediaItem.mimeType || null,
    posterPath: mediaItem.poster || null,
    authorId: author_id,
    chatId,
  })));

  afterSaveAll(mediaItems);
  return mediaItems;
};

module.exports = {
  createImages,
};
