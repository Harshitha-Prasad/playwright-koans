// Mounts the playground wherever a page has <div data-playground="all">, and a single compact
// locator challenge wherever it has <div data-playground="<challenge id>">.

import { codeChallenges, locatorChallenges, stepChallenges } from './data.js';
import { mountPlayground } from './playground.js';

for (const container of document.querySelectorAll('[data-playground]')) {
  const wanted = container.dataset.playground;
  if (wanted === 'all') {
    mountPlayground(container, { tracks: { locators: locatorChallenges, steps: stepChallenges, code: codeChallenges } });
  } else {
    mountPlayground(container, { tracks: { locators: locatorChallenges.filter((challenge) => challenge.id === wanted) }, compact: true });
  }
}
