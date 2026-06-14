const path = require('path');
const fs = require('fs/promises');
const {createMessage, deleteMessage, getLatestMessages, getMessageWithAuthor} = require("../../db/models/messageMethods");
const {sendMessageWS, decodeMessage} = require("../../ws/wsMethods");
const {createImages} = require("../../db/models/imageMethods");

const getMessage = async (req, res, next) => {
  try {
    res.json(await getLatestMessages(30));
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
};

const saveBase64ToFile = (mediaPayloads = []) => {
  const fs = require('fs');
  const path = require('path');
  const {randomUUID} = require('crypto');
  const processedFiles = [];

  try {
    function decodeBase64File(dataString) {
      if (typeof dataString !== 'string') {
        throw new Error('Invalid media payload');
      }

      const matches = dataString.match(/^data:([A-Za-z0-9.+/-]+\/[A-Za-z0-9.+-]+);base64,(.+)$/);

      if (!matches || matches.length !== 3) {
        throw new Error('Invalid media input string');
      }

      return {
        mimeType: matches[1],
        data: Buffer.from(matches[2], 'base64'),
      };
    }

    const mimeToExtension = (mimeType) => {
      const extension = mimeType.split('/')[1]?.toLowerCase() || 'bin';
      const safeExtension = extension.replace(/[^a-z0-9]/g, '');
      return safeExtension || 'bin';
    };

    mediaPayloads.forEach((mediaPayload) => {
      const normalizedMedia = typeof mediaPayload === 'string'
        ? {file: mediaPayload, kind: 'image', name: null, poster: null, mimeType: null}
        : mediaPayload;
      const fileBuffer = decodeBase64File(normalizedMedia.file);
      const uploadsDir = 'uploads';
      const fileExtension = mimeToExtension(fileBuffer.mimeType);
      const fileKind = normalizedMedia.kind || (
        fileBuffer.mimeType.startsWith('video/')
          ? 'video'
          : (fileBuffer.mimeType.startsWith('audio/') ? 'audio' : 'image')
      );
      const uniqueFileName = `${fileKind}-${Date.now()}-${randomUUID()}.${fileExtension}`;
      const uploadedFilePath = path.posix.join(uploadsDir, uniqueFileName);

      fs.writeFileSync(uploadedFilePath, fileBuffer.data);

      let posterPath = null;

      if ((fileKind === 'video' || fileKind === 'audio') && normalizedMedia.poster) {
        const posterBuffer = decodeBase64File(normalizedMedia.poster);
        const posterExtension = mimeToExtension(posterBuffer.mimeType);
        const posterName = `poster-${Date.now()}-${randomUUID()}.${posterExtension}`;
        posterPath = path.posix.join(uploadsDir, posterName);
        fs.writeFileSync(posterPath, posterBuffer.data);
      }

      processedFiles.push({
        path: uploadedFilePath,
        kind: fileKind,
        name: normalizedMedia.name || uniqueFileName,
        poster: posterPath || (fileKind === 'image' ? uploadedFilePath : null),
        mimeType: fileBuffer.mimeType,
        waveform: normalizedMedia.waveform || null,
        duration: normalizedMedia.duration || null,
      });
    });

    return processedFiles;
  } catch (error) {
    processedFiles.forEach((fileItem) => {
      fs.unlink(fileItem.path, (err) => {
        if (err) {
          console.error(err);
        }
      });

      if (fileItem.poster && fileItem.poster !== fileItem.path) {
        fs.unlink(fileItem.poster, (err) => {
          if (err) {
            console.error(err);
          }
        });
      }
    });
    throw error;
  }
};

const postMessage = async (req, res, next) => {
  try {
    const {data} = req.body;


    const dataFromClient = decodeMessage(data);
    const msgData = dataFromClient.data;

    const resultMediaList = saveBase64ToFile(msgData.media || msgData.images || []);

    createImages(resultMediaList, req.user.user_id, savedMedia => {
      createMessage({
        ...msgData,
        media: savedMedia,
        images: savedMedia.map((item) => item.path),
        user_id: req.user.user_id
      }, (message) => {
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

const deleteStoredFiles = async (mediaItems = []) => {
  const filePaths = new Set(
    mediaItems.flatMap((media) => [media.path, media.poster].filter(Boolean))
  );

  await Promise.all([...filePaths].map(async (storedPath) => {
    const absolutePath = path.join(__dirname, '../../', storedPath);

    try {
      await fs.unlink(absolutePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }));
};

const removeMessage = async (req, res) => {
  try {
    const result = await deleteMessage(req.params.id, req.user.user_id);

    if (result.status === 'not_found') {
      return res.status(404).json({message: 'Message not found'});
    }

    if (result.status === 'forbidden') {
      return res.status(403).json({message: 'You can delete only your own messages'});
    }

    await deleteStoredFiles(result.mediaItems);
    sendMessageWS({
      type: 'message_delete',
      data: {
        messageId: result.messageId,
      }
    });

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).send(err);
  }
};


module.exports = {
  getMessage,
  postMessage,
  removeMessage,
};
