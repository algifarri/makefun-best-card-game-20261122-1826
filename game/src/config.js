// Every tuning number, colour and layout rect in one place. The table is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below
// depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** Starting life for both duelists. */
export const START_LIFE = 30;
/** Cards in hand at the start, and the most a hand can hold. */
export const HAND_SIZE = 5;
/** Cards drawn at the start of each side's turn. */
export const DRAW_PER_TURN = 2;
/** Energy on turn 1, growing by 1 a turn up to ENERGY_MAX. */
export const ENERGY_START = 3;
export const ENERGY_MAX = 8;
/** Cards in the shared deck (4 suits x 10 values). */
export const DECK_SIZE = 40;

export const STEP = 1 / 60;

/** The four suits. Each suit has its own colour, drawn shape and flavour effect. */
export const SUITS = {
  ember: { name: 'Ember', color: '#e5533d', dark: '#8f2b1d', glyph: 'flame', bonus: '+2 damage' },
  leaf: { name: 'Leaf', color: '#4caf50', dark: '#2a6b2e', glyph: 'leaf', bonus: '+2 healing' },
  tide: { name: 'Tide', color: '#3d9be5', dark: '#1d5a8f', glyph: 'drop', bonus: '+2 shield' },
  stone: { name: 'Stone', color: '#b08d57', dark: '#6b5433', glyph: 'stone', bonus: 'costs 1 less' },
};
export const SUIT_KEYS = ['ember', 'leaf', 'tide', 'stone'];

/** The three card kinds. */
export const KINDS = {
  strike: { name: 'Strike', verb: 'deals', target: 'damage' },
  guard: { name: 'Guard', verb: 'gains', target: 'shield' },
  mend: { name: 'Mend', verb: 'restores', target: 'life' },
};

/**
 * Energy cost of a card: value 1-3 costs 1, 4-6 costs 2, 7-9 costs 3, 10 costs 4;
 * Stone cards cost 1 less (never below 1).
 */
export function cardCost(card) {
  const base = 1 + Math.floor((card.value - 1) / 3);
  return card.suit === 'stone' ? Math.max(1, base - 1) : base;
}

/** The number a card actually applies, after its suit's flavour bonus. */
export function cardPower(card) {
  if (card.kind === 'strike' && card.suit === 'ember') return card.value + 2;
  if (card.kind === 'mend' && card.suit === 'leaf') return card.value + 2;
  if (card.kind === 'guard' && card.suit === 'tide') return card.value + 2;
  return card.value;
}

/** Card geometry on the table. */
export const CARD = { width: 150, height: 200, gap: 14 };
export const FOE_CARD = { width: 104, height: 140, gap: 10 };

/** Rect of the player's i-th card in hand (hand is centred, bottom of the table). */
export function playerCardRect(index, handSize) {
  const total = handSize * CARD.width + (handSize - 1) * CARD.gap;
  const x = (FIELD.width - total) / 2 + index * (CARD.width + CARD.gap);
  return { x, y: FIELD.height - CARD.height - 26, width: CARD.width, height: CARD.height };
}

/** Rect of the Warden's i-th face-down card (centred, top of the table). */
export function foeCardRect(index, handSize) {
  const total = handSize * FOE_CARD.width + (handSize - 1) * FOE_CARD.gap;
  const x = (FIELD.width - total) / 2 + index * (FOE_CARD.width + FOE_CARD.gap);
  return { x, y: 96, width: FOE_CARD.width, height: FOE_CARD.height };
}

export const END_TURN = { x: FIELD.width - 218, y: FIELD.height - 96, width: 190, height: 58 };
export const PLAYER_PANEL = { x: 24, y: FIELD.height - 118, width: 210, height: 92 };
export const FOE_PANEL = { x: FIELD.width - 274, y: 24, width: 250, height: 92 };
export const LOG = { x: 24, y: 300, width: 300 };

export const PALETTE = {
  backdrop: '#14100c',
  table: '#2b1d16',
  tableEdge: '#4a2f1f',
  felt: '#33241a',
  panel: '#241a13',
  panelLine: '#5a3d24',
  text: '#f5ead9',
  muted: '#c9a06a',
  gold: '#f2c94c',
  ember: '#e5533d',
  leaf: '#4caf50',
  tide: '#3d9be5',
  stone: '#b08d57',
  cardFace: '#f7efdd',
  cardInk: '#241a13',
  cardBack: '#7a2e1d',
  life: '#e5533d',
  shield: '#3d9be5',
  energy: '#f2c94c',
  dim: '#8b7a66',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Card backs shown on the title screen's backdrop table. */
export const BEST_KEY = 'ember-court.best';
