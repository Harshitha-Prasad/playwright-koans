// A miniature Playwright that runs in the browser: actions with actionability checks, retrying
// assertions, dialogs and network routing, all against the practice page in an iframe.
//
// It exists so that short tests can be practised with nothing installed. It is NOT Playwright:
// it dispatches DOM events where Playwright drives a real browser. To keep it honest, every
// reference answer and every listed mistake in site/content/step-challenges.mjs is also run by
// real Playwright in site/tests/site.spec.ts, and both must agree on pass or fail.

import { GymLocator, elementText, isVisible, normalise, show } from './locator-engine.js';
import { ExpectationError, expectValue, format, valueMatchers } from './expect-lite.js';

export class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const POLL = 40;
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

// ---------- element state ----------

function isEnabled(element) {
  if (element.matches?.(':disabled')) return false;
  return !element.closest('[aria-disabled="true"]');
}

function isEditable(element) {
  return isEnabled(element) && !element.readOnly && element.getAttribute('aria-readonly') !== 'true';
}

function describeElement(element) {
  const open = element.cloneNode(false).outerHTML.replace(/<\/[^>]+>$/, '');
  const text = normalise(element.textContent);
  return `${open}${text.length > 40 ? `${text.slice(0, 40)}…` : text}</${element.localName}>`;
}

function strictModeViolation(api, locator, elements) {
  const listed = elements.slice(0, 10).map((element, index) => `    ${index + 1}) ${describeElement(element)}`);
  if (elements.length > 10) listed.push('    ...');
  return new Error(`${api}: Error: strict mode violation: ${locator} resolved to ${elements.length} elements:\n${listed.join('\n')}`);
}

/** A label is retargeted to its control, as Playwright does for fill, check and selectOption. */
function controlOf(element) {
  return element.localName === 'label' && element.control ? element.control : element;
}

// ---------- the locator, with actions ----------

class RuntimeLocator extends GymLocator {
  get _run() {
    return this._context;
  }

  /** Waits until the locator resolves to one element that passes the given checks. */
  async _ready(api, { checks = [], force = false, timeout } = {}) {
    const run = this._run;
    const limit = timeout ?? run.actionTimeout;
    const deadline = Date.now() + limit;
    const log = [`waiting for ${this}`];
    let lastReason;
    for (;;) {
      run.throwIfOver();
      const elements = this.resolve();
      if (elements.length > 1) throw strictModeViolation(`locator.${api}`, this, elements);
      if (elements.length === 1) {
        const element = elements[0];
        const reason = force ? null : this._failingCheck(element, checks);
        if (!reason) return element;
        if (reason !== lastReason) {
          log.push(`locator resolved to ${describeElement(element)}`, `  ${reason}`, 'retrying the action');
          lastReason = reason;
        }
      }
      if (Date.now() >= deadline) {
        throw new TimeoutError(`locator.${api}: Timeout ${limit}ms exceeded.\nCall log:\n${log.map((line) => `  - ${line}`).join('\n')}`);
      }
      await sleep(POLL);
    }
  }

  _failingCheck(element, checks) {
    if (checks.includes('visible') && !isVisible(element)) return 'element is not visible';
    if (checks.includes('enabled') && !isEnabled(element)) return 'element is not enabled';
    if (checks.includes('editable') && !isEditable(element)) return 'element is not editable';
    if (checks.includes('receives')) {
      this._scrollTo(element);
      const box = element.getBoundingClientRect();
      const hit = this._doc.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      const label = element.closest('label') ?? (element.labels ? element.labels[0] : null);
      const ok = !!hit && (element.contains(hit) || !!label?.contains(hit));
      if (!ok) return hit ? `${describeElement(hit)} intercepts pointer events` : 'element is outside of the viewport';
    }
    return null;
  }

  _scrollTo(element) {
    const view = this._doc.defaultView;
    const box = element.getBoundingClientRect();
    if (box.top < 0 || box.bottom > view.innerHeight) {
      view.scrollTo({ top: Math.max(0, box.top + view.scrollY - view.innerHeight / 2) });
    }
  }

  _event(element, Type, type, init = {}) {
    const view = this._doc.defaultView;
    element.dispatchEvent(new view[Type](type, { bubbles: true, cancelable: true, composed: true, view, ...init }));
  }

  /** Moves the pretend mouse: leaves what it was over, enters the target and its ancestors. */
  _moveMouseTo(element) {
    const run = this._run;
    const view = this._doc.defaultView;
    const chain = [];
    for (let node = element; node && node.nodeType === 1; node = node.parentElement) chain.push(node);
    for (const previous of run.hovered) {
      if (!chain.includes(previous) && previous.isConnected) {
        previous.dispatchEvent(new view.MouseEvent('mouseleave', { view }));
      }
    }
    this._event(element, 'MouseEvent', 'mouseover');
    for (const node of [...chain].reverse()) {
      if (!run.hovered.includes(node)) node.dispatchEvent(new view.MouseEvent('mouseenter', { view }));
    }
    this._event(element, 'MouseEvent', 'mousemove');
    run.hovered = chain;
  }

  // ----- actions -----

  async click(options = {}) {
    const run = this._run;
    run.count('click');
    if (options.force) run.count('force');
    const element = await this._ready('click', { checks: ['visible', 'enabled', 'receives'], ...options });
    this._scrollTo(element);
    this._moveMouseTo(element);
    this._event(element, 'MouseEvent', 'mousedown');
    if (typeof element.focus === 'function' && isEnabled(element)) element.focus();
    this._event(element, 'MouseEvent', 'mouseup');
    element.click();
  }

  async hover(options = {}) {
    this._run.count('hover');
    const element = await this._ready('hover', { checks: ['visible', 'receives'], ...options });
    this._moveMouseTo(element);
  }

  async fill(value, options = {}) {
    this._run.count('fill');
    const element = controlOf(await this._ready('fill', { checks: ['visible', 'enabled', 'editable'], ...options }));
    const view = this._doc.defaultView;
    const tag = element.localName;
    if (tag === 'input') {
      const type = (element.getAttribute('type') ?? 'text').toLowerCase();
      if (['checkbox', 'radio', 'file', 'button', 'submit', 'reset', 'image', 'range', 'color'].includes(type)) {
        throw new Error(`locator.fill: Error: Input of type "${type}" cannot be filled`);
      }
      element.focus();
      Object.getOwnPropertyDescriptor(view.HTMLInputElement.prototype, 'value').set.call(element, String(value));
    } else if (tag === 'textarea') {
      element.focus();
      Object.getOwnPropertyDescriptor(view.HTMLTextAreaElement.prototype, 'value').set.call(element, String(value));
    } else if (element.isContentEditable) {
      element.focus();
      element.textContent = String(value);
    } else {
      throw new Error('locator.fill: Error: Element is not an <input>, <textarea> or [contenteditable] element');
    }
    this._event(element, 'Event', 'input');
    this._event(element, 'Event', 'change');
  }

  clear(options) {
    return this.fill('', options);
  }

  async setChecked(checked, options = {}) {
    const api = checked ? 'check' : 'uncheck';
    this._run.count(api);
    const element = controlOf(await this._ready(api, { checks: ['visible', 'enabled', 'receives'], ...options }));
    const isToggle = element.localName === 'input' && ['checkbox', 'radio'].includes(element.type);
    const isAria = ['checkbox', 'radio', 'switch'].includes(element.getAttribute('role'));
    if (!isToggle && !isAria) throw new Error(`locator.${api}: Error: Not a checkbox or radio button`);
    const state = () => (isToggle ? element.checked : element.getAttribute('aria-checked') === 'true');
    if (state() === checked) return;
    if (!checked && isToggle && element.type === 'radio') throw new Error('locator.uncheck: Error: Cannot uncheck radio button. Radio buttons can only be unchecked by selecting another radio button in the same group.');
    this._moveMouseTo(element);
    element.click();
    if (state() !== checked) throw new Error(`locator.${api}: Error: Clicking the checkbox did not change its state`);
  }

  check(options) {
    return this.setChecked(true, options);
  }

  uncheck(options) {
    return this.setChecked(false, options);
  }

  async selectOption(values, options = {}) {
    this._run.count('selectOption');
    const element = controlOf(await this._ready('selectOption', { checks: ['visible', 'enabled'], ...options }));
    if (element.localName !== 'select') throw new Error('locator.selectOption: Error: Element is not a <select> element');
    const wanted = Array.isArray(values) ? values : [values];
    const all = [...element.options];
    const picked = wanted.map((want) => {
      const match = all.find((option, index) => {
        if (typeof want === 'string') return option.value === want || normalise(option.label) === want;
        if (want.value !== undefined && option.value !== want.value) return false;
        if (want.label !== undefined && normalise(option.label) !== want.label) return false;
        if (want.index !== undefined && index !== want.index) return false;
        return true;
      });
      if (!match) throw new TimeoutError(`locator.selectOption: Timeout ${this._run.actionTimeout}ms exceeded.\nCall log:\n  - waiting for ${this}\n  - did not find some options`);
      return match;
    });
    if (picked.length > 1 && !element.multiple) throw new Error('locator.selectOption: Error: Cannot select multiple options in a single <select>');
    for (const option of all) option.selected = picked.includes(option);
    this._event(element, 'Event', 'input');
    this._event(element, 'Event', 'change');
    return picked.map((option) => option.value);
  }

  async focus(options = {}) {
    (await this._ready('focus', options)).focus();
  }

  async blur(options = {}) {
    (await this._ready('blur', options)).blur();
  }

  async press(key, options = {}) {
    this._run.count('press');
    const element = await this._ready('press', options);
    element.focus();
    pressKey(this, element, key);
  }

  async pressSequentially(text, options = {}) {
    this._run.count('pressSequentially');
    const element = await this._ready('pressSequentially', options);
    element.focus();
    for (const character of String(text)) pressKey(this, element, character);
  }

  type(text, options) {
    return this.pressSequentially(text, options);
  }

  async setInputFiles(files, options = {}) {
    this._run.count('setInputFiles');
    const element = controlOf(await this._ready('setInputFiles', options));
    if (element.localName !== 'input' || element.type !== 'file') throw new Error('locator.setInputFiles: Error: Node is not an HTMLInputElement of type "file"');
    const view = this._doc.defaultView;
    const transfer = new view.DataTransfer();
    for (const file of Array.isArray(files) ? files : [files]) {
      if (typeof file === 'string') {
        throw new Error('The playground cannot read files from your disk. Pass { name, mimeType, buffer } instead of a path.');
      }
      transfer.items.add(new view.File([file.buffer], file.name, { type: file.mimeType }));
    }
    element.files = transfer.files;
    this._event(element, 'Event', 'input');
    this._event(element, 'Event', 'change');
  }

  async dispatchEvent(type, init = {}) {
    this._event(await this._ready('dispatchEvent'), 'Event', type, init);
  }

  // ----- reads: these wait for the element to exist, then read once -----

  async textContent(options = {}) {
    this._run.count('textContent');
    return (await this._ready('textContent', options)).textContent;
  }

  async innerText(options = {}) {
    this._run.count('innerText');
    return (await this._ready('innerText', options)).innerText;
  }

  async inputValue(options = {}) {
    this._run.count('inputValue');
    const element = controlOf(await this._ready('inputValue', options));
    if (!('value' in element)) throw new Error('locator.inputValue: Error: Node is not an <input>, <textarea> or <select> element');
    return element.value;
  }

  async getAttribute(name, options = {}) {
    return (await this._ready('getAttribute', options)).getAttribute(name);
  }

  async isChecked(options = {}) {
    const element = controlOf(await this._ready('isChecked', options));
    return 'checked' in element ? element.checked : element.getAttribute('aria-checked') === 'true';
  }

  async isEnabled(options = {}) {
    return isEnabled(await this._ready('isEnabled', options));
  }

  async isDisabled(options = {}) {
    return !isEnabled(await this._ready('isDisabled', options));
  }

  async isEditable(options = {}) {
    return isEditable(await this._ready('isEditable', options));
  }

  // ----- reads that never wait -----

  async isVisible() {
    this._run.count('isVisible');
    const elements = this.resolve();
    if (elements.length > 1) throw strictModeViolation('locator.isVisible', this, elements);
    return elements.length === 1 && isVisible(elements[0]);
  }

  async isHidden() {
    this._run.count('isHidden');
    const elements = this.resolve();
    if (elements.length > 1) throw strictModeViolation('locator.isHidden', this, elements);
    return elements.length === 0 || !isVisible(elements[0]);
  }

  async count() {
    this._run.count('count');
    return this.resolve().length;
  }

  async all() {
    this._run.count('all');
    return this.resolve().map((_, index) => this.nth(index));
  }

  async allTextContents() {
    this._run.count('allTextContents');
    return this.resolve().map((element) => element.textContent ?? '');
  }

  async allInnerTexts() {
    this._run.count('allInnerTexts');
    return this.resolve().map((element) => element.innerText);
  }

  async waitFor({ state = 'visible', timeout } = {}) {
    const limit = timeout ?? this._run.actionTimeout;
    const deadline = Date.now() + limit;
    for (;;) {
      this._run.throwIfOver();
      const elements = this.resolve();
      if (elements.length > 1) throw strictModeViolation('locator.waitFor', this, elements);
      const element = elements[0];
      const reached = {
        attached: !!element,
        detached: !element,
        visible: !!element && isVisible(element),
        hidden: !element || !isVisible(element),
      }[state];
      if (reached === undefined) throw new Error(`locator.waitFor: state: expected one of (attached|detached|visible|hidden)`);
      if (reached) return;
      if (Date.now() >= deadline) throw new TimeoutError(`locator.waitFor: Timeout ${limit}ms exceeded.\nCall log:\n  - waiting for ${this} to be ${state}`);
      await sleep(POLL);
    }
  }
}

function pressKey(locator, element, key) {
  const init = { key, code: key.length === 1 ? `Key${key.toUpperCase()}` : key };
  locator._event(element, 'KeyboardEvent', 'keydown', init);
  const isTextField = (element.localName === 'input' && !['checkbox', 'radio', 'button', 'submit', 'file'].includes(element.type)) || element.localName === 'textarea';
  if (key.length === 1 && isTextField) {
    const view = element.ownerDocument.defaultView;
    const proto = element.localName === 'input' ? view.HTMLInputElement.prototype : view.HTMLTextAreaElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, element.value + key);
    locator._event(element, 'Event', 'input');
  } else if (key === 'Backspace' && isTextField) {
    element.value = element.value.slice(0, -1);
    locator._event(element, 'Event', 'input');
  } else if (key === 'Enter') {
    if (element.localName === 'input' && element.form) element.form.requestSubmit();
    else if (['button', 'a'].includes(element.localName)) element.click();
  } else if (key === ' ' || key === 'Space') {
    if (element.localName === 'button' || ['checkbox', 'radio'].includes(element.type)) element.click();
  }
  locator._event(element, 'KeyboardEvent', 'keyup', init);
}

// ---------- assertions on locators ----------

function matchText(expected, actual, { ignoreCase = false, substring = false } = {}) {
  if (expected instanceof RegExp) return expected.test(actual);
  let wanted = normalise(String(expected));
  let got = normalise(actual);
  if (ignoreCase) {
    wanted = wanted.toLowerCase();
    got = got.toLowerCase();
  }
  return substring ? got.includes(wanted) : got === wanted;
}

function locatorMatchers(run, locator, { isNot = false, message, soft = false } = {}) {
  /**
   * probe() looks at the page once and returns { pass, received }, or { pass: false, missing: true }
   * when there is no element. The matcher keeps probing until it passes or the timeout is over.
   */
  const retrying = (name, expectedLine, options, probe) => {
    const attempt = (async () => {
      run.count('assertion');
      const limit = options?.timeout ?? run.expectTimeout;
      const deadline = Date.now() + limit;
      let last;
      for (;;) {
        run.throwIfOver();
        last = probe();
        if (last.pass !== isNot) return;
        if (Date.now() >= deadline) break;
        await sleep(POLL);
      }
      const lines = [
        message,
        `expect(locator).${isNot ? 'not.' : ''}${name} failed`,
        '',
        `Locator: ${locator}`,
        expectedLine === null ? null : `Expected: ${isNot ? 'not ' : ''}${expectedLine}`,
        `Received: ${last.missing ? '<element(s) not found>' : last.received}`,
        `Timeout: ${limit}ms`,
      ];
      throw new ExpectationError(lines.filter((line) => line !== undefined && line !== null).join('\n'));
    })();
    if (!soft) return attempt;
    return attempt.catch((error) => {
      run.softErrors.push(error);
    });
  };

  /** Resolves to exactly one element (or none); more than one is a strict mode violation. */
  const one = (name) => {
    const elements = locator.resolve();
    if (elements.length > 1) throw strictModeViolation(`expect.${name}`, locator, elements);
    return elements[0];
  };
  const withElement = (name, read) => () => {
    const element = one(name);
    return element ? read(element) : { pass: false, missing: true };
  };
  const state = (name, label, test, options) =>
    retrying(`${name}()`, label, options, withElement(name, (element) => ({ pass: test(element), received: test(element) ? label : `not ${label}` })));

  const matchers = {
    toBeVisible: (options = {}) => {
      const want = options.visible ?? true;
      return retrying('toBeVisible()', want ? 'visible' : 'hidden', options, () => {
        const element = one('toBeVisible');
        const visible = !!element && isVisible(element);
        return { pass: visible === want, received: visible ? 'visible' : 'hidden', missing: !element && want };
      });
    },
    toBeHidden: (options) =>
      retrying('toBeHidden()', 'hidden', options, () => {
        const element = one('toBeHidden');
        const hidden = !element || !isVisible(element);
        return { pass: hidden, received: hidden ? 'hidden' : 'visible' };
      }),
    toBeAttached: (options = {}) => {
      const want = options.attached ?? true;
      return retrying('toBeAttached()', want ? 'attached' : 'detached', options, () => {
        const attached = !!one('toBeAttached');
        return { pass: attached === want, received: attached ? 'attached' : 'detached', missing: !attached && want };
      });
    },
    toBeEnabled: (options) => state('toBeEnabled', 'enabled', (element) => isEnabled(element), options),
    toBeDisabled: (options) => state('toBeDisabled', 'disabled', (element) => !isEnabled(element), options),
    toBeEditable: (options) => state('toBeEditable', 'editable', (element) => isEditable(element), options),
    toBeFocused: (options) => state('toBeFocused', 'focused', (element) => element.ownerDocument.activeElement === element, options),
    toBeEmpty: (options) => state('toBeEmpty', 'empty', (element) => ('value' in element && element.localName !== 'button' ? element.value === '' : normalise(element.textContent) === ''), options),
    toBeChecked: (options = {}) => {
      const want = options.checked ?? true;
      return retrying('toBeChecked()', want ? 'checked' : 'unchecked', options, withElement('toBeChecked', (target) => {
        const element = controlOf(target);
        const checked = 'checked' in element ? element.checked : element.getAttribute('aria-checked') === 'true';
        return { pass: checked === want, received: checked ? 'checked' : 'unchecked' };
      }));
    },
    toHaveCount: (expected, options) =>
      retrying('toHaveCount(expected)', String(expected), options, () => {
        const count = locator.resolve().length;
        return { pass: count === expected, received: String(count) };
      }),
    toHaveValue: (expected, options) =>
      retrying('toHaveValue(expected)', format(expected), options, withElement('toHaveValue', (target) => {
        const value = String(controlOf(target).value ?? '');
        return { pass: expected instanceof RegExp ? expected.test(value) : value === String(expected), received: format(value) };
      })),
    toHaveAttribute: (name, ...rest) => {
      const options = rest.length === 2 ? rest[1] : rest.length === 1 && typeof rest[0] === 'object' && !(rest[0] instanceof RegExp) ? rest[0] : undefined;
      const hasValue = rest.length > 0 && rest[0] !== options;
      const expected = rest[0];
      return retrying('toHaveAttribute(expected)', hasValue ? format(expected) : `attribute "${name}"`, options, withElement('toHaveAttribute', (element) => {
        const value = element.getAttribute(name);
        if (value === null) return { pass: false, received: 'attribute not present' };
        if (!hasValue) return { pass: true, received: format(value) };
        return { pass: expected instanceof RegExp ? expected.test(value) : value === String(expected), received: format(value) };
      }));
    },
    toHaveClass: (expected, options) =>
      retrying('toHaveClass(expected)', format(expected), options, withElement('toHaveClass', (element) => {
        const value = normalise(element.getAttribute('class') ?? '');
        return { pass: expected instanceof RegExp ? expected.test(value) : value === normalise(String(expected)), received: format(value) };
      })),
    toHaveId: (expected, options) =>
      retrying('toHaveId(expected)', format(expected), options, withElement('toHaveId', (element) => ({
        pass: expected instanceof RegExp ? expected.test(element.id) : element.id === expected,
        received: format(element.id),
      }))),
  };

  const textMatcherFor = (name, substring) => (expected, options = {}) => {
    const read = (element) => (options.useInnerText ? element.innerText : elementText(element));
    if (Array.isArray(expected)) {
      return retrying(`${name}(expected)`, format(expected), options, () => {
        const texts = locator.resolve().map((element) => normalise(read(element)));
        const pass = texts.length === expected.length && expected.every((item, index) => matchText(item, texts[index], { ...options, substring }));
        return { pass, received: format(texts) };
      });
    }
    return retrying(`${name}(expected)`, format(expected), options, withElement(name, (element) => {
      const text = read(element);
      return { pass: matchText(expected, text, { ...options, substring }), received: format(normalise(text)) };
    }));
  };
  matchers.toHaveText = textMatcherFor('toHaveText', false);
  matchers.toContainText = textMatcherFor('toContainText', true);

  return new Proxy(matchers, {
    get: (target, name) => {
      if (name === 'not') return locatorMatchers(run, locator, { isNot: !isNot, message, soft });
      if (name in target || typeof name === 'symbol' || name === 'then') return target[name];
      return () => {
        throw new Error(`expect(locator).${String(name)}() is not available in the playground. Available: ${Object.keys(matchers).join(', ')}.`);
      };
    },
  });
}

// ---------- network ----------

function globToRegExp(glob) {
  let pattern = '';
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === '*') {
      if (glob[index + 1] === '*') {
        pattern += '.*';
        index += 1;
        if (glob[index + 1] === '/') index += 1;
      } else {
        pattern += '[^/]*';
      }
    } else if (char === '{') pattern += '(';
    else if (char === '}') pattern += ')';
    else if (char === ',') pattern += '|';
    else pattern += char.replace(/[.+?^$()[\]\\|]/g, '\\$&');
  }
  return new RegExp(`^${pattern}$`);
}

function urlMatcher(matcher, baseURL) {
  if (matcher instanceof RegExp) return (url) => matcher.test(url);
  if (typeof matcher === 'function') return (url) => matcher(new URL(url));
  const text = String(matcher);
  const absolute = /^[a-z]+:|^\*/i.test(text) ? text : new URL(text, baseURL).href;
  const expression = globToRegExp(absolute);
  return (url) => expression.test(url);
}

function makeResponse(url, request, status, headers, bodyText) {
  return {
    url: () => url,
    status: () => status,
    ok: () => status >= 200 && status <= 299,
    headers: () => ({ ...headers }),
    text: async () => bodyText,
    json: async () => JSON.parse(bodyText),
    body: async () => new TextEncoder().encode(bodyText),
    request: () => request,
  };
}

function installNetwork(run) {
  const view = run.doc.defaultView;
  const realFetch = view.fetch.bind(view);

  const real = async (url, init, request) => {
    const response = await realFetch(url, init);
    const headers = Object.fromEntries(response.headers.entries());
    return makeResponse(url, request, response.status, headers, await response.text());
  };

  view.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, run.doc.baseURI).href;
    const method = (init.method ?? (typeof input === 'object' ? input.method : undefined) ?? 'GET').toUpperCase();
    const request = {
      url: () => url,
      method: () => method,
      headers: () => ({ ...(init.headers ?? {}) }),
      postData: () => (typeof init.body === 'string' ? init.body : null),
      postDataJSON: () => (typeof init.body === 'string' ? JSON.parse(init.body) : null),
    };
    for (const waiter of [...run.requestWaiters]) waiter(request);

    // Routes are tried newest first, like in Playwright.
    const candidates = [...run.routes].reverse().filter((route) => route.matches(url));
    let result;
    for (let index = 0; index <= candidates.length; index += 1) {
      const candidate = candidates[index];
      if (!candidate) {
        result = { response: await real(url, init, request) };
        break;
      }
      run.count('routed request');
      const outcome = await new Promise((resolve, reject) => {
        const route = {
          request: () => request,
          fulfill: async (options = {}) => {
            const from = options.response;
            const body = options.json !== undefined ? JSON.stringify(options.json) : (options.body ?? (from ? await from.text() : ''));
            const contentType = options.contentType ?? (options.json !== undefined ? 'application/json' : (from?.headers()['content-type'] ?? 'text/plain'));
            resolve({ response: makeResponse(url, request, options.status ?? from?.status() ?? 200, { ...(from?.headers() ?? {}), ...(options.headers ?? {}), 'content-type': contentType }, String(body)) });
          },
          abort: async () => resolve({ aborted: true }),
          continue: async () => resolve({ response: await real(url, init, request) }),
          fallback: async () => resolve({ next: true }),
          fetch: () => real(url, init, request),
        };
        Promise.resolve()
          .then(() => candidate.handler(route, request))
          .catch(reject);
      });
      if (outcome.next) continue;
      result = outcome;
      break;
    }

    if (result.aborted) throw new view.TypeError('Failed to fetch');
    const response = result.response;
    for (const waiter of [...run.responseWaiters]) waiter(response);
    const bodyText = await response.text();
    const status = response.status();
    return new view.Response([204, 205, 304].includes(status) ? null : bodyText, { status, headers: response.headers() });
  };
}

// ---------- dialogs ----------

function installDialogs(run) {
  const view = run.doc.defaultView;
  const open = (type, message = '', defaultValue = '') => {
    run.count('dialog');
    let outcome;
    const dialog = {
      type: () => type,
      message: () => String(message),
      defaultValue: () => String(defaultValue),
      accept: async (text) => {
        outcome ??= { accepted: true, text };
      },
      dismiss: async () => {
        outcome ??= { accepted: false };
      },
    };
    const listeners = run.listeners.dialog;
    if (listeners.length === 0) {
      // No listener: Playwright dismisses the dialog on its own.
      outcome = { accepted: false };
    } else {
      for (const listener of [...listeners]) {
        if (listener.once) listeners.splice(listeners.indexOf(listener), 1);
        listener.callback(dialog);
      }
      if (!outcome) {
        run.warnings.push('A dialog listener has to call dialog.accept() or dialog.dismiss(). In real Playwright the page would now hang; here the dialog was dismissed.');
        outcome = { accepted: false };
      }
    }
    if (type === 'alert') return undefined;
    if (type === 'confirm') return outcome.accepted;
    return outcome.accepted ? String(outcome.text ?? defaultValue ?? '') : null;
  };
  view.alert = (message) => open('alert', message);
  view.confirm = (message) => open('confirm', message);
  view.prompt = (message, defaultValue) => open('prompt', message, defaultValue);
}

// ---------- a run ----------

function createRun(doc, { actionTimeout = 3000, expectTimeout = 3000, runTimeout = 20000 } = {}) {
  const started = Date.now();
  const run = {
    doc,
    actionTimeout,
    expectTimeout,
    usage: {},
    warnings: [],
    softErrors: [],
    hovered: [],
    routes: [],
    responseWaiters: [],
    requestWaiters: [],
    listeners: { dialog: [] },
    count(name) {
      run.usage[name] = (run.usage[name] ?? 0) + 1;
    },
    throwIfOver() {
      if (Date.now() - started > runTimeout) throw new TimeoutError(`Test timeout of ${runTimeout}ms exceeded.`);
    },
  };

  const page = new RuntimeLocator(doc, [], new Set(), [], run);
  const view = doc.defaultView;

  const waitForNetwork = (kind, waiters, matcher, options = {}) => {
    const limit = options.timeout ?? 5000;
    const matches = typeof matcher === 'function' ? matcher : ((test) => (item) => test(item.url()))(urlMatcher(matcher, doc.baseURI));
    const promise = new Promise((resolve, reject) => {
      const waiter = async (item) => {
        if (await matches(item)) {
          clearTimeout(timer);
          waiters.splice(waiters.indexOf(waiter), 1);
          resolve(item);
        }
      };
      const timer = setTimeout(() => {
        waiters.splice(waiters.indexOf(waiter), 1);
        reject(new TimeoutError(`page.waitFor${kind}: Timeout ${limit}ms exceeded while waiting for event "${kind.toLowerCase()}"`));
      }, limit);
      waiters.push(waiter);
    });
    promise.catch(() => {}); // the test decides whether to await it
    return promise;
  };

  Object.assign(page, {
    waitForTimeout: async (ms) => {
      run.count('waitForTimeout');
      await sleep(Math.min(Number(ms) || 0, 10000));
    },
    on: (event, callback) => {
      if (!run.listeners[event]) throw new Error(`page.on('${event}') is not available in the playground. Available: 'dialog'.`);
      run.listeners[event].push({ callback, once: false });
      return page;
    },
    once: (event, callback) => {
      if (!run.listeners[event]) throw new Error(`page.once('${event}') is not available in the playground. Available: 'dialog'.`);
      run.listeners[event].push({ callback, once: true });
      return page;
    },
    route: async (matcher, handler) => {
      run.count('route');
      run.routes.push({ matches: urlMatcher(matcher, doc.baseURI), handler });
    },
    unrouteAll: async () => {
      run.routes.length = 0;
    },
    waitForResponse: (matcher, options) => {
      run.count('waitForResponse');
      return waitForNetwork('Response', run.responseWaiters, matcher, options);
    },
    waitForRequest: (matcher, options) => waitForNetwork('Request', run.requestWaiters, matcher, options),
    title: async () => doc.title,
    url: () => doc.location.href,
    evaluate: async (fn, argument) => (typeof fn === 'function' ? new view.Function(`return (${fn})(...arguments)`)(argument) : new view.Function(`return (${fn})`)()),
    goto: async () => {
      throw new Error('The practice page is already open. Start with your first action; page.goto() is not needed here.');
    },
    reload: async () => {
      throw new Error('page.reload() is not available in the playground. Every run starts from a freshly loaded page.');
    },
    waitForLoadState: async () => {},
    pause: async () => {},
    keyboard: {
      press: async (key) => pressKey(page, doc.activeElement ?? doc.body, key),
      type: async (text) => {
        for (const character of String(text)) pressKey(page, doc.activeElement ?? doc.body, character);
      },
    },
  });

  const pageMatchers = (isNot, message) => {
    const retry = async (name, expected, read, options) => {
      run.count('assertion');
      const limit = options?.timeout ?? run.expectTimeout;
      const deadline = Date.now() + limit;
      let received;
      for (;;) {
        received = read();
        const pass = expected instanceof RegExp ? expected.test(received) : received === String(expected);
        if (pass !== isNot) return;
        if (Date.now() >= deadline) break;
        await sleep(POLL);
      }
      throw new ExpectationError([message, `expect(page).${isNot ? 'not.' : ''}${name}(expected) failed`, '', `Expected: ${isNot ? 'not ' : ''}${format(expected)}`, `Received: ${format(received)}`, `Timeout: ${limit}ms`].filter(Boolean).join('\n'));
    };
    return {
      toHaveTitle: (expected, options) => retry('toHaveTitle', expected, () => doc.title, options),
      toHaveURL: (expected, options) => retry('toHaveURL', expected, () => doc.location.href, options),
      get not() {
        return pageMatchers(!isNot, message);
      },
    };
  };

  const softValue = (received, message) => {
    const wrap = (isNot) =>
      new Proxy(valueMatchers(received, { isNot, message }), {
        get: (target, name) => {
          if (name === 'not') return wrap(!isNot);
          return (...args) => {
            try {
              target[name](...args);
            } catch (error) {
              run.softErrors.push(error);
            }
          };
        },
      });
    return wrap(false);
  };

  const expect = (received, message) => {
    if (received instanceof GymLocator) return locatorMatchers(run, received, { message });
    if (received === page) return pageMatchers(false, message);
    const matchers = expectValue(received, message);
    if (typeof received === 'function') {
      matchers.toPass = async (options = {}) => {
        run.count('toPass');
        const limit = options.timeout ?? run.expectTimeout;
        const deadline = Date.now() + limit;
        let lastError;
        for (;;) {
          run.throwIfOver();
          try {
            await received();
            return;
          } catch (error) {
            lastError = error;
          }
          if (Date.now() >= deadline) break;
          await sleep(100);
        }
        throw new ExpectationError(`expect(received).toPass() failed\n\nTimeout ${limit}ms exceeded while waiting on the block to pass.\nLast error: ${lastError?.message ?? lastError}`);
      };
    } else if (received && typeof received.then === 'function') {
      run.warnings.push('expect() received a promise. Did you forget an await inside expect(...)? For example: expect(await locator.textContent()).');
    }
    return matchers;
  };
  expect.soft = (received, message) => {
    run.count('soft assertion');
    return received instanceof GymLocator ? locatorMatchers(run, received, { message, soft: true }) : softValue(received, message);
  };
  expect.poll = (read, options = {}) => {
    run.count('poll');
    const build = (isNot) =>
      new Proxy(
        {},
        {
          get: (_, name) => {
            if (name === 'not') return build(!isNot);
            return async (...args) => {
              const limit = options.timeout ?? run.expectTimeout;
              const deadline = Date.now() + limit;
              let lastError;
              for (;;) {
                run.throwIfOver();
                const value = await read();
                try {
                  valueMatchers(value, { isNot, message: options.message })[name](...args);
                  return;
                } catch (error) {
                  lastError = error;
                }
                if (Date.now() >= deadline) break;
                await sleep(100);
              }
              throw new ExpectationError(`${lastError.message}\n\nTimeout ${limit}ms exceeded while polling.`);
            };
          },
        },
      );
    return build(false);
  };

  installDialogs(run);
  installNetwork(run);
  return { run, page, expect };
}

/**
 * Runs a few lines of test code against the practice page.
 * `code` is what the visitor typed into their own browser: the body of an async test function
 * with `page` and `expect` in scope. A whole `test('...', async ({ page }) => { ... })` works too.
 */
export async function runSteps(code, doc, options) {
  const { run, page, expect } = createRun(doc, options);
  const pending = [];
  const callback = (args) => args.find((argument) => typeof argument === 'function');
  const test = (...args) => {
    pending.push(Promise.resolve().then(() => callback(args)({ page })));
  };
  test.step = async (title, body) => body();
  test.describe = (...args) => callback(args)();
  test.beforeEach = (...args) => pending.push(Promise.resolve().then(() => callback(args)({ page })));
  test.info = () => ({ retry: 0, annotations: [], attach: async () => {} });
  test.use = () => {};
  const Buffer = { from: (text) => new TextEncoder().encode(String(text)) };

  const cleaned = code
    .split('\n')
    .filter((line) => !/^\s*import\s.+from\s/.test(line))
    .join('\n');

  let error = null;
  try {
    let body;
    try {
      body = new AsyncFunction('page', 'expect', 'test', 'Buffer', `"use strict";\n${cleaned}`);
    } catch (syntaxError) {
      throw new Error(`That is not valid JavaScript yet: ${syntaxError.message}`);
    }
    await body(page, expect, test, Buffer);
    for (const promise of pending) await promise;
    if (run.softErrors.length > 0) {
      throw new ExpectationError(run.softErrors.map((softError) => softError.message).join('\n\n'));
    }
  } catch (caught) {
    error = caught instanceof Error ? caught : new Error(String(caught));
  }
  return {
    ok: !error,
    error: error ? { name: error.name, message: error.message } : null,
    usage: run.usage,
    warnings: run.warnings,
  };
}

export { show };
