// A small re-implementation of Playwright's locator rules, so locators can be practised in the
// browser with nothing installed. It covers the getBy* methods, locator() with CSS or XPath,
// filter(), first/last/nth, and()/or(). It is checked against real Playwright in
// site/tests/site.spec.ts, but it is an approximation: the koans in this repo run the real thing.

const SKIPPED_FOR_TEXT = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);

// Roles whose accessible name can come from their text content.
const NAME_FROM_CONTENT = new Set([
  'button', 'cell', 'checkbox', 'columnheader', 'gridcell', 'heading', 'link', 'menuitem',
  'menuitemcheckbox', 'menuitemradio', 'option', 'radio', 'row', 'rowheader', 'switch', 'tab',
  'tooltip', 'treeitem',
]);

const LABELABLE = new Set(['BUTTON', 'METER', 'OUTPUT', 'PROGRESS', 'SELECT', 'TEXTAREA']);

const ACTIONS = [
  'click', 'dblclick', 'fill', 'check', 'uncheck', 'hover', 'press', 'type', 'selectOption',
  'setInputFiles', 'focus', 'tap', 'textContent', 'innerText', 'isVisible', 'count', 'all',
];

const normalise = (text) => (text ?? '').replace(/\s+/g, ' ').trim();

function elementText(element) {
  if (SKIPPED_FOR_TEXT.has(element.nodeName)) return '';
  if (element.nodeName === 'INPUT' && ['button', 'submit', 'reset'].includes(element.type)) return element.value;
  let text = '';
  for (const node of element.childNodes) {
    if (node.nodeType === 3) text += node.nodeValue;
    else if (node.nodeType === 1) text += elementText(node);
  }
  return text;
}

/** Builds a predicate from a string or RegExp, the way getByText and friends interpret it. */
function textMatcher(expected, exact) {
  if (expected instanceof RegExp) return (text) => new RegExp(expected.source, expected.flags.replace('g', '')).test(text);
  const wanted = normalise(String(expected));
  if (exact) return (text) => normalise(text) === wanted;
  const lower = wanted.toLowerCase();
  return (text) => normalise(text).toLowerCase().includes(lower);
}

function isHiddenForAria(element) {
  const view = element.ownerDocument.defaultView;
  if (view.getComputedStyle(element).visibility !== 'visible') return true;
  for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
    if (node.getAttribute('aria-hidden') === 'true') return true;
    if (view.getComputedStyle(node).display === 'none') return true;
  }
  return false;
}

function hasExplicitName(element) {
  return !!(element.getAttribute('aria-label')?.trim() || element.getAttribute('aria-labelledby')?.trim());
}

function implicitRole(element) {
  const tag = element.localName;
  switch (tag) {
    case 'a':
    case 'area':
      return element.hasAttribute('href') ? 'link' : null;
    case 'button':
      return 'button';
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
      return 'heading';
    case 'img':
      return element.getAttribute('alt') === '' && !hasExplicitName(element) && !element.title ? 'presentation' : 'img';
    case 'input': {
      const type = (element.getAttribute('type') ?? 'text').toLowerCase();
      if (['button', 'image', 'reset', 'submit'].includes(type)) return 'button';
      if (type === 'checkbox' || type === 'radio') return type;
      if (type === 'range') return 'slider';
      if (type === 'number') return 'spinbutton';
      if (type === 'search') return element.hasAttribute('list') ? 'combobox' : 'searchbox';
      if (['email', 'tel', 'text', 'url'].includes(type)) return element.hasAttribute('list') ? 'combobox' : 'textbox';
      if (type === 'password') return 'textbox'; // no ARIA role in the spec, but Playwright treats it as a textbox
      return null; // file, date, colour, hidden… have no role
    }
    case 'textarea':
      return 'textbox';
    case 'select':
      return element.multiple || element.size > 1 ? 'listbox' : 'combobox';
    case 'option':
      return 'option';
    case 'ul': case 'ol': case 'menu':
      return 'list';
    case 'li':
      return element.parentElement?.matches('ul, ol, menu') ? 'listitem' : null;
    case 'nav':
      return 'navigation';
    case 'main':
      return 'main';
    case 'header':
      return element.closest('article, aside, main, nav, section') ? null : 'banner';
    case 'footer':
      return element.closest('article, aside, main, nav, section') ? null : 'contentinfo';
    case 'section':
      return hasExplicitName(element) ? 'region' : null;
    case 'form':
      return hasExplicitName(element) ? 'form' : null;
    case 'article':
      return 'article';
    case 'aside':
      return 'complementary';
    case 'dialog':
      return 'dialog';
    case 'fieldset':
      return 'group';
    case 'table':
      return 'table';
    case 'thead': case 'tbody': case 'tfoot':
      return 'rowgroup';
    case 'tr':
      return 'row';
    case 'td':
      return 'cell';
    case 'th':
      return element.getAttribute('scope') === 'row' ? 'rowheader' : 'columnheader';
    case 'p':
      return 'paragraph';
    case 'hr':
      return 'separator';
    case 'output':
      return 'status';
    case 'progress':
      return 'progressbar';
    default:
      return null;
  }
}

function roleOf(element) {
  const explicit = (element.getAttribute('role') ?? '').trim().split(/\s+/)[0];
  return explicit || implicitRole(element);
}

/** Visible text of an element for naming purposes: skips hidden parts, uses alt text for images. */
function contentName(element) {
  let text = '';
  for (const node of element.childNodes) {
    if (node.nodeType === 3) {
      text += node.nodeValue;
    } else if (node.nodeType === 1 && !SKIPPED_FOR_TEXT.has(node.nodeName) && !isHiddenForAria(node)) {
      if (node.localName === 'img') text += ` ${node.getAttribute('alt') ?? ''} `;
      else if (node.getAttribute('aria-label')?.trim()) text += ` ${node.getAttribute('aria-label')} `;
      else text += contentName(node);
      if (/^(div|p|li|tr|td|th|h[1-6]|br)$/.test(node.localName)) text += ' ';
    }
  }
  return text;
}

function accessibleName(element, role) {
  const doc = element.ownerDocument;
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const parts = labelledBy.split(/\s+/).map((id) => doc.getElementById(id)).filter(Boolean);
    if (parts.length) return normalise(parts.map((part) => contentName(part)).join(' '));
  }
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel?.trim()) return normalise(ariaLabel);

  const tag = element.nodeName;
  if (tag === 'INPUT' && ['button', 'submit', 'reset'].includes(element.type)) {
    return normalise(element.value || (element.type === 'submit' ? 'Submit' : element.type === 'reset' ? 'Reset' : ''));
  }
  if ((tag === 'INPUT' && element.type !== 'hidden') || LABELABLE.has(tag)) {
    const labels = [...(element.labels ?? [])];
    if (labels.length) return normalise(labels.map((label) => contentName(label)).join(' '));
  }
  if (tag === 'IMG') {
    const alt = element.getAttribute('alt');
    if (alt?.trim()) return normalise(alt);
  }
  if (tag === 'FIELDSET') {
    const legend = element.querySelector(':scope > legend');
    if (legend) return normalise(contentName(legend));
  }
  if (tag === 'TABLE') {
    const caption = element.querySelector(':scope > caption');
    if (caption) return normalise(contentName(caption));
  }
  if (NAME_FROM_CONTENT.has(role)) {
    const fromContent = normalise(contentName(element));
    if (fromContent) return fromContent;
  }
  if (element.title?.trim()) return normalise(element.title);
  if ((tag === 'INPUT' || tag === 'TEXTAREA') && element.placeholder?.trim()) return normalise(element.placeholder);
  return '';
}

function labelsOf(element) {
  const doc = element.ownerDocument;
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const parts = labelledBy.split(/\s+/).map((id) => doc.getElementById(id)).filter(Boolean);
    if (parts.length) return parts.map((part) => elementText(part));
  }
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel !== null && ariaLabel.trim()) return [ariaLabel];
  const tag = element.nodeName;
  if (LABELABLE.has(tag) || (tag === 'INPUT' && element.type !== 'hidden')) {
    return [...(element.labels ?? [])].map((label) => elementText(label));
  }
  return [];
}

const descendants = (scope) => [...scope.querySelectorAll('*')];

function inDocumentOrder(elements) {
  const unique = [...new Set(elements)];
  return unique.sort((a, b) => (a === b ? 0 : a.compareDocumentPosition(b) & 4 ? -1 : 1));
}

class GymLocator {
  constructor(doc, steps, used) {
    this._doc = doc;
    this._steps = steps;
    this._used = used;
    for (const action of ACTIONS) {
      this[action] = () => {
        throw new Error(`Leave out .${action}(): type only the locator. The gym shows what it matches.`);
      };
    }
  }

  /** The elements this locator matches right now, in document order. */
  resolve(scopes = [this._doc]) {
    let current = scopes;
    for (const step of this._steps) current = step(current);
    return current;
  }

  /** Names of the locator methods that were used to build this locator. */
  get used() {
    return [...this._used];
  }

  _then(name, step, extraUsed = []) {
    return new GymLocator(this._doc, [...this._steps, step], new Set([...this._used, name, ...extraUsed]));
  }

  _query(name, matchesElement) {
    return this._then(name, (scopes) =>
      inDocumentOrder(scopes.flatMap((scope) => descendants(scope).filter(matchesElement))),
    );
  }

  getByRole(role, options = {}) {
    if (typeof role !== 'string') throw new Error('getByRole needs a role name, for example getByRole(\'button\')');
    const nameMatches = options.name === undefined ? null : textMatcher(options.name, options.exact);
    return this._query('getByRole', (element) => {
      if (roleOf(element) !== role) return false;
      if (!options.includeHidden && isHiddenForAria(element)) return false;
      if (options.level !== undefined && Number(element.getAttribute('aria-level') ?? element.localName.slice(1)) !== options.level) return false;
      if (options.checked !== undefined && !!element.checked !== options.checked && String(options.checked) !== element.getAttribute('aria-checked')) return false;
      if (options.disabled !== undefined && !!element.disabled !== options.disabled) return false;
      if (options.expanded !== undefined && String(options.expanded) !== element.getAttribute('aria-expanded')) return false;
      if (options.selected !== undefined && !!element.selected !== options.selected) return false;
      return nameMatches ? nameMatches(accessibleName(element, role)) : true;
    });
  }

  getByText(text, options = {}) {
    const matches = textMatcher(text, options.exact);
    return this._query('getByText', (element) => {
      if (SKIPPED_FOR_TEXT.has(element.nodeName) || element.closest('head')) return false;
      if (!matches(elementText(element))) return false;
      // Only the innermost element that contains the text counts.
      return ![...element.children].some((child) => matches(elementText(child)));
    });
  }

  getByLabel(text, options = {}) {
    const matches = textMatcher(text, options.exact);
    return this._query('getByLabel', (element) => labelsOf(element).some((label) => matches(label)));
  }

  _byAttribute(method, attribute, value, options = {}) {
    const matches = textMatcher(value, options.exact);
    return this._query(method, (element) => element.hasAttribute(attribute) && matches(element.getAttribute(attribute)));
  }

  getByPlaceholder(text, options) {
    return this._byAttribute('getByPlaceholder', 'placeholder', text, options);
  }

  getByAltText(text, options) {
    return this._byAttribute('getByAltText', 'alt', text, options);
  }

  getByTitle(text, options) {
    return this._byAttribute('getByTitle', 'title', text, options);
  }

  getByTestId(testId) {
    const matches = testId instanceof RegExp ? textMatcher(testId) : (value) => value === String(testId);
    return this._query('getByTestId', (element) => element.hasAttribute('data-testid') && matches(element.getAttribute('data-testid')));
  }

  locator(selector, options) {
    if (selector instanceof GymLocator) {
      return this._then('locator', (scopes) => inDocumentOrder(scopes.flatMap((scope) => selector.resolve([scope]))), selector.used);
    }
    if (typeof selector !== 'string') throw new Error('locator() needs a CSS or XPath selector as a string');
    let chained;
    if (selector.startsWith('xpath=') || selector.startsWith('//') || selector.startsWith('..')) {
      const expression = selector.replace(/^xpath=/, '');
      chained = this._then('xpath', (scopes) =>
        inDocumentOrder(
          scopes.flatMap((scope) => {
            const found = [];
            // Like Playwright, a leading "/" is evaluated relative to the scope.
            const relative = expression.startsWith('/') ? `.${expression}` : expression;
            const result = this._doc.evaluate(relative, scope, null, 7, null);
            for (let index = 0; index < result.snapshotLength; index += 1) {
              if (result.snapshotItem(index).nodeType === 1) found.push(result.snapshotItem(index));
            }
            return found;
          }),
        ),
      );
    } else if (/^[a-z:-]+=/.test(selector) && !selector.startsWith('css=')) {
      throw new Error(`The "${selector.split('=')[0]}=" selector engine is not available in the gym. Use a getBy* method.`);
    } else {
      const css = selector.replace(/^css=/, '');
      const positional = /:nth-|:first-|:last-/.test(css);
      chained = this._then(positional ? 'positional css' : 'css', (scopes) =>
        inDocumentOrder(scopes.flatMap((scope) => [...scope.querySelectorAll(css)])),
      );
    }
    return options ? chained.filter(options) : chained;
  }

  filter(options = {}) {
    let result = this;
    if (options.hasText !== undefined) {
      const matches = textMatcher(options.hasText, false);
      result = result._then('filter', (elements) => elements.filter((element) => matches(elementText(element))));
    }
    if (options.hasNotText !== undefined) {
      const matches = textMatcher(options.hasNotText, false);
      result = result._then('filter', (elements) => elements.filter((element) => !matches(elementText(element))));
    }
    if (options.has !== undefined) {
      const inner = options.has;
      result = result._then('filter', (elements) => elements.filter((element) => inner.resolve([element]).length > 0), inner.used);
    }
    if (options.hasNot !== undefined) {
      const inner = options.hasNot;
      result = result._then('filter', (elements) => elements.filter((element) => inner.resolve([element]).length === 0), inner.used);
    }
    return result;
  }

  nth(index) {
    return this._then('nth', (elements) => {
      const picked = index < 0 ? elements[elements.length + index] : elements[index];
      return picked ? [picked] : [];
    });
  }

  first() {
    return this.nth(0);
  }

  last() {
    return this.nth(-1);
  }

  and(other) {
    return this._then('and', (elements) => {
      const others = new Set(other.resolve());
      return elements.filter((element) => others.has(element));
    }, other.used);
  }

  or(other) {
    return this._then('or', (elements) => inDocumentOrder([...elements, ...other.resolve()]), other.used);
  }

  frameLocator() {
    throw new Error('There are no iframes on the practice page.');
  }
}

/** Returns an object that behaves like Playwright's `page` for building locators against `doc`. */
export function createPage(doc) {
  return new GymLocator(doc, [], new Set());
}

/**
 * Evaluates what the learner typed, for example `page.getByRole('button', { name: 'Sign in' })`.
 * The text is only ever what the visitor typed into their own browser.
 */
export function evaluateLocator(source, doc) {
  const cleaned = source.trim().replace(/^await\s+/, '').replace(/;+\s*$/, '');
  if (!cleaned) throw new Error('Type a locator, for example page.getByRole(\'button\', { name: \'Sign in\' })');
  let value;
  try {
    value = new Function('page', `"use strict"; return (${cleaned});`)(createPage(doc));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`That is not valid JavaScript yet: ${error.message}`);
    if (error instanceof TypeError && /is not a function/.test(error.message)) {
      throw new Error(`${error.message}. Check the method name and its capital letters.`);
    }
    throw error;
  }
  if (!(value instanceof GymLocator)) throw new Error('That expression is not a locator. Start with page.');
  return value;
}

