import { DIALOG_ROUTES } from '../src/data/story/routes.js';

const ids = new Set();
for (const [index, route] of DIALOG_ROUTES.entries()) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(route.id || '')) {
    throw new Error(`route ${index} has a missing or non-kebab-case id: ${route.id}`);
  }
  if (ids.has(route.id)) throw new Error(`duplicate route id: ${route.id}`);
  if (typeof route.why !== 'string' || !/[.!?]$/.test(route.why.trim())) throw new Error(`${route.id} has no sentence in why`);
  if (!/^ExplorationState\.js:\d+-\d+$/.test(route.src || '')) throw new Error(`${route.id} has invalid src: ${route.src}`);
  if (!Object.hasOwn(route, 'when') || !Object.hasOwn(route, 'then')) throw new Error(`${route.id} has no when or then`);
  const effects = route.effect ? (Array.isArray(route.effect) ? route.effect : [route.effect]) : [];
  for (const effect of effects) {
    if (!['alex_story_chosen', 'alex_story_deferred', 'alex_side_deferred'].includes(effect.flag)) {
      throw new Error(`${route.id} writes forbidden effect flag: ${effect.flag}`);
    }
  }
  ids.add(route.id);
}

console.log(`DIALOG_ROUTES self-check PASS (${DIALOG_ROUTES.length} unique rows; every row has id, why, and src)`);
