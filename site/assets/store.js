// Progress lives in this browser's localStorage and nowhere else.
// Every access is wrapped: private windows and strict settings may refuse storage.

const KEY = 'r2g:progress';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

/** Everything saved for one section, for example 'gym' or 'interview', as { id: value }. */
export function readSection(section) {
  return readAll()[section] ?? {};
}

export function saveResult(section, id, value) {
  try {
    const all = readAll();
    all[section] = { ...(all[section] ?? {}), [id]: value };
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Without storage the site still works; progress just does not survive a reload.
  }
}

/** Small DOM helper: el('p', { class: 'x' }, 'text', childNode). */
export function el(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === false || value === null || value === undefined) continue;
    if (name === 'html') node.innerHTML = value;
    else if (name.startsWith('on')) node.addEventListener(name.slice(2), value);
    else node.setAttribute(name, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}
