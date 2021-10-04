const {ImageModel} = require("../../db/db");
const {ObjectId} = require("mongodb");

const createImages = async (
  images,
  author_id,
  afterSaveAll = (imagesList) => {
  }
) => {

  const imagesToProcess = images.length;
  if (!imagesToProcess) {
    afterSaveAll([]);
    return;
  }
  let processedImages = 0;
  const imagesToReturn = [];
  for (const img of images) {
    await new ImageModel({
      path: img,
      author: new ObjectId(author_id)
    }).save((err, result) => {
      processedImages++;
      imagesToReturn.push(img);
      if (imagesToProcess === processedImages) {
        afterSaveAll(imagesToReturn);
      }
    });
  }
};

module.exports = {
  createImages,
};
