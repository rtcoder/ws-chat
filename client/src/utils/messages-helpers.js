export const mapMessagesToGroups = messages => {
  const groups = [];

  const lastGroup = () => {
    return groups[groups.length - 1];
  };

  const addToLastGroup = (val) => {
    groups[groups.length - 1].messages.push(val);
  };

  const createGroup = (author) => {
    groups.push({author, messages: []});
  }

  messages.forEach(message => {
    if (!groups.length) {
      createGroup(message.author);
    }

    const lastGroupVal = lastGroup();

    if (!lastGroupVal?.messages.length) {
      addToLastGroup(message);
    } else {

      if (lastGroupVal.author._id !== message.author._id) {
        createGroup(message.author);
      }

      addToLastGroup(message);
    }
  });
  console.log({groups});
  return groups;
};
