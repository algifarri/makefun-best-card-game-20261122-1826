// Drawing only: the duel's state and the current screen in, pixels out. The 1280x720
// table is scaled to fit the window and centred, the margin filled with the backdrop
// colour. Flat colours, canvas paths for the four suit glyphs, and canvas text for the
// life totals, energy, log and panels. Nothing here reads input or changes the world.
import {
  CARD,
  END_TURN,
  FIELD,
  FOE_CARD,
  FOE_PANEL,
  FONT,
  LOG,
  PALETTE,
  PLAYER_PANEL,
  SUITS,
  cardCost,
  cardPower,
  foeCardRect,
  playerCardRect,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSS = 'loss';

const PANEL = { width: 640, line: 32, bottom: 64 };

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

/** The suit's glyph, drawn as a flat path so suits differ by shape as well as colour. */
function drawGlyph(context, glyph, x, y, size, color) {
  context.fillStyle = color;
  context.beginPath();
  if (glyph === 'flame') {
    context.moveTo(x, y + size * 0.5);
    context.quadraticCurveTo(x - size * 0.45, y - size * 0.1, x, y - size * 0.55);
    context.quadraticCurveTo(x + size * 0.15, y - size * 0.2, x + size * 0.28, y - size * 0.42);
    context.quadraticCurveTo(x + size * 0.5, y, x + size * 0.28, y + size * 0.32);
    context.quadraticCurveTo(x + size * 0.1, y + size * 0.55, x, y + size * 0.5);
  } else if (glyph === 'leaf') {
    context.ellipse(x, y, size * 0.42, size * 0.55, Math.PI / 4, 0, Math.PI * 2);
  } else if (glyph === 'drop') {
    context.moveTo(x, y - size * 0.55);
    context.quadraticCurveTo(x + size * 0.5, y + size * 0.05, x, y + size * 0.5);
    context.quadraticCurveTo(x - size * 0.5, y + size * 0.05, x, y - size * 0.55);
  } else {
    context.moveTo(x - size * 0.42, y - size * 0.3);
    context.lineTo(x + size * 0.3, y - size * 0.45);
    context.lineTo(x + size * 0.45, y + size * 0.3);
    context.lineTo(x - size * 0.25, y + size * 0.5);
  }
  context.closePath();
  context.fill();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, weight) {
    const key = `${weight || ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight || ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function drawTable() {
    context.fillStyle = PALETTE.table;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.strokeStyle = PALETTE.tableEdge;
    context.lineWidth = 4;
    roundRect(context, 12, 12, FIELD.width - 24, FIELD.height - 24, 26);
    context.stroke();
    context.fillStyle = PALETTE.felt;
    context.beginPath();
    context.ellipse(FIELD.width / 2, 360, 430, 130, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.panelLine;
    context.lineWidth = 2;
    context.stroke();
  }

  function drawLifePanel(panel, name, side, isPlayer) {
    context.fillStyle = PALETTE.panel;
    roundRect(context, panel.x, panel.y, panel.width, panel.height, 12);
    context.fill();
    context.strokeStyle = PALETTE.panelLine;
    context.lineWidth = 2;
    context.stroke();
    text(name, panel.x + 16, panel.y + 30, 22, PALETTE.text, 'left', 'bold ');
    if (isPlayer) {
      // Energy pips, right-aligned on the name row.
      for (let pip = 0; pip < side.maxEnergy; pip += 1) {
        context.fillStyle = pip < side.energy ? PALETTE.energy : '#4a3a28';
        context.beginPath();
        context.arc(panel.x + panel.width - 14 - (side.maxEnergy - 1 - pip) * 14, panel.y + 24, 6, 0, Math.PI * 2);
        context.fill();
      }
    }
    const lifeText = `Life ${side.life}/30`;
    text(lifeText, panel.x + 16, panel.y + 68, 28, PALETTE.life, 'left', 'bold ');
    if (side.shield > 0) {
      const lifeWidth = context.measureText(lifeText).width;
      text(`Shield ${side.shield}`, panel.x + 16 + lifeWidth + 14, panel.y + 68, 22, PALETTE.shield, 'left', 'bold ');
    }
  }

  function drawCardBack(rect, index) {
    context.fillStyle = PALETTE.cardBack;
    roundRect(context, rect.x, rect.y, rect.width, rect.height, 10);
    context.fill();
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 3;
    roundRect(context, rect.x + 6, rect.y + 6, rect.width - 12, rect.height - 12, 7);
    context.stroke();
    drawGlyph(context, 'flame', rect.x + rect.width / 2, rect.y + rect.height / 2, 44, PALETTE.gold);
    void index;
  }

  function drawCard(card, rect, index, affordable, raised) {
    const suit = SUITS[card.suit];
    const y = raised ? rect.y - 18 : rect.y;
    context.fillStyle = affordable ? PALETTE.cardFace : '#d8cdb4';
    roundRect(context, rect.x, y, rect.width, rect.height, 12);
    context.fill();
    context.strokeStyle = suit.dark;
    context.lineWidth = 4;
    context.stroke();
    // Cost pips, top left.
    for (let pip = 0; pip < cardCost(card); pip += 1) {
      context.fillStyle = PALETTE.energy;
      context.beginPath();
      context.arc(rect.x + 16 + pip * 17, y + 18, 7, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#8a6d1f';
      context.lineWidth = 1.5;
      context.stroke();
    }
    // Suit name, top right.
    text(suit.name, rect.x + rect.width - 12, y + 26, 15, suit.dark, 'right', 'bold ');
    // The big value.
    text(String(card.value), rect.x + rect.width / 2, y + 108, 62, PALETTE.cardInk, 'center', 'bold ');
    drawGlyph(context, suit.glyph, rect.x + rect.width / 2, y + 148, 34, suit.color);
    // Kind name and power line.
    const kindName = card.kind === 'strike' ? 'Strike' : card.kind === 'guard' ? 'Guard' : 'Mend';
    text(kindName, rect.x + rect.width / 2, y + 172, 19, PALETTE.cardInk, 'center', 'bold ');
    const power = cardPower(card);
    const line = card.kind === 'strike' ? `Deal ${power} damage`
      : card.kind === 'guard' ? `Gain ${power} shield`
      : `Heal ${power} life`;
    text(line, rect.x + rect.width / 2, y + 194, 13, suit.dark, 'center');
    void index;
  }

  function drawLog(lines) {
    context.textBaseline = 'top';
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], LOG.x, LOG.y + index * 24, 17, index === 0 ? PALETTE.text : PALETTE.muted, 'left');
    }
    context.textBaseline = 'alphabetic';
  }

  function drawEndTurn(enabled) {
    context.fillStyle = enabled ? PALETTE.gold : '#5a4a28';
    roundRect(context, END_TURN.x, END_TURN.y, END_TURN.width, END_TURN.height, 12);
    context.fill();
    text('End Turn', END_TURN.x + END_TURN.width / 2, END_TURN.y + 37, 24, '#241a13', 'center', 'bold ');
    text('[Space]', END_TURN.x + END_TURN.width / 2, END_TURN.y + 52, 12, '#5a4a28', 'center');
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = 120 + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(20, 16, 12, 0.82)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    roundRect(context, x, y, PANEL.width, height, 16);
    context.fill();
    context.strokeStyle = accent || PALETTE.panelLine;
    context.lineWidth = 3;
    context.stroke();
    text(title, FIELD.width / 2, y + 72, 46, accent || PALETTE.text, 'center', 'bold ');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + 128 + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 30, 22, PALETTE.gold, 'center');
  }

  const TITLE_LINES = [
    'A turn-based duel of cards against the Ashen Warden.',
    'Strike, Guard and Mend across four suits — Ember, Leaf, Tide, Stone.',
    'Play a card with a click or keys 1-5. End your turn with Space.',
    'Reduce the Warden to 0 life to win. Fall to 0 and the embers fade.',
  ];

  /** Paint one frame: the table, both hands, the panels, then a screen overlay. */
  function draw(state, screen, fx) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawTable();
    drawLifePanel(FOE_PANEL, 'Ashen Warden', state.foe, false);
    drawLifePanel(PLAYER_PANEL, 'You', state.player, true);
    text(`Turn ${state.turn}`, FIELD.width / 2, 52, 22, PALETTE.muted, 'center', 'bold ');
    for (let index = 0; index < state.foe.hand.length; index += 1) {
      drawCardBack(foeCardRect(index, state.foe.hand.length), index);
    }
    text(`Warden's hand · ${state.foe.hand.length} cards`, FIELD.width / 2, 262, 16, PALETTE.muted, 'center');
    text(`Deck ${state.deck.length} · Discard ${state.discard.length}`, FIELD.width / 2, 286, 16, PALETTE.muted, 'center');
    const hovered = fx && typeof fx.hover === 'number' ? fx.hover : -1;
    for (let index = 0; index < state.player.hand.length; index += 1) {
      const card = state.player.hand[index];
      drawCard(card, playerCardRect(index, state.player.hand.length), index,
        cardCost(card) <= state.player.energy, index === hovered);
    }
    drawLog(state.log);
    drawEndTurn(screen === SCREEN_PLAY);

    if (fx && fx.floats) {
      for (const item of fx.floats) {
        const alpha = Math.max(0, 1 - item.age / 1.2);
        context.globalAlpha = alpha;
        text(item.label, item.x, item.y - item.age * 40, 30, item.color, 'center', 'bold ');
        context.globalAlpha = 1;
      }
    }

    if (screen === SCREEN_TITLE) {
      drawPanel('EMBER COURT', TITLE_LINES, 'Click or press Space to begin the duel');
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The Warden waits. Your hand is safe.'], 'Press Esc or P to resume', PALETTE.gold);
    } else if (screen === SCREEN_WIN) {
      drawPanel('VICTORY', [
        `The Ashen Warden falls. The court is yours.`,
        `Won in ${state.turn} turns · ${state.cardsPlayed} cards played · ${state.damageDealt} damage dealt.`,
        `Your life: ${state.player.life} / 30.`,
      ], 'Press Space or click to duel again', PALETTE.gold);
    } else if (screen === SCREEN_LOSS) {
      drawPanel('DEFEAT', [
        `The Warden stands over the cold embers.`,
        `You fell on turn ${state.turn} · ${state.cardsPlayed} cards played.`,
        `The Warden had ${state.foe.life} life left.`,
      ], 'Press Space or click to try again', PALETTE.ember);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view };
}
