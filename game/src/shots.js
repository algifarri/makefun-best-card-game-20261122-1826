// The screenshot scenes behind ?shot=start|play|win|loss. Each one plays the real
// rules forward from a fresh duel, steered by a simple autopilot, so the frame is what
// real play looks like and the same seed always gives the same frame. The win and loss
// scenes try a few seeds until the autopilot really wins (or really loses); a scene
// that never resolves falls back to the closest game it found.
import { createRandom } from './random.js';
import { createDuel } from './world.js';
import { cardCost, cardPower } from './config.js';
import { SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const PLAY_TURNS = 4;
const MAX_TURNS = 40;

/** Pick the autopilot's next card: heal when hurt, guard when exposed, else hit hard. */
function pickCard(duel) {
  const { player } = duel.state;
  let best = -1;
  let bestScore = -1;
  for (let index = 0; index < player.hand.length; index += 1) {
    const card = player.hand[index];
    if (cardCost(card) > player.energy) continue;
    let score = cardPower(card);
    if (card.kind === 'mend' && player.life < 20) score += 14;
    if (card.kind === 'mend' && player.life >= 20) score -= 20;
    if (card.kind === 'guard' && player.shield === 0) score += 5;
    if (card.kind === 'strike') score += 4;
    score -= cardCost(card);
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  }
  return best;
}

/** One full player turn under the autopilot, then the Warden's answer. `maxCards`
 * caps how many cards the autopilot plays that turn (the play scene plays one, so
 * the table still shows a full hand). */
function autopilotTurn(duel, maxCards) {
  let played = 0;
  let guard = 0;
  while (guard < 12 && (maxCards === undefined || played < maxCards)) {
    guard += 1;
    const index = pickCard(duel);
    if (index < 0) break;
    const events = duel.playCard(duel.state.player, duel.state.foe, index);
    played += 1;
    if (duel.state.phase !== 'play') return events;
  }
  return duel.endTurn();
}

/** Play `turns` autopilot turns from a fresh duel with `seed`; returns the duel. */
function simulate(seed, turns, maxCards) {
  const duel = createDuel(createRandom(seed));
  for (let turn = 0; turn < turns; turn += 1) {
    if (duel.state.phase !== 'play') break;
    autopilotTurn(duel, maxCards);
  }
  return duel;
}

/** Play until the autopilot wins, trying seeds in order; keeps the quickest win. */
function simulateWin(seed) {
  let best = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const duel = simulate(seed + attempt * 7919, MAX_TURNS);
    if (duel.state.phase === 'win' && (best === null || duel.state.turn < best.state.turn)) best = duel;
  }
  return best;
}

/** Play with the player passing every turn until the Warden wins; returns the duel or null. */
function simulateLoss(seed) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const duel = createDuel(createRandom(seed + attempt * 104729));
    for (let turn = 0; turn < MAX_TURNS && duel.state.phase === 'play'; turn += 1) {
      duel.endTurn();
    }
    if (duel.state.phase === 'loss') return duel;
  }
  return null;
}

/** Copy a simulated duel's state into the live world so the renderer draws it. */
function adopt(world, duel) {
  const target = world.state;
  target.turn = duel.state.turn;
  target.phase = duel.state.phase;
  target.player = duel.state.player;
  target.foe = duel.state.foe;
  target.deck = duel.state.deck;
  target.discard = duel.state.discard;
  target.log = duel.state.log;
  target.cardsPlayed = duel.state.cardsPlayed;
  target.damageDealt = duel.state.damageDealt;
}

/**
 * Set `world` to the named scene (start, play, win or loss; any other name is start)
 * and return the screen to draw over it.
 */
export function stageShot(name, world, seed) {
  if (name === 'play') {
    adopt(world, simulate(seed, PLAY_TURNS, 1));
    return { screen: SCREEN_PLAY };
  }
  if (name === 'win') {
    const duel = simulateWin(seed);
    if (duel) adopt(world, duel);
    else adopt(world, simulate(seed, PLAY_TURNS));
    return { screen: world.state.phase === 'win' ? SCREEN_WIN : SCREEN_PLAY };
  }
  if (name === 'loss') {
    const duel = simulateLoss(seed);
    if (duel) adopt(world, duel);
    else adopt(world, simulate(seed, PLAY_TURNS));
    return { screen: world.state.phase === 'loss' ? SCREEN_LOSS : SCREEN_PLAY };
  }
  world.reset();
  return { screen: SCREEN_TITLE };
}
