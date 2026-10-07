// Mounts a gym wherever the page has <div data-gym="all"> or <div data-gym="<challenge id>">.

import { locatorChallenges } from './data.js';
import { mountGym } from './gym.js';

for (const container of document.querySelectorAll('[data-gym]')) {
  const wanted = container.dataset.gym;
  const challenges = wanted === 'all' ? locatorChallenges : locatorChallenges.filter((challenge) => challenge.id === wanted);
  mountGym(container, { challenges, compact: container.dataset.compact === 'true' });
}
