# makefun-best-card-game-20261122-1826

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/algifarri/makefun-best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/algifarri/makefun-best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

**EMBER COURT — a turn-based duel card game.** You sit across the table from
the Ashen Warden, both at 30 life, with a 40-card deck of four suits — Ember,
Leaf, Tide and Stone. Each turn you gain energy and draw cards, then play
from a hand of five: Strike to deal damage, Guard to raise a shield, Mend to
heal. Suits bend the rules: Ember strikes hit +2, Leaf mends heal +2, Tide
guards shield +2, and Stone cards cost 1 less energy. The Warden answers
every turn with its own readable policy — it heals when hurt, guards when
exposed, and otherwise hits you with its hardest card — so each hand is a
decision about tempo, defence and the killing blow. Win by reducing the
Warden to 0 life; fall to 0 and the embers fade.

Runs entirely from static files in a desktop browser: no build step, no
network, no dependencies. Click a card or press 1-5 to play it, Space to end
your turn, Esc or P to pause. Title screen, live table with your hand and the
Warden's face-down hand, readable card values / suits / costs, life and
shield totals for both sides, and win and loss screens.

The source is split one job per file under `game/src/` (config, random,
world, input, render, shots, main). `main.ts` is the hand-in program: it
copies `game/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library.

## Run it

```sh
node serve.ts
# then open http://localhost:8080 in a desktop browser
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=ajkq5baq&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
