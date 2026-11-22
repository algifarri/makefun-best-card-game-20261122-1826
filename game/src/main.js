// Boot and the one loop: input is read every frame, floating damage numbers age out,
// and the renderer paints what is there. The game moves between five screens: title,
// play, paused, win and loss. Clicking a card plays it; Space ends the turn.
//
// ?seed=N fixes the shuffle. ?shot=start|play|win|loss (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for
// a screenshot.
import { END_TURN, FIELD, FOE_PANEL, PLAYER_PANEL, cardCost, playerCardRect } from './config.js';
import { createRandom } from './random.js';
import { EVENT_LOSS, EVENT_PLAYED, EVENT_WIN, createDuel } from './world.js';
import { ACTION_CONFIRM, ACTION_END_TURN, ACTION_PAUSE, createInput } from './input.js';
import {
  SCREEN_LOSS,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const duel = createDuel(createRandom(seed));
const renderer = createRenderer(canvas);
const fx = { floats: [], hover: -1 };

function runShot(name) {
  const scene = stageShot(name, duel, seed);
  let painted = 0;
  function paint() {
    renderer.draw(duel.state, scene.screen, fx);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    duel.reset();
    fx.floats.length = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Ember Court: you against the Ashen Warden.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_LOSS;
    announce(won ? 'Victory. The Ashen Warden falls.' : 'Defeat. The embers fade.');
  }

  function addFloat(label, x, y, color) {
    fx.floats.push({ label, x, y, color, age: 0 });
    if (fx.floats.length > 6) fx.floats.shift();
  }

  function playCard(index) {
    if (screen !== SCREEN_PLAY) return;
    const { player, foe } = duel.state;
    if (index < 0 || index >= player.hand.length) return;
    const card = player.hand[index];
    if (cardCost(card) > player.energy) {
      announce('Not enough energy for that card.');
      return;
    }
    const foeLifeBefore = foe.life;
    const events = duel.playCard(player, foe, index);
    if (!(events & EVENT_PLAYED)) return;
    if (card.kind === 'strike') {
      addFloat(`-${foeLifeBefore - foe.life}`, FOE_PANEL.x + FOE_PANEL.width / 2, FOE_PANEL.y + 46, '#e5533d');
    } else if (card.kind === 'mend') {
      addFloat(`+${card.value}`, PLAYER_PANEL.x + PLAYER_PANEL.width / 2, PLAYER_PANEL.y + 46, '#4caf50');
    } else {
      addFloat(`+${card.value} shield`, PLAYER_PANEL.x + PLAYER_PANEL.width / 2, PLAYER_PANEL.y + 46, '#3d9be5');
    }
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_LOSS) endGame(false);
  }

  function endTurn() {
    if (screen !== SCREEN_PLAY) return;
    const playerLifeBefore = duel.state.player.life;
    const events = duel.endTurn();
    const lost = playerLifeBefore - duel.state.player.life;
    if (lost > 0) {
      addFloat(`-${lost}`, PLAYER_PANEL.x + PLAYER_PANEL.width / 2, PLAYER_PANEL.y + 46, '#e5533d');
    }
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_LOSS) endGame(false);
  }

  function hitTestCard(logicalX, logicalY) {
    const hand = duel.state.player.hand;
    for (let index = hand.length - 1; index >= 0; index -= 1) {
      const rect = playerCardRect(index, hand.length);
      if (logicalX >= rect.x && logicalX <= rect.x + rect.width && logicalY >= rect.y - 18 && logicalY <= rect.y + rect.height) return index;
    }
    return -1;
  }

  function handleClick(cssX, cssY) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const offsetX = (rect.width - FIELD.width * scale) / 2;
    const offsetY = (rect.height - FIELD.height * scale) / 2;
    const x = (cssX - offsetX) / scale;
    const y = (cssY - offsetY) / scale;
    if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSS) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const card = hitTestCard(x, y);
    if (card >= 0) {
      playCard(card);
      return;
    }
    if (x >= END_TURN.x && x <= END_TURN.x + END_TURN.width && y >= END_TURN.y && y <= END_TURN.y + END_TURN.height) {
      endTurn();
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    const cardKey = input.takeCardKey();
    const click = input.takeClick();
    if (click) handleClick(click.x, click.y);
    if (cardKey >= 0) playCard(cardKey);
    if (actions & ACTION_END_TURN) {
      if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSS) startGame();
      else if (screen === SCREEN_PLAY) endTurn();
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSS)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function trackHover(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const offsetX = (rect.width - FIELD.width * scale) / 2;
    const offsetY = (rect.height - FIELD.height * scale) / 2;
    const x = (event.clientX - rect.left - offsetX) / scale;
    const y = (event.clientY - rect.top - offsetY) / scale;
    fx.hover = screen === SCREEN_PLAY ? hitTestCard(x, y) : -1;
  }
  canvas.addEventListener('pointermove', trackHover);

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    handleActions();
    for (const item of fx.floats) item.age += dt;
    fx.floats = fx.floats.filter((item) => item.age < 1.2);
    renderer.draw(duel.state, screen, fx);
  }

  // Leaving the tab pauses a running game rather than letting the Warden play unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Ember Court. Press Space or click to begin the duel.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
