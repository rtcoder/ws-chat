import {CreateElementAttrs, CreateElementChildren} from '../types';
import {API_URL} from './config';

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: CreateElementAttrs<K> = {},
  children: CreateElementChildren = []
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

export function resolveMediaSrc(src: string) {
  return src.startsWith('data:image')
    || src.startsWith('data:video')
    || src.startsWith('data:audio')
    || src.startsWith('https://')
    || src.startsWith('http://')
    ? src
    : `${API_URL}/${src}`;
}

export function image(src: string, className = '', alt = '') {
  const normalizedSrc = resolveMediaSrc(src);

  return createElement('img', {
    className,
    src: normalizedSrc,
    alt
  });
}

export function video(src: string, className = '', controls = false) {
  const normalizedSrc = resolveMediaSrc(src);

  return createElement('video', {
    className,
    crossOrigin: 'anonymous',
    src: normalizedSrc,
    controls,
    playsInline: true,
    preload: 'metadata'
  });
}

export function audio(src: string, className = '', controls = false) {
  const normalizedSrc = resolveMediaSrc(src);

  return createElement('audio', {
    className,
    crossOrigin: 'anonymous',
    src: normalizedSrc,
    controls,
    preload: 'metadata'
  });
}

export function render(target: Element, child: Node) {
  target.replaceChildren(child);
}
