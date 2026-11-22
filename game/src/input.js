// Keyboard and pointer input. Number keys 1-5 play a card, Space ends the turn,
// Esc or P pauses, Enter or a click confirms on the title and end screens. One-shot
// presses are queued as bit flags and taken once by the loop, so a press between two
// frames is never lost and never counted twice. Pointer clicks are reported as a
// logical position so the loop can hit-test cards and buttons.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_END_TURN = 4;

const PLAY_KEYS = new Set(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5']);
const END_TURN_KEYS = new Set(['Space']);
const CONFIRM_KEYS = new Set(['Enter']);
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);

export function createInput(target) {
  let actions = 0;
  let cardKey = -1;
  let click = null;

  window.addEventListener('keydown', (event) => {
    if (PLAY_KEYS.has(event.code)) {
      if (!event.repeat) cardKey = Number(event.code.slice(-1)) - 1;
    } else if (END_TURN_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_END_TURN;
    } else if (CONFIRM_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  target.addEventListener('pointerdown', (event) => {
    const rect = target.getBoundingClientRect();
    click = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  });

  return {
    /** One-shot action flags since the last call. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Index 0-4 of a card key pressed since the last call, or -1. */
    takeCardKey() {
      const taken = cardKey;
      cardKey = -1;
      return taken;
    },
    /** The last pointer click in CSS pixels since the last call, or null. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
  };
}
