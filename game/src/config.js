// Tidehook configuration: the field, the boat and hook, the fish and the days.
// Every number the rules use lives here, so tuning never touches the logic.

export const FIELD = { width: 1280, height: 720, surfaceY: 150, bottomY: 700 };
export const STEP = 1 / 60;
export const DAY_SECONDS = 75;
export const START_LIVES = 3;
export const MAX_COMBO = 8;

export const BOAT = { width: 118, height: 44, speed: 540 };

export const HOOK = {
  sinkSpeed: 300,
  reelSpeed: 235,
  maxDepth: 688,
  radius: 9,
  // Tension: rises while reeling against a struggling fish, falls otherwise.
  tensionRise: 46,
  tensionFall: 30,
  snapAt: 100,
};

export const CAST = { cooldown: 0.35 };

// One entry per catchable kind. depth is the band the fish swims in, speed is
// pixels per second, weight slows the reel, glow draws a soft halo.
export const SPECIES = {
  sunny: {
    name: 'Sunny',
    value: 10,
    color: '#ffd94d',
    belly: '#fff3b0',
    radius: 14,
    depthMin: 180,
    depthMax: 330,
    speedMin: 42,
    speedMax: 72,
    weight: 1,
    behavior: 'calm',
  },
  bubblegill: {
    name: 'Bubblegill',
    value: 15,
    color: '#4db8ff',
    belly: '#cfeeff',
    radius: 16,
    depthMin: 230,
    depthMax: 430,
    speedMin: 52,
    speedMax: 88,
    weight: 1,
    behavior: 'calm',
  },
  stripefin: {
    name: 'Stripefin',
    value: 25,
    color: '#ff8a3d',
    belly: '#ffe0bd',
    radius: 18,
    depthMin: 300,
    depthMax: 530,
    speedMin: 72,
    speedMax: 112,
    weight: 2,
    behavior: 'dart',
  },
  glowbelly: {
    name: 'Glowbelly',
    value: 40,
    color: '#7dff9a',
    belly: '#dcffe4',
    radius: 20,
    depthMin: 430,
    depthMax: 630,
    speedMin: 56,
    speedMax: 92,
    weight: 2,
    behavior: 'calm',
    glow: true,
  },
  kingkoi: {
    name: 'King Koi',
    value: 100,
    color: '#ffd700',
    belly: '#fff6c2',
    radius: 26,
    depthMin: 200,
    depthMax: 630,
    speedMin: 118,
    speedMax: 158,
    weight: 3,
    behavior: 'dart',
    rare: true,
  },
  boot: {
    name: 'Old Boot',
    value: -5,
    color: '#8a7a66',
    belly: '#5d5348',
    radius: 14,
    depthMin: 300,
    depthMax: 650,
    speedMin: 8,
    speedMax: 18,
    weight: 1,
    behavior: 'junk',
  },
};

// The shark is not a catch: it hunts a hooked fish and eats it.
export const SHARK = {
  name: 'Shark',
  color: '#7d8ea3',
  belly: '#d7e2ec',
  radius: 34,
  depthMin: 380,
  depthMax: 640,
  speedMin: 95,
  speedMax: 135,
  weight: 0,
  behavior: 'hunt',
};

// One day is one round: reach the quota before the sun sets.
export const DAYS = [
  { quota: 120, spawnEvery: 1.15, maxFish: 11, sharks: 0, kinds: ['sunny', 'bubblegill'], koiChance: 0.02 },
  { quota: 220, spawnEvery: 1.0, maxFish: 12, sharks: 0, kinds: ['sunny', 'bubblegill', 'stripefin'], koiChance: 0.04 },
  { quota: 340, spawnEvery: 0.9, maxFish: 12, sharks: 1, kinds: ['sunny', 'bubblegill', 'stripefin', 'glowbelly'], koiChance: 0.05 },
  { quota: 480, spawnEvery: 0.8, maxFish: 13, sharks: 1, kinds: ['sunny', 'bubblegill', 'stripefin', 'glowbelly'], koiChance: 0.06 },
  { quota: 650, spawnEvery: 0.7, maxFish: 14, sharks: 2, kinds: ['sunny', 'bubblegill', 'stripefin', 'glowbelly'], koiChance: 0.08 },
];

export const SCORE = {
  // Points for a catch: value * (1 + 0.25 per combo step, capped by MAX_COMBO).
  comboStep: 0.25,
  // Bonus for the seconds left when a day's quota is reached.
  timeBonusPerSecond: 2,
};
