const path = require('path');
const fs = require('fs/promises');
const {createMessage, deleteMessage, getLatestMessages, getMessageWithAuthor, setMessageReaction} = require("../../db/models/messageMethods");
const {sendMessageWS, decodeMessage} = require("../../ws/wsMethods");
const {createImages} = require("../../db/models/imageMethods");
const {getChatByIdForUser, getChatUserIds, getGeneralChatForUser} = require('../../db/models/chatMethods');
const {getUploadsDir, resolveStoredUploadPath, toStoredUploadPath} = require('../../utils/paths');

const getMessage = async (req, res, next) => {
  try {
    const requestedChatId = typeof req.query.chatId === 'string' ? req.query.chatId : null;
    const chat = requestedChatId && requestedChatId !== 'general'
      ? await getChatByIdForUser(requestedChatId, req.user.user_id)
      : await getGeneralChatForUser(req.user.user_id);

    if (!chat) {
      return res.status(404).json({message: 'Chat not found'});
    }

    res.json(await getLatestMessages({limit: 30, chatId: chat.id}));
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
};

const resolveMessageChat = async (requestedChatId, userId) => {
  if (!requestedChatId || requestedChatId === 'general') {
    return getGeneralChatForUser(userId);
  }

  return getChatByIdForUser(requestedChatId, userId);
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
      const fileExtension = mimeToExtension(fileBuffer.mimeType);
      const fileKind = normalizedMedia.kind || (
        fileBuffer.mimeType.startsWith('video/')
          ? 'video'
          : (fileBuffer.mimeType.startsWith('audio/') ? 'audio' : 'image')
      );
      const uniqueFileName = `${fileKind}-${Date.now()}-${randomUUID()}.${fileExtension}`;
      const uploadedFilePath = toStoredUploadPath(uniqueFileName);

      fs.mkdirSync(getUploadsDir(), {recursive: true});
      fs.writeFileSync(resolveStoredUploadPath(uploadedFilePath), fileBuffer.data);

      let posterPath = null;

      if ((fileKind === 'video' || fileKind === 'audio') && normalizedMedia.poster) {
        const posterBuffer = decodeBase64File(normalizedMedia.poster);
        const posterExtension = mimeToExtension(posterBuffer.mimeType);
        const posterName = `poster-${Date.now()}-${randomUUID()}.${posterExtension}`;
        posterPath = toStoredUploadPath(posterName);
        fs.writeFileSync(resolveStoredUploadPath(posterPath), posterBuffer.data);
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
      fs.unlink(resolveStoredUploadPath(fileItem.path), (err) => {
        if (err) {
          console.error(err);
        }
      });

      if (fileItem.poster && fileItem.poster !== fileItem.path) {
        fs.unlink(resolveStoredUploadPath(fileItem.poster), (err) => {
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
    const chat = await resolveMessageChat(msgData.chatId || null, req.user.user_id);

    if (!chat) {
      return res.status(404).json({message: 'Chat not found'});
    }

    const resultMediaList = saveBase64ToFile(msgData.media || msgData.images || []);
    const savedMedia = await createImages(resultMediaList, req.user.user_id, chat.id);
    const message = await createMessage({
      ...msgData,
      chatId: chat.id,
      media: savedMedia,
      images: savedMedia.map((item) => item.path),
      user_id: req.user.user_id
    });
    const result = await getMessageWithAuthor(message._id);
    const recipientIds = await getChatUserIds(chat.id);
    sendMessageWS(result, recipientIds);

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
    const absolutePath = resolveStoredUploadPath(storedPath);

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
    const recipientIds = await getChatUserIds(result.chatId);
    sendMessageWS({
      type: 'message_delete',
      data: {
        messageId: result.messageId,
      }
    }, recipientIds);

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).send(err);
  }
};

const reactToMessage = async (req, res) => {
  try {
    const {type} = req.body;

    if (!['👍', '❤️', '😂', '😮', '😢', '🔥'].includes(type)) {
      return res.status(400).json({message: 'Unsupported reaction'});
    }

    const result = await setMessageReaction(req.params.id, req.user.user_id, type);

    if (result.status === 'not_found') {
      return res.status(404).json({message: 'Message not found'});
    }

    if (result.status === 'forbidden') {
      return res.status(403).json({message: 'You cannot react in this chat'});
    }

    const recipientIds = await getChatUserIds(result.chatId);
    const payload = {
      type: 'message_reaction',
      data: {
        messageId: result.messageId,
        chatId: result.chatId,
        reactions: result.reactions,
      }
    };

    sendMessageWS(payload, recipientIds);
    return res.json(payload.data);
  } catch (err) {
    console.error(err);
    return res.status(500).send(err);
  }
};


module.exports = {
  getMessage,
  postMessage,
  reactToMessage,
  removeMessage,
};
