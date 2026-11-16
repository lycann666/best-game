// The screenshot scenes behind ?shot=start|play|catch|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot, so the frame is what a short game really looks like and the same seed
// always gives the same frame.

import { FIELD, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './world.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;
const SAMPLE = STEP;

/** The nearest catchable fish, or null when the water is empty. */
function nearestFish(world) {
  let best = null;
  let bestDx = Infinity;
  for (const fish of world.fishes) {
    if (fish.kind === 'shark' || fish.kind === 'boot') continue;
    // Only chase fish at a depth the hook can actually reach: chasing a
    // deep fish drags the boat to the edge and it never casts.
    if (Math.abs(fish.y - 320) > 260) continue;
    const dx = Math.abs(fish.x - world.boat.x);
    if (dx < bestDx) {
      bestDx = dx;
      best = fish;
    }
  }
  return best;
}

/** Steer toward the nearest fish and cast when lined up over it. */
function autopilotInput(world, reel) {
  const input = {
    move: 0,
    pointerX: null,
    castPressed: false,
    reelHeld: false,
    confirmPressed: false,
    restartPressed: false,
    pausePressed: false,
    mutePressed: false,
  };
  const fish = nearestFish(world);
  if (!fish) {
    // Nothing in casting range: drift back to mid-water and wait.
    if (world.hook.state === 'idle') {
      input.move = world.boat.x < 620 ? 1 : world.boat.x > 660 ? -1 : 0;
    }
    return input;
  }
  const dx = fish.x - world.boat.x;
  if (world.hook.state === 'idle') {
    input.move = dx > 24 ? 1 : dx < -24 ? -1 : 0;
    if (Math.abs(dx) < 28 && Math.abs(fish.y - 320) < 260) input.castPressed = true;
  } else if (world.hook.state === 'hooked') {
    input.reelHeld = reel;
    // Ease off when the line runs hot, like a careful player.
    if (world.hook.tension > 72) input.reelHeld = false;
  }
  return input;
}

/**
 * Set `world` to the named scene and return the screen to draw and the best score
 * to show. start: the title over a live sea. play: mid-game with a score. catch:
 * a fish on the line, tension showing. end: the game-over screen after a run
 * that never reeled anything in.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'catch' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / SAMPLE; i += 1) {
      world.step(SAMPLE, { move: 0, pointerX: null, castPressed: false, reelHeld: false });
    }
    return { screen: SCREEN_TITLE, best: world.best };
  }
  world.startRun();
  if (name === 'catch') {
    // Stop just after a DEEP hook-up: reel ~0.4s so the tension bar has
    // filled in, while the fish is still clearly underwater. A shallow
    // hook-up ends up hidden behind the boat. The depth latches at hook
    // time (the fish rises as it is reeled, so the depth test cannot be
    // re-checked every frame). Prefer a hook-up with the boat mid-frame;
    // if the day's quota is met first, keep fishing the next day.
    let hookedFrames = 0;
    let deepStart = false;
    // Deep hook-ups are rare on days 1-2 (sunny tops out at 330, bubblegill
    // at 430); they become routine on day 3 (glowbelly 430-630). Play
    // forward from day 1 with a long cap so the scene reaches day 3 with
    // a real score instead of staging day 3 from zero.
    for (let i = 0; i < 240 / SAMPLE; i += 1) {
      const event = world.step(SAMPLE, autopilotInput(world, true));
      if (event === 1) {
        world.startDay(world.day + 1);
        deepStart = false;
        hookedFrames = 0;
        continue;
      }
      if (world.screen !== SCREEN_PLAY) break;
      if (world.hook.state === 'hooked') {
        if (world.hook.y > 380) deepStart = true;
        if (deepStart) {
          hookedFrames += 1;
          const midFrame = world.boat.x > 280 && world.boat.x < 1000;
          if (hookedFrames >= 24 && midFrame) break;
          if (hookedFrames >= 90) break;
        }
      } else {
        deepStart = false;
        hookedFrames = 0;
      }
    }
    return { screen: world.screen, best: world.best };
  }
  if (name === 'end') {
    // A real run that falls short: day 3's quota (340) is out of reach in 75
    // seconds for a decent pilot, so the sun sets on a genuine score.
    world.startDay(3);
    for (let i = 0; i < END_LIMIT_SECONDS / SAMPLE; i += 1) {
      const event = world.step(SAMPLE, autopilotInput(world, true));
      if (event === 1) world.startDay(world.day + 1);
      if (world.screen === SCREEN_OVER) break;
    }
    return { screen: world.screen, best: world.best };
  }
  // Mid-game: stop once a couple of fish are in, with the hook down
  // mid-water, the boat mid-frame and fish around the hook — the frame
  // a player actually sees in the middle of a good run.
  for (let i = 0; i < PLAY_SECONDS / SAMPLE; i += 1) {
    const event = world.step(SAMPLE, autopilotInput(world, true));
    if (event === 1) world.startDay(world.day + 1); // quota met: keep playing
    if (world.screen !== SCREEN_PLAY) break;
    const hook = world.hook;
    const nearFish = world.fishes.filter((f) => f.kind !== 'shark'
      && Math.hypot(f.x - hook.x, f.y - hook.y) < 320).length;
    // The hook spends only a few frames sinking before it meets a fish, so
    // count any down-line state (sinking / hooked / returning) as "fishing".
    const lineDown = hook.state === 'sinking' || hook.state === 'hooked'
      || hook.state === 'returning';
    const framed = world.score >= 25 && lineDown
      && hook.y > 200 && hook.y < 560
      && world.boat.x > 300 && world.boat.x < 980 && nearFish >= 1;
    if (framed) break;
  }
  return { screen: world.screen, best: world.best };
}
