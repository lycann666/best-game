# best-game

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/lycann666/best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/lycann666/best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Tidehook — a pocket fishing arcade. Steer a little boat over a sunset bay, cast your hook, and catch the day's quota before the sun sets. Reel in against the line tension — pull too hard while the fish fights and the line snaps. A shark patrols the deep water and eats hooked fish. Five days stand between you and Master Angler.

## Run it

```sh
node serve.ts   # then open http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=5f3j6jyb&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>

## How to play

- **Move the boat:** mouse or ← / → (A / D)
- **Cast / reel in early:** click or Space
- **Reel in a hooked fish:** hold click or Space — ease off when the tension
  bar runs red
- **Pause:** P · **Mute:** M · **Restart:** R (on the end screens)

## Rules

- Each day has a score quota and 75 seconds of daylight. Reach the quota and
  the day clears with a time bonus; miss it and the sun sets on your run.
- Fish are worth 10–100 points by species. Catches in a row build a combo
  multiplier (up to +200%). Junk (an old boot) is worth −5 and breaks the combo.
- The line snaps at full tension: the fish is lost and the combo resets.
- A shark that reaches a hooked fish eats it and costs one life. Three lives.
- Day 5's quota is 650 — clear it to become Master Angler.

## Play it

```sh
node serve.ts   # then open http://localhost:8080
```

No build step, no network request: `game/` is plain static files, all art is
drawn on canvas and all sound is synthesised with WebAudio.

## Entry

`main.ts` copies `game/` and `screenshots/` to `/output` and writes
`/output/dossier.json` with the vendored `vendor/makefun-game.ts` library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots are staged by the game's own `?shot=start|play|catch|end` scenes,
which play the real rules forward with a seeded autopilot.
