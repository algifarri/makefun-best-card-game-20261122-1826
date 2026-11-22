// The duel's rules and state, with no drawing and no browser in it: the 40-card deck,
// the two hands, energy, life and shield, playing a card, the Warden's turn, and
// winning or losing. Every function is pure over the state it is given, so the same
// seed always plays the same duel.
import {
  DRAW_PER_TURN,
  ENERGY_MAX,
  ENERGY_START,
  HAND_SIZE,
  START_LIFE,
  SUIT_KEYS,
  cardCost,
  cardPower,
} from './config.js';

export const EVENT_NONE = 0;
export const EVENT_PLAYED = 1;
export const EVENT_WIN = 2;
export const EVENT_LOSS = 4;
export const EVENT_TURN = 8;

export function kindOf(value) {
  return value % 3 === 0 ? 'mend' : value % 3 === 1 ? 'strike' : 'guard';
}

/** Build the 40-card deck: every suit carries values 1-10, the kind follows the value. */
export function buildDeck() {
  const deck = [];
  for (const suit of SUIT_KEYS) {
    for (let value = 1; value <= 10; value += 1) {
      deck.push({ suit, kind: kindOf(value), value, id: `${suit}-${value}` });
    }
  }
  return deck;
}

function shuffle(deck, random) {
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    const held = deck[index];
    deck[index] = deck[other];
    deck[other] = held;
  }
}

export function createDuel(random) {
  const state = {
    turn: 0,
    phase: 'title',
    player: null,
    foe: null,
    deck: [],
    discard: [],
    log: [],
    cardsPlayed: 0,
    damageDealt: 0,
  };

  function newSide() {
    return { life: START_LIFE, shield: 0, energy: 0, maxEnergy: ENERGY_START, hand: [] };
  }

  function drawCards(side, count) {
    let drawn = 0;
    for (let n = 0; n < count; n += 1) {
      if (side.hand.length >= HAND_SIZE) break;
      if (state.deck.length === 0) {
        if (state.discard.length === 0) break;
        state.deck = state.discard;
        state.discard = [];
        shuffle(state.deck, random);
      }
      side.hand.push(state.deck.pop());
      drawn += 1;
    }
    return drawn;
  }

  function say(message) {
    state.log.unshift(message);
    if (state.log.length > 3) state.log.length = 3;
  }

  function startTurn(side, isPlayer) {
    side.shield = 0;
    side.maxEnergy = Math.min(ENERGY_MAX, ENERGY_START + state.turn - 1);
    side.energy = side.maxEnergy;
    const drawn = drawCards(side, DRAW_PER_TURN);
    if (drawn > 0) say(`${isPlayer ? 'You draw' : 'Warden draws'} ${drawn}.`);
  }

  function reset() {
    state.turn = 1;
    state.phase = 'play';
    state.player = newSide();
    state.foe = newSide();
    state.deck = buildDeck();
    shuffle(state.deck, random);
    state.discard = [];
    state.log = [];
    state.cardsPlayed = 0;
    state.damageDealt = 0;
    drawCards(state.player, HAND_SIZE);
    drawCards(state.foe, HAND_SIZE);
    startTurn(state.player, true);
    say('The duel begins. Your move.');
  }

  /** Damage after shield: shield soaks first, the rest hits life. Returns life lost. */
  function hurt(side, amount) {
    const soaked = Math.min(side.shield, amount);
    side.shield -= soaked;
    const rest = amount - soaked;
    side.life = Math.max(0, side.life - rest);
    return rest;
  }

  function checkEnd() {
    if (state.foe.life <= 0) {
      state.phase = 'win';
      return EVENT_WIN;
    }
    if (state.player.life <= 0) {
      state.phase = 'loss';
      return EVENT_LOSS;
    }
    return EVENT_NONE;
  }

  /**
   * Play the card at `index` from `side`'s hand against `target`. Returns an event
   * bitmask, or 0 when the card cannot be played (wrong phase, not your card, or
   * not enough energy).
   */
  function playCard(side, target, index) {
    if (state.phase !== 'play' || index < 0 || index >= side.hand.length) return EVENT_NONE;
    const card = side.hand[index];
    const cost = cardCost(card);
    if (side.energy < cost) return EVENT_NONE;
    side.energy -= cost;
    side.hand.splice(index, 1);
    state.discard.push(card);
    state.cardsPlayed += 1;
    const power = cardPower(card);
    const who = side === state.player ? 'You' : 'Warden';
    const whom = side === state.player ? 'Warden' : 'you';
    if (card.kind === 'strike') {
      const lost = hurt(target, power);
      state.damageDealt += side === state.player ? lost : 0;
      say(`${who} Strike ${card.suit} ${card.value}: ${power} dmg to ${whom}.`);
    } else if (card.kind === 'guard') {
      side.shield += power;
      say(`${who} Guard ${card.suit} ${card.value}: +${power} shield.`);
    } else {
      side.life = Math.min(START_LIFE, side.life + power);
      say(`${who} Mend ${card.suit} ${card.value}: +${power} life.`);
    }
    return EVENT_PLAYED | checkEnd();
  }

  /** The Warden's policy: heal when hurt, guard when exposed, else hit the hardest. */
  function foeChoose() {
    const foe = state.foe;
    const hand = foe.hand;
    let best = -1;
    let bestScore = -1;
    for (let index = 0; index < hand.length; index += 1) {
      const card = hand[index];
      const cost = cardCost(card);
      if (cost > foe.energy) continue;
      let score = cardPower(card);
      if (card.kind === 'mend' && foe.life < START_LIFE - 6) score += 14;
      if (card.kind === 'mend' && foe.life >= START_LIFE - 6) score -= 20;
      if (card.kind === 'guard' && foe.shield === 0) score += 6;
      if (card.kind === 'guard' && foe.shield > 0) score -= 8;
      if (card.kind === 'strike') score += 4;
      score -= cost;
      if (score > bestScore) {
        bestScore = score;
        best = index;
      }
    }
    return best;
  }

  /** End the player's turn: the Warden plays, draws, and the next turn begins. */
  function endTurn() {
    if (state.phase !== 'play') return EVENT_NONE;
    let events = EVENT_NONE;
    let guard = 0;
    while (guard < 12) {
      guard += 1;
      const index = foeChoose();
      if (index < 0) break;
      events |= playCard(state.foe, state.player, index);
      if (state.phase !== 'play') return events;
    }
    say('Warden ends its turn.');
    state.turn += 1;
    startTurn(state.player, true);
    startTurn(state.foe, false);
    return events | EVENT_TURN;
  }

  reset();
  return { state, reset, playCard, endTurn, foeChoose, drawCards, startTurn, checkEnd };
}
