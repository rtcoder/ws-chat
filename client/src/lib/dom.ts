import {API_URL} from './config';

type Attrs<K extends keyof HTMLElementTagNameMap> = Partial<HTMLElementTagNameMap[K]> & {
  className?: string;
  text?: string;
  attrs?: Record<string, string>;
  on?: Partial<Record<keyof HTMLElementEventMap, EventListener>>;
};

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: Attrs<K> = {},
  children: Array<Node | string | null | undefined> = []
) {
  const node = document.createElement(tag);
  const {text, attrs, on, ...props} = options;

  Object.assign(node, props);

  if (text !== undefined) {
    node.textContent = text;
  }

  Object.entries(attrs || {}).forEach(([name, value]) => {
    node.setAttribute(name, value);
  });

  Object.entries(on || {}).forEach(([name, listener]) => {
    if (listener) {
      node.addEventListener(name, listener);
    }
  });

  children.forEach((child) => {
    if (child !== null && child !== undefined) {
      node.append(child);
    }
  });

  return node;
}

export function icon(name: string, className = '') {
  return createElement('i', {
    className: `icon material-icons ${className}`.trim(),
    text: name
  });
}

export function image(src: string, className = '', alt = '') {
  const normalizedSrc = src.startsWith('data:image') || src.startsWith('https://') || src.startsWith('http://')
    ? src
    : `${API_URL}/${src}`;

  return createElement('img', {
    className,
    src: normalizedSrc,
    alt
  });
}

export function render(target: Element, child: Node) {
  target.replaceChildren(child);
}
