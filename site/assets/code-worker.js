// Runs a learner's JavaScript answer off the main thread, so an endless loop cannot freeze the page.
// The page stops this worker if it has not answered within a few seconds.

import { runCodeChallenge } from './run-code.js';

self.onmessage = async (event) => {
  const { code, challenge } = event.data;
  self.postMessage(await runCodeChallenge(code, challenge));
};
