// Behaviour shared by every page: theme switch, copy buttons, "open all" on question cards.

const root = document.documentElement;

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const current = root.dataset.theme ?? (systemDark ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try {
    localStorage.setItem('r2g:theme', next);
  } catch {
    // The theme still changes for this page view.
  }
});

for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    const source = document.querySelector(button.dataset.copy);
    const label = button.textContent;
    try {
      await navigator.clipboard.writeText(source.textContent);
      button.textContent = 'Copied';
    } catch {
      // Clipboard access can be refused. Select the text so Ctrl/Cmd+C works.
      const range = document.createRange();
      range.selectNodeContents(source);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      button.textContent = 'Selected: press Ctrl+C';
    }
    setTimeout(() => (button.textContent = label), 2500);
  });
}

for (const button of document.querySelectorAll('[data-qa-toggle]')) {
  button.addEventListener('click', () => {
    const cards = [...document.querySelectorAll('details.qa')];
    const open = cards.some((card) => !card.open);
    for (const card of cards) card.open = open;
    button.textContent = open ? 'Close all' : 'Open all';
  });
}
