// Tidehook world: the rules. No drawing here, no sound here beyond the Sfx calls —
// this file is the whole game as pure state plus one fixed step, so the screenshot
// scenes and the playtest can run it forward without a browser.

import {
  FIELD, STEP, DAY_SECONDS, START_LIVES, MAX_COMBO,
  BOAT, HOOK, CAST, SPECIES, SHARK, DAYS, SCORE,
} from './config.js';
import { makeRng, range, pick, chance } from './rng.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_DAY = 'dayclear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

export const EVENT_NONE = 0;
export const EVENT_DAYCLEAR = 1;
export const EVENT_OVER = 2;
export const EVENT_WIN = 4;

let nextFishId = 1;

function makeFish(rng, day, kind) {
  const spec = kind === 'shark' ? SHARK : SPECIES[kind];
  const dir = chance(rng, 0.5) ? 1 : -1;
  const depth = range(rng, spec.depthMin, spec.depthMax);
  return {
    id: nextFishId++,
    kind,
    // Spawn anywhere across the water, not just at the edges, so the sea
    // reads as alive from the first seconds of a day.
    x: range(rng, 60, FIELD.width - 60),
    baseY: depth,
    y: depth,
    dir,
    speed: range(rng, spec.speedMin, spec.speedMax) * (1 + (day - 1) * 0.06),
    radius: spec.radius,
    phase: rng() * Math.PI * 2,
    wobbleAmp: kind === 'boot' ? 2 : range(rng, 4, 12),
    wobbleFreq: range(rng, 1.2, 2.4),
    dartTimer: range(rng, 1, 3),
    darting: 0,
    wanderTimer: range(rng, 2, 5),
    struggle: 0,
    struggleTimer: range(rng, 0.4, 1.2),
    t: 0,
  };
}

export class World {
  constructor(seed, sfx, best = 0) {
    this.rng = makeRng(seed);
    this.sfx = sfx;
    this.best = best;
    this.reset();
  }

  reset() {
    this.screen = SCREEN_TITLE;
    this.day = 1;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.lives = START_LIVES;
    this.timeLeft = DAY_SECONDS;
    this.quota = DAYS[0].quota;
    this.caught = 0;
    this.casts = 0;
    this.snaps = 0;
    this.boat = { x: FIELD.width / 2, tilt: 0 };
    this.hook = { state: 'idle', x: FIELD.width / 2, y: FIELD.surfaceY, tension: 0, fish: null, cooldown: 0 };
    this.fishes = [];
    this.particles = [];
    this.floats = [];
    this.spawnTimer = 0.4;
    this.elapsed = 0;
    this.dayScore = 0;
    this.timeBonus = 0;
    for (let i = 0; i < 5; i += 1) this.spawnFish();
  }

  startDay(day) {
    const cfg = DAYS[day - 1];
    this.day = day;
    this.quota = cfg.quota;
    this.dayScore = 0;
    this.timeLeft = DAY_SECONDS;
    this.fishes = [];
    this.hook = { state: 'idle', x: this.boat.x, y: FIELD.surfaceY, tension: 0, fish: null, cooldown: 0 };
    this.spawnTimer = 0.3;
    this.screen = SCREEN_PLAY;
    for (let i = 0; i < 5; i += 1) this.spawnFish();
  }

  startRun() {
    this.reset();
    this.startDay(1);
  }

  dayConfig() {
    return DAYS[this.day - 1];
  }

  quotaProgress() {
    return Math.min(1, this.dayScore / this.quota);
  }

  comboMultiplier() {
    return 1 + SCORE.comboStep * Math.min(this.combo, MAX_COMBO);
  }

  spawnFish() {
    const cfg = this.dayConfig();
    if (this.fishes.length >= cfg.maxFish + cfg.sharks) return;
    const sharksNow = this.fishes.filter((f) => f.kind === 'shark').length;
    if (sharksNow < cfg.sharks && chance(this.rng, 0.3)) {
      this.fishes.push(makeFish(this.rng, this.day, 'shark'));
      return;
    }
    if (chance(this.rng, 0.07)) {
      this.fishes.push(makeFish(this.rng, this.day, 'boot'));
      return;
    }
    const kind = chance(this.rng, cfg.koiChance) ? 'kingkoi' : pick(this.rng, cfg.kinds);
    this.fishes.push(makeFish(this.rng, this.day, kind));
  }

  cast() {
    if (this.hook.state !== 'idle' || this.hook.cooldown > 0) return;
    this.hook.state = 'sinking';
    this.hook.x = this.boat.x;
    this.hook.y = FIELD.surfaceY + 6;
    this.hook.tension = 0;
    this.hook.fish = null;
    this.casts += 1;
    this.sfx.splash();
    this.burst(this.hook.x, FIELD.surfaceY, 10, '#cfeeff', 90);
  }

  reelEarly() {
    if (this.hook.state === 'sinking') this.hook.state = 'returning';
  }

  burst(x, y, n, color, speed) {
    for (let i = 0; i < n; i += 1) {
      const a = this.rng() * Math.PI * 2;
      const v = range(this.rng, speed * 0.3, speed);
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30,
        life: range(this.rng, 0.4, 0.9), maxLife: 0.9, color, size: range(this.rng, 2, 5),
      });
    }
  }

  floatText(x, y, text, color) {
    this.floats.push({ x, y, text, color, life: 1.1 });
  }

  award(fish) {
    const spec = SPECIES[fish.kind];
    const mult = this.comboMultiplier();
    const points = Math.round(spec.value * mult);
    this.score += points;
    this.dayScore += points;
    this.caught += 1;
    this.floatText(fish.x, fish.y - 24, (points > 0 ? '+' : '') + points, points >= 0 ? '#fff3b0' : '#ff9a8a');
    if (fish.kind === 'boot') {
      this.combo = 0;
    } else {
      this.combo += 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
    }
    this.sfx.catch(spec.value);
    this.burst(fish.x, fish.y, 14, '#ffe98a', 130);
  }

  loseFish(reason) {
    const fish = this.hook.fish;
    this.hook.fish = null;
    this.hook.state = 'idle';
    this.hook.tension = 0;
    this.combo = 0;
    if (reason === 'snap') {
      this.snaps += 1;
      this.floatText(this.hook.x, this.hook.y - 20, 'LINE SNAPPED!', '#ff9a8a');
      this.sfx.snap();
    } else if (reason === 'shark') {
      this.lives -= 1;
      this.floatText(this.hook.x, this.hook.y - 20, 'SHARK ATE IT!  -1 LIFE', '#ff6b5e');
      this.sfx.shark();
      if (this.lives <= 0) {
        this.finishRun(false);
        return;
      }
    }
    if (fish) this.fishes = this.fishes.filter((f) => f.id !== fish.id);
  }

  finishDay() {
    this.timeBonus = Math.ceil(this.timeLeft) * SCORE.timeBonusPerSecond;
    this.score += this.timeBonus;
    this.dayScore += this.timeBonus;
    if (this.day >= DAYS.length) {
      this.screen = SCREEN_WIN;
      this.best = Math.max(this.best, this.score);
      this.sfx.victory();
      return EVENT_WIN;
    }
    this.screen = SCREEN_DAY;
    this.sfx.dayClear();
    return EVENT_DAYCLEAR;
  }

  finishRun(won) {
    this.screen = won ? SCREEN_WIN : SCREEN_OVER;
    this.best = Math.max(this.best, this.score);
    if (won) this.sfx.victory();
    else this.sfx.gameOver();
    return won ? EVENT_WIN : EVENT_OVER;
  }

  step(dt, input) {
    this.elapsed += dt;
    if (this.hook.cooldown > 0) this.hook.cooldown -= dt;
    this.updateParticles(dt);
    this.updateFloats(dt);

    if (this.screen === SCREEN_TITLE) {
      this.driftFish(dt);
      return EVENT_NONE;
    }
    if (this.screen === SCREEN_DAY || this.screen === SCREEN_OVER || this.screen === SCREEN_WIN) {
      this.driftFish(dt);
      return EVENT_NONE;
    }

    // --- playing ---
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      if (this.dayScore >= this.quota) return this.finishDay();
      return this.finishRun(false);
    }

    // Boat: pointer steers toward the cursor, keys nudge it.
    const target = input.pointerX;
    if (target !== null && target !== undefined) {
      const dx = target - this.boat.x;
      const step = BOAT.speed * dt;
      this.boat.x += Math.max(-step, Math.min(step, dx));
      this.boat.tilt = Math.max(-0.12, Math.min(0.12, dx * 0.0009));
    } else if (input.move !== 0) {
      this.boat.x += input.move * BOAT.speed * dt;
      this.boat.tilt = input.move * 0.1;
    } else {
      this.boat.tilt *= 0.9;
    }
    this.boat.x = Math.max(70, Math.min(FIELD.width - 70, this.boat.x));

    if (input.castPressed) {
      if (this.hook.state === 'idle') this.cast();
      else if (this.hook.state === 'sinking') this.reelEarly();
    }

    this.updateHook(dt, input);
    this.updateFish(dt);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnFish();
      this.spawnTimer = this.dayConfig().spawnEvery * range(this.rng, 0.7, 1.3);
    }
    // The hook and fish updates can end the day or the run (quota reached,
    // shark ate the last life); report that instead of swallowing it.
    if (this.screen === SCREEN_DAY) return EVENT_DAYCLEAR;
    if (this.screen === SCREEN_OVER) return EVENT_OVER;
    if (this.screen === SCREEN_WIN) return EVENT_WIN;
    return EVENT_NONE;
  }

  updateHook(dt, input) {
    const hook = this.hook;
    if (hook.state === 'idle') {
      hook.x = this.boat.x;
      hook.y = FIELD.surfaceY;
      return;
    }
    // Steering: the hook follows the boat's controls, slower than the boat.
    const steer = input.pointerX !== null && input.pointerX !== undefined
      ? Math.max(-1, Math.min(1, (input.pointerX - hook.x) / 60))
      : input.move;
    hook.x += steer * 320 * dt;
    hook.x = Math.max(24, Math.min(FIELD.width - 24, hook.x));

    if (hook.state === 'sinking') {
      hook.y += HOOK.sinkSpeed * dt;
      if (hook.y >= HOOK.maxDepth) {
        hook.y = HOOK.maxDepth;
        hook.state = 'returning';
      }
      const caught = this.fishes.find((f) => f.kind !== 'shark'
        && Math.hypot(f.x - hook.x, f.y - hook.y) < f.radius + HOOK.radius);
      if (caught) {
        hook.state = 'hooked';
        hook.fish = caught;
        hook.tension = 8;
        caught.struggleTimer = 0.5;
        this.sfx.bite();
        this.burst(hook.x, hook.y, 8, '#ffffff', 70);
      }
    } else if (hook.state === 'returning') {
      hook.y -= HOOK.sinkSpeed * 0.9 * dt;
      if (hook.y <= FIELD.surfaceY) {
        hook.state = 'idle';
        hook.cooldown = CAST.cooldown;
      }
    } else if (hook.state === 'hooked') {
      const fish = hook.fish;
      if (!fish) {
        hook.state = 'idle';
        return;
      }
      // The fish struggles in bursts and drags the hook sideways.
      fish.struggleTimer -= dt;
      if (fish.struggleTimer <= 0) {
        fish.struggle = fish.struggle > 0 ? 0 : 1;
        fish.struggleTimer = fish.struggle > 0 ? range(this.rng, 0.5, 1.1) : range(this.rng, 0.5, 1.0);
      }
      const pull = fish.struggle > 0 ? fish.dir * 95 : 0;
      hook.x = Math.max(24, Math.min(FIELD.width - 24, hook.x + pull * dt));
      fish.x = hook.x;
      fish.y = hook.y;
      if (input.reelHeld) {
        const spec = SPECIES[fish.kind];
        hook.y -= (HOOK.reelSpeed / spec.weight) * dt;
        hook.tension += (fish.struggle > 0 ? HOOK.tensionRise : HOOK.tensionRise * 0.25) * dt;
        if (Math.random() < dt * 6) this.sfx.reelTick();
      } else {
        hook.tension -= HOOK.tensionFall * dt;
        hook.y += 26 * dt; // a hooked fish drags the line down a little
        hook.y = Math.min(hook.y, HOOK.maxDepth);
      }
      hook.tension = Math.max(0, Math.min(HOOK.snapAt, hook.tension));
      if (hook.tension >= HOOK.snapAt) {
        this.loseFish('snap');
        return;
      }
      if (hook.y <= FIELD.surfaceY) {
        this.award(fish);
        this.fishes = this.fishes.filter((f) => f.id !== fish.id);
        hook.fish = null;
        hook.state = 'idle';
        hook.tension = 0;
        hook.cooldown = CAST.cooldown;
        if (this.dayScore >= this.quota) return this.finishDay();
      }
    }
  }

  updateFish(dt) {
    const hooked = this.hook.fish;
    for (const fish of this.fishes) {
      if (fish === hooked) continue;
      fish.t += dt;
      if (fish.kind === 'shark') {
        // Sharks patrol; a hooked fish draws the nearest one in.
        let tx = fish.x + fish.dir * fish.speed * dt;
        let ty = fish.baseY;
        if (hooked) {
          const dx = hooked.x - fish.x;
          const dy = hooked.y - fish.y;
          const d = Math.hypot(dx, dy) || 1;
          const chase = fish.speed * 1.7;
          tx = fish.x + (dx / d) * chase * dt;
          ty = fish.y + (dy / d) * chase * dt;
          if (d < fish.radius + hooked.radius + 4) {
            this.loseFish('shark');
            return;
          }
        }
        fish.x = tx;
        fish.y += (ty - fish.y) * Math.min(1, dt * 2);
        fish.dir = fish.x < hooked?.x ? 1 : fish.dir;
        if (fish.x < -60) { fish.x = -60; fish.dir = 1; }
        if (fish.x > FIELD.width + 60) { fish.x = FIELD.width + 60; fish.dir = -1; }
        continue;
      }
      // Darters burst forward in short sprints.
      let speed = fish.speed;
      // Wanderers sometimes turn mid-field, so the school spreads out instead
      // of piling up at the edges.
      fish.wanderTimer -= dt;
      if (fish.wanderTimer <= 0) {
        if (chance(this.rng, 0.35)) fish.dir *= -1;
        fish.wanderTimer = range(this.rng, 2, 5);
      }
      if (SPECIES[fish.kind].behavior === 'dart') {
        fish.dartTimer -= dt;
        if (fish.dartTimer <= 0) {
          fish.darting = 0.45;
          fish.dartTimer = range(this.rng, 1.6, 3.2);
        }
        if (fish.darting > 0) {
          fish.darting -= dt;
          speed *= 2.2;
        }
      }
      if (SPECIES[fish.kind].behavior === 'junk') {
        fish.y += 14 * dt; // junk slowly sinks
        if (fish.y > FIELD.bottomY - 10) fish.y = FIELD.bottomY - 10;
      }
      fish.x += fish.dir * speed * dt;
      fish.y = fish.baseY + Math.sin(fish.t * fish.wobbleFreq + fish.phase) * fish.wobbleAmp;
      if (fish.x < -70) {
        fish.x = -70;
        fish.dir = 1;
      } else if (fish.x > FIELD.width + 70) {
        fish.x = FIELD.width + 70;
        fish.dir = -1;
      }
    }
    // Keep the school from thinning out at the edges.
    this.fishes = this.fishes.filter((f) => f.x > -90 && f.x < FIELD.width + 90);
  }

  driftFish(dt) {
    // Title and end screens: fish keep swimming behind the panel.
    for (const fish of this.fishes) {
      if (fish.kind === 'shark') continue;
      fish.t += dt;
      fish.x += fish.dir * fish.speed * 0.6 * dt;
      fish.y = fish.baseY + Math.sin(fish.t * fish.wobbleFreq + fish.phase) * fish.wobbleAmp;
      if (fish.x < -70) { fish.x = -70; fish.dir = 1; }
      if (fish.x > FIELD.width + 70) { fish.x = FIELD.width + 70; fish.dir = -1; }
    }
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  updateFloats(dt) {
    for (const f of this.floats) {
      f.life -= dt;
      f.y -= 34 * dt;
    }
    this.floats = this.floats.filter((f) => f.life > 0);
  }
}
