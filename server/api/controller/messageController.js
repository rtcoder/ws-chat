const {Message, ImageModel} = require("../../db/db");
const {createMessage, getMessageWithAuthor} = require("../../db/models/messageMethods");
const {sendMessageWS, decodeMessage} = require("../../ws/wsMethods");
const {ObjectId} = require("mongodb");
const path = require("path");
const {createImages} = require("../../db/models/imageMethods");

const getMessage = async (req, res, next) => {
  try {
    res.json(
      (await Message.find()
        .populate('author', 'first_name last_name avatar')
        .sort({$natural: -1}).limit(30)
        .exec()).reverse()
    );
  } catch (err) {
    console.error(err);
  }
};

const saveBase64ToFile = imagesB64 => {
  const fs = require('fs');
  const processedImages = [];
  // Save base64 image to disk
  try {
    // Decoding base-64 image
    // Source: http://stackoverflow.com/questions/20267939/nodejs-write-base64-image-file
    function decodeBase64Image(dataString) {
      const matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const response = {};

      if (matches.length !== 3) {
        return new Error('Invalid input string');
      }

      response.type = matches[1];
      response.data = new Buffer(matches[2], 'base64');

      return response;
    }

    // Regular expression for image type:
    // This regular image extracts the "jpeg" from "image/jpeg"
    const imageTypeRegularExpression = /\/(.*?)$/;

    imagesB64.forEach(base64Data => {
      const imageBuffer = decodeBase64Image(base64Data);
      const userUploadedFeedMessagesLocation = 'uploads/';

      // This variable is actually an array which has 5 values,
      // The [1] value is the real image extension
      const imageTypeDetected = imageBuffer.type.match(imageTypeRegularExpression);

      const uniqueRandomImageName = 'image-' + Date.now() + '.' + imageTypeDetected[1];

      const userUploadedImagePath = userUploadedFeedMessagesLocation + uniqueRandomImageName;

      fs.writeFileSync(userUploadedImagePath, imageBuffer.data);
      processedImages.push(userUploadedImagePath);
    });

    return processedImages;
  } catch (error) {
    processedImages.forEach(image => {
      fs.unlink(image, (err) => {
        if (err) {
          console.error(err);
        }
      });
    });
    throw error;
  }
};

const postMessage = async (req, res, next) => {
  try {
    const {data} = req.body;


    const dataFromClient = decodeMessage(data);
    const msgData = dataFromClient.data;

    const resultImagesPathList = saveBase64ToFile((msgData.images || []));

    createImages(resultImagesPathList, data.user_id, savedImages => {
      createMessage({...msgData, images: savedImages, user_id: req.user.user_id}, (message) => {
        getMessageWithAuthor(message._id).then((result) => {
          sendMessageWS(result);
        });
      });
    });

    res.status(201).send();
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
};


module.exports = {
  getMessage,
  postMessage,
};
