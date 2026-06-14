import {createElement, icon} from '../lib/dom';
import type {EmojiGroup, EmojiItem} from '../types';

function groupEmojis(data: EmojiItem[]) {
  const groups = [...new Set(data.map(({group}) => group))];

  return groups.map<EmojiGroup>((groupName) => {
    const subgroups = [...new Set(
      data.filter(({group}) => group === groupName).map(({subGroup}) => subGroup)
    )];

    return {
      name: groupName,
      subgroups: subgroups.map((subGroupName) => ({
        name: subGroupName,
        emojis: data
          .filter(({group, subGroup}) => group === groupName && subGroup === subGroupName)
          .map(({character, unicodeName}) => ({character, unicodeName}))
      }))
    };
  });
}

export function EmojiPicker(onInsertEmoji: (emoji: string) => void) {
  let groups: EmojiGroup[] = [];
  let isOpen = false;
  let searchValue = '';

  const wrapper = createElement('div', {className: 'emoji'});
  const trigger = icon('tag_faces');
  const panel = createElement('div', {className: 'emojis-container'});

  const closePanel = () => {
    isOpen = false;
    panel.remove();
  };

  const drawPanel = () => {
    if (!isOpen) {
      panel.remove();
      return;
    }

    const search = createElement('input', {
      type: 'text',
      value: searchValue,
      on: {
        input: (event) => {
          searchValue = (event.target as HTMLInputElement).value;
          drawPanel();
        }
      }
    });

    const content = groups.map((category) => createElement('div', {}, [
      createElement('h2', {text: category.name.replaceAll('-', ' ')}),
      ...category.subgroups.map((subGroup) => createElement('div', {className: 'sub-group'}, [
        createElement('h3', {text: subGroup.name.replaceAll('-', ' ')}),
        createElement('div', {className: 'list-emoji'}, subGroup.emojis
          .filter((emojiItem) => emojiItem.unicodeName.includes(searchValue))
          .map((emojiItem) => createElement('div', {
            className: 'emoji-item',
            title: emojiItem.unicodeName,
            text: emojiItem.character,
            on: {
              click: () => {
                onInsertEmoji(emojiItem.character);
                closePanel();
              }
            }
          })))
      ]))
    ]));

    panel.replaceChildren(createElement('div', {className: 'search'}, [search]), ...content);
    wrapper.append(panel);
    search.focus();
  };

  document.addEventListener('pointerdown', (event) => {
    const target = event.target;

    if (!isOpen || !(target instanceof Node)) {
      return;
    }

    if (!wrapper.contains(target)) {
      closePanel();
    }
  });

  trigger.addEventListener('click', () => {
    isOpen = !isOpen;
    searchValue = '';
    drawPanel();
  });

  fetch('/json/emojis.json')
    .then((response) => response.json())
    .then((data: EmojiItem[]) => {
      groups = groupEmojis(data);
      drawPanel();
    });

  wrapper.append(trigger);
  return wrapper;
}
