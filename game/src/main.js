// Tidehook bootstrap: canvas, fixed-step loop, screen transitions and the ?shot=
// scenes for screenshots. The game itself lives in world.js (rules) and render.js
// (drawing); this file only wires them together.

import { FIELD, STEP } from './config.js';
import { World, SCREEN_TITLE, SCREEN_PLAY, SCREEN_DAY, SCREEN_OVER, SCREEN_WIN } from './world.js';
import { draw } from './render.js';
import { createInput } from './input.js';
import { stageShot } from './shots.js';
import { Sfx } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '20261116');
const shotName = params.get('shot');
const sfx = new Sfx();

let best = 0;
try {
  best = Number(window.localStorage.getItem('tidehook-best') || '0') || 0;
} catch {
  best = 0;
}

const world = new World(seed, sfx, best);
const { input, endFrame } = createInput(canvas);
let paused = false;
let frozen = false;
let time = 0;
let lastStatus = '';

function saveBest() {
  try {
    window.localStorage.setItem('tidehook-best', String(world.best));
  } catch {
    // A browser that blocks storage simply forgets the best score.
  }
}

function updateStatus() {
  const text = world.screen === SCREEN_PLAY
    ? `Day ${world.day}, score ${world.score} of ${world.quota}, ${world.lives} lives, ${Math.ceil(world.timeLeft)} seconds left.`
    : world.screen === SCREEN_TITLE
      ? 'Tidehook title screen. Press Enter to play.'
      : world.screen === SCREEN_DAY
        ? `Day ${world.day} clear. Score ${world.score}. Press Enter for the next day.`
        : world.screen === SCREEN_WIN
          ? `You won. Final score ${world.score}. Press R to play again.`
          : `Game over. Final score ${world.score}. Press R to play again.`;
  if (text !== lastStatus) {
    lastStatus = text;
    status.textContent = text;
  }
}

function handleScreens() {
  if (input.mutePressed) sfx.toggleMute();
  if (input.pausePressed && world.screen === SCREEN_PLAY) paused = !paused;
  if (world.screen === SCREEN_TITLE) {
    if (input.castPressed || input.confirmPressed) {
      sfx.unlock();
      sfx.click();
      world.startRun();
    }
  } else if (world.screen === SCREEN_DAY) {
    if (input.castPressed || input.confirmPressed) {
      sfx.click();
      world.startDay(world.day + 1);
    }
  } else if (world.screen === SCREEN_OVER || world.screen === SCREEN_WIN) {
    saveBest();
    if (input.castPressed || input.confirmPressed || input.restartPressed) {
      sfx.click();
      world.startRun();
    }
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  if (frozen) return;
  const dt = Math.min(0.1, (now - (frame.last || now)) / 1000);
  frame.last = now;
  time += dt;
  handleScreens();
  if (!paused && world.screen !== SCREEN_TITLE) {
    let acc = (frame.acc || 0) + dt;
    let guard = 0;
    while (acc >= STEP && guard < 5) {
      const event = world.step(STEP, input);
      acc -= STEP;
      guard += 1;
      if (event !== 0) saveBest();
    }
    frame.acc = acc;
  } else if (world.screen === SCREEN_TITLE) {
    world.step(dt, { move: 0, pointerX: null, castPressed: false, reelHeld: false });
  }
  endFrame();
  draw(ctx, world, time);
  updateStatus();
}

// A ?shot= scene is staged once and frozen, so the screenshot is deterministic.
if (shotName) {
  const staged = stageShot(shotName, world);
  world.best = staged.best;
  draw(ctx, world, 6.5);
  updateStatus();
  frozen = true;
  window.__tidehook = { world, staged: staged.screen };
  window.__shotReady = true;
} else {
  window.__tidehook = { world };
  requestAnimationFrame(frame);
}
