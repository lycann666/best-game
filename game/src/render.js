// Tidehook rendering: everything the player sees, drawn on one canvas. The palette is
// a warm sunset over a deep teal sea on purpose — the field is full of neon arenas,
// and a game that reads at a glance in a small screenshot wins the comparison.

import { FIELD, SPECIES, SHARK, HOOK } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_DAY, SCREEN_OVER, SCREEN_WIN } from './world.js';

const SKY_TOP = ['#ffe3b3', '#ffd9a0', '#ffc98f', '#ffb87e', '#ffab72'];
const SKY_BOT = ['#ffb08a', '#ff9e7d', '#ff8f6e', '#ff8266', '#ff7a5e'];
const SEA_TOP = ['#37b8a8', '#2fa8a0', '#27989a', '#1f8a94', '#187e90'];
const SEA_BOT = ['#0e4a6b', '#0d4263', '#0c3a5c', '#0b3356', '#092c50'];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexLerp(h1, h2, t) {
  const a = [1, 3, 5].map((i) => parseInt(h1.slice(i, i + 2), 16));
  const b = [1, 3, 5].map((i) => parseInt(h2.slice(i, i + 2), 16));
  return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(',')})`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHeart(ctx, x, y, s, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 16, s / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-11, -4, -6, -12, 0, -5);
  ctx.bezierCurveTo(6, -12, 11, -4, 0, 5);
  ctx.closePath();
  ctx.fillStyle = filled ? '#ff5d73' : 'rgba(255,255,255,0.25)';
  ctx.fill();
  ctx.restore();
}

function drawFishBody(ctx, fish, spec, time) {
  const r = fish.radius;
  const facing = fish.dir;
  ctx.save();
  ctx.translate(fish.x, fish.y);
  ctx.scale(facing, 1);
  if (spec.glow) {
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 2.6);
    glow.addColorStop(0, 'rgba(125,255,154,0.45)');
    glow.addColorStop(1, 'rgba(125,255,154,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Tail, wagging with the swim.
  const wag = Math.sin(time * 6 + fish.phase) * 0.35;
  ctx.fillStyle = spec.color;
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, 0);
  ctx.lineTo(-r * 1.5, -r * 0.7 + wag * r);
  ctx.lineTo(-r * 1.5, r * 0.7 + wag * r);
  ctx.closePath();
  ctx.fill();
  // Body.
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = spec.belly;
  ctx.beginPath();
  ctx.ellipse(r * 0.1, r * 0.22, r * 0.7, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  // Fin on top.
  ctx.fillStyle = spec.color;
  ctx.beginPath();
  ctx.moveTo(-r * 0.1, -r * 0.55);
  ctx.lineTo(r * 0.25, -r * 1.05);
  ctx.lineTo(r * 0.5, -r * 0.5);
  ctx.closePath();
  ctx.fill();
  if (fish.kind === 'stripefin') {
    ctx.strokeStyle = 'rgba(120,40,0,0.55)';
    ctx.lineWidth = 3;
    for (const off of [-0.35, 0, 0.35]) {
      ctx.beginPath();
      ctx.moveTo(r * off, -r * 0.55);
      ctx.lineTo(r * off - r * 0.15, r * 0.55);
      ctx.stroke();
    }
  }
  if (fish.kind === 'kingkoi') {
    // A little gold crown.
    ctx.fillStyle = '#ff5d73';
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.62);
    ctx.lineTo(-r * 0.4, -r * 1.05);
    ctx.lineTo(-r * 0.15, -r * 0.8);
    ctx.lineTo(0, -r * 1.1);
    ctx.lineTo(r * 0.15, -r * 0.8);
    ctx.lineTo(r * 0.4, -r * 1.05);
    ctx.lineTo(r * 0.4, -r * 0.62);
    ctx.closePath();
    ctx.fill();
  }
  // Eye.
  ctx.fillStyle = '#10222e';
  ctx.beginPath();
  ctx.arc(r * 0.55, -r * 0.12, Math.max(2, r * 0.11), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(r * 0.58, -r * 0.16, Math.max(1, r * 0.045), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBoot(ctx, fish) {
  const r = fish.radius;
  ctx.save();
  ctx.translate(fish.x, fish.y);
  ctx.rotate(Math.sin(fish.t * 0.8 + fish.phase) * 0.25);
  ctx.fillStyle = '#8a7a66';
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 1.1);
  ctx.lineTo(r * 0.5, -r * 1.1);
  ctx.lineTo(r * 0.5, r * 0.2);
  ctx.lineTo(r * 1.3, r * 0.35);
  ctx.lineTo(r * 1.3, r * 0.85);
  ctx.lineTo(-r * 0.9, r * 0.85);
  ctx.lineTo(-r * 0.9, -r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5d5348';
  ctx.fillRect(-r * 0.9, r * 0.55, r * 2.2, r * 0.3);
  ctx.restore();
}

function drawShark(ctx, fish, time) {
  const r = fish.radius;
  ctx.save();
  ctx.translate(fish.x, fish.y);
  ctx.scale(fish.dir, 1);
  ctx.fillStyle = SHARK.color;
  ctx.beginPath();
  ctx.moveTo(-r * 1.6, 0);
  ctx.quadraticCurveTo(-r * 0.4, -r * 0.85, r * 1.1, -r * 0.25);
  ctx.quadraticCurveTo(r * 1.7, 0, r * 1.1, r * 0.3);
  ctx.quadraticCurveTo(-r * 0.4, r * 0.8, -r * 1.6, 0);
  ctx.fill();
  // Tail.
  const wag = Math.sin(time * 5 + fish.phase) * 0.3;
  ctx.beginPath();
  ctx.moveTo(-r * 1.5, 0);
  ctx.lineTo(-r * 2.2, -r * 0.7 + wag * r);
  ctx.lineTo(-r * 2.2, r * 0.7 + wag * r);
  ctx.closePath();
  ctx.fill();
  // Dorsal fin.
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, -r * 0.6);
  ctx.lineTo(r * 0.1, -r * 1.5);
  ctx.lineTo(r * 0.55, -r * 0.55);
  ctx.closePath();
  ctx.fill();
  // Belly + teeth + eye.
  ctx.fillStyle = SHARK.belly;
  ctx.beginPath();
  ctx.ellipse(r * 0.2, r * 0.3, r * 0.95, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(r * (0.9 + i * 0.14), r * 0.12);
    ctx.lineTo(r * (0.97 + i * 0.14), r * 0.28);
    ctx.lineTo(r * (1.04 + i * 0.14), r * 0.12);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#10222e';
  ctx.beginPath();
  ctx.arc(r * 1.05, -r * 0.28, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBoat(ctx, world, time) {
  const { x } = world.boat;
  const bob = Math.sin(time * 1.8) * 3;
  const y = FIELD.surfaceY + bob;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(world.boat.tilt);
  // Hull.
  ctx.fillStyle = '#b4552d';
  ctx.beginPath();
  ctx.moveTo(-58, -6);
  ctx.lineTo(58, -6);
  ctx.lineTo(44, 16);
  ctx.lineTo(-44, 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8a3d20';
  ctx.fillRect(-58, -6, 116, 5);
  // Rim + little cabin.
  ctx.fillStyle = '#ffd94d';
  ctx.fillRect(-14, -24, 28, 18);
  ctx.fillStyle = '#7a4a21';
  ctx.fillRect(-10, -20, 8, 8);
  ctx.fillRect(4, -20, 8, 8);
  // Mast, flag and the fishing rod.
  ctx.strokeStyle = '#6b4423';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(0, -64);
  ctx.stroke();
  ctx.fillStyle = '#ff5d73';
  ctx.beginPath();
  ctx.moveTo(0, -64);
  ctx.lineTo(26, -57);
  ctx.lineTo(0, -50);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#5d4030';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(34, -4);
  ctx.lineTo(72, -52);
  ctx.stroke();
  ctx.restore();
  // The angler, a small figure at the stern.
  ctx.save();
  ctx.translate(x - 30, y - 6);
  ctx.fillStyle = '#2e6f8e';
  ctx.beginPath();
  ctx.arc(0, -26, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath();
  ctx.arc(0, -34, 7, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#e2574c';
  roundRect(ctx, -7, -24, 14, 20, 5);
  ctx.fill();
  ctx.restore();
}

function drawWater(ctx, world, time) {
  const dayIndex = Math.min(world.day - 1, 4);
  const seaTop = SEA_TOP[dayIndex];
  const seaBot = SEA_BOT[dayIndex];
  const grad = ctx.createLinearGradient(0, FIELD.surfaceY, 0, FIELD.height);
  grad.addColorStop(0, seaTop);
  grad.addColorStop(1, seaBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, FIELD.surfaceY, FIELD.width, FIELD.height - FIELD.surfaceY);
  // Sun rays under the water.
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#ffe9a8';
  const sunX = 180 + (1 - world.timeLeft / 75) * 920;
  for (let i = 0; i < 5; i += 1) {
    const x = sunX - 160 + i * 80;
    ctx.beginPath();
    ctx.moveTo(x, FIELD.surfaceY);
    ctx.lineTo(x + 40, FIELD.surfaceY);
    ctx.lineTo(x + 130, FIELD.height);
    ctx.lineTo(x + 30, FIELD.height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Sandy bottom with pebbles and seaweed.
  ctx.fillStyle = '#e8d5a3';
  ctx.beginPath();
  ctx.moveTo(0, FIELD.bottomY);
  ctx.quadraticCurveTo(FIELD.width * 0.3, FIELD.bottomY - 14, FIELD.width * 0.6, FIELD.bottomY - 4);
  ctx.quadraticCurveTo(FIELD.width * 0.85, FIELD.bottomY + 6, FIELD.width, FIELD.bottomY - 8);
  ctx.lineTo(FIELD.width, FIELD.height);
  ctx.lineTo(0, FIELD.height);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3f9e6b';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (const [bx, h] of [[90, 42], [150, 58], [1150, 48], [1210, 62], [620, 36]]) {
    const sway = Math.sin(time * 1.4 + bx) * 6;
    ctx.beginPath();
    ctx.moveTo(bx, FIELD.height - 6);
    ctx.quadraticCurveTo(bx + sway, FIELD.height - h * 0.6, bx + sway * 1.6, FIELD.height - h);
    ctx.stroke();
  }
  // Rising bubbles.
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 12; i += 1) {
    const bx = ((i * 173 + 40) % FIELD.width);
    const by = FIELD.surfaceY + 40 + (((time * 22 + i * 97) % (FIELD.height - FIELD.surfaceY - 80)));
    ctx.beginPath();
    ctx.arc(bx, FIELD.height - by + FIELD.surfaceY, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  // Surface waves.
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= FIELD.width; x += 8) {
    const y = FIELD.surfaceY + Math.sin(x * 0.02 + time * 2.2) * 3;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawSky(ctx, world, time) {
  const dayIndex = Math.min(world.day - 1, 4);
  const grad = ctx.createLinearGradient(0, 0, 0, FIELD.surfaceY);
  grad.addColorStop(0, SKY_TOP[dayIndex]);
  grad.addColorStop(1, SKY_BOT[dayIndex]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FIELD.width, FIELD.surfaceY);
  // The sun sinks as the day runs out.
  const p = 1 - world.timeLeft / 75;
  const sunX = 170 + p * 940;
  const sunY = 118 - Math.sin(p * Math.PI) * 62;
  const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 90);
  glow.addColorStop(0, 'rgba(255,236,170,0.95)');
  glow.addColorStop(1, 'rgba(255,236,170,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffdf8a';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
  ctx.fill();
  // Drifting clouds.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 4; i += 1) {
    const cx = ((time * (10 + i * 4) + i * 340) % (FIELD.width + 220)) - 110;
    const cy = 34 + i * 26;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 52, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 34, cy + 5, 38, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Distant hills on the horizon.
  ctx.fillStyle = 'rgba(122,74,60,0.35)';
  ctx.beginPath();
  ctx.moveTo(0, FIELD.surfaceY);
  ctx.quadraticCurveTo(240, FIELD.surfaceY - 44, 480, FIELD.surfaceY);
  ctx.quadraticCurveTo(760, FIELD.surfaceY - 30, 1040, FIELD.surfaceY);
  ctx.quadraticCurveTo(1180, FIELD.surfaceY - 22, FIELD.width, FIELD.surfaceY);
  ctx.lineTo(FIELD.width, FIELD.surfaceY);
  ctx.closePath();
  ctx.fill();
}

function drawHookLine(ctx, world) {
  const hook = world.hook;
  if (hook.state === 'idle') return;
  const rodTipX = world.boat.x + 72;
  const rodTipY = FIELD.surfaceY - 52 + Math.sin(world.elapsed * 1.8) * 3;
  ctx.strokeStyle = 'rgba(20,30,40,0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rodTipX, rodTipY);
  ctx.quadraticCurveTo(rodTipX + (hook.x - rodTipX) * 0.3, (rodTipY + hook.y) / 2, hook.x, hook.y);
  ctx.stroke();
  // The hook itself.
  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(hook.x, hook.y + 4, 7, Math.PI * 0.15, Math.PI * 1.25);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hook.x, hook.y - 6);
  ctx.lineTo(hook.x, hook.y + 2);
  ctx.stroke();
  // Tension meter while a fish fights. Near the surface it goes below the
  // hook, so it never overlaps the boat.
  if (hook.state === 'hooked') {
    const w = 130;
    const x = Math.max(14, Math.min(FIELD.width - w - 14, hook.x - w / 2));
    const y = hook.y < 280 ? hook.y + 34 : hook.y - 58;
    ctx.fillStyle = 'rgba(10,20,30,0.6)';
    roundRect(ctx, x - 6, y - 6, w + 12, 26, 8);
    ctx.fill();
    ctx.fillStyle = hook.tension > 70 ? '#ff5d5d' : '#ffd94d';
    roundRect(ctx, x, y, w * (hook.tension / HOOK.snapAt), 14, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TENSION — ease off!', x + w / 2, y + 26);
  }
}

function drawHud(ctx, world) {
  // Top bar.
  ctx.fillStyle = 'rgba(8,24,38,0.55)';
  roundRect(ctx, 14, 12, 400, 64, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${world.score}`, 30, 40);
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText(`BEST ${world.best}`, 30, 62);
  // Quota bar in the middle.
  const qx = 440;
  const qw = 400;
  ctx.fillStyle = 'rgba(8,24,38,0.55)';
  roundRect(ctx, qx, 12, qw, 64, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`DAY ${world.day}  —  QUOTA ${world.dayScore} / ${world.quota}`, qx + qw / 2, 34);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, qx + 16, 46, qw - 32, 14, 7);
  ctx.fill();
  ctx.fillStyle = world.dayScore >= world.quota ? '#7dff9a' : '#ffd94d';
  roundRect(ctx, qx + 16, 46, (qw - 32) * world.quotaProgress(), 14, 7);
  ctx.fill();
  // Day, sun timer and lives on the right.
  ctx.fillStyle = 'rgba(8,24,38,0.55)';
  roundRect(ctx, 866, 12, 400, 64, 12);
  ctx.fill();
  const secs = Math.ceil(world.timeLeft);
  ctx.fillStyle = secs <= 10 ? '#ff8a7a' : '#ffffff';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, 1252, 40);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('UNTIL SUNSET', 1252, 62);
  for (let i = 0; i < 3; i += 1) drawHeart(ctx, 900 + i * 30, 44, 22, i < world.lives);
  // Combo badge.
  if (world.combo >= 2) {
    ctx.fillStyle = '#ff8a3d';
    roundRect(ctx, 14, 88, 150, 34, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`COMBO x${world.comboMultiplier().toFixed(2).replace(/\.?0+$/, '')}`, 26, 111);
  }
  // Depth gauge while the hook is down.
  if (world.hook.state !== 'idle') {
    const depth = Math.max(0, Math.round((world.hook.y - FIELD.surfaceY) / 10));
    ctx.fillStyle = 'rgba(8,24,38,0.55)';
    roundRect(ctx, 14, 132, 120, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#cfeeff';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`DEPTH ${depth}m`, 24, 153);
  }
}

function panel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8,24,38,0.72)';
  roundRect(ctx, 330, 190, 620, 330, 18);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  roundRect(ctx, 330, 190, 620, 330, 18);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 640, 258);
  ctx.fillStyle = '#ffffff';
  ctx.font = '19px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, 640, 306 + i * 34));
}

export function draw(ctx, world, time) {
  ctx.clearRect(0, 0, FIELD.width, FIELD.height);
  drawSky(ctx, world, time);
  drawWater(ctx, world, time);
  for (const fish of world.fishes) {
    if (fish.kind === 'shark') drawShark(ctx, fish, time);
    else if (fish.kind === 'boot') drawBoot(ctx, fish);
    else drawFishBody(ctx, fish, SPECIES[fish.kind], time);
  }
  drawBoat(ctx, world, time);
  drawHookLine(ctx, world);
  // Particles and floating score texts.
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const f of world.floats) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  if (world.screen === SCREEN_PLAY) {
    drawHud(ctx, world);
    // Hint line while the hook is idle.
    if (world.hook.state === 'idle' && world.elapsed < 14) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '17px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Move with mouse or ← →  •  Click / Space to cast  •  Hold to reel in', 640, 700);
    }
  } else if (world.screen === SCREEN_TITLE) {
    ctx.fillStyle = 'rgba(8,24,38,0.35)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = '#fff3b0';
    ctx.font = 'bold 84px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TIDEHOOK', 640, 240);
    ctx.fillStyle = '#ffffff';
    ctx.font = '26px system-ui, sans-serif';
    ctx.fillText('A pocket fishing arcade — catch the quota before sunset', 640, 288);
    ctx.font = '19px system-ui, sans-serif';
    ctx.fillText('Steer the boat with the mouse or arrow keys. Click or Space to cast,', 640, 356);
    ctx.fillText('hold to reel in. Ease off when the line runs red, or it snaps.', 640, 384);
    ctx.fillText('Beware the shark — it eats hooked fish. Five days to Master Angler.', 640, 412);
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 24px system-ui, sans-serif';
    const blink = Math.sin(time * 3) > -0.2 ? 1 : 0.25;
    ctx.globalAlpha = blink;
    ctx.fillText('CLICK OR PRESS ENTER TO PLAY', 640, 478);
    ctx.globalAlpha = 1;
    if (world.best > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '17px system-ui, sans-serif';
      ctx.fillText(`Best score: ${world.best}`, 640, 516);
    }
  } else if (world.screen === SCREEN_DAY) {
    drawHud(ctx, world);
    panel(ctx, `DAY ${world.day} CLEAR!`, [
      `Quota ${world.quota} reached — time bonus +${world.timeBonus}`,
      `Score ${world.score}  •  Best catch streak x${world.bestCombo}`,
      '',
      'Press Enter or click for the next day',
    ], '#7dff9a');
  } else if (world.screen === SCREEN_OVER) {
    panel(ctx, 'THE SUN HAS SET', [
      `Day ${world.day} — quota ${world.dayScore} / ${world.quota}`,
      `Final score ${world.score}  •  Best ${world.best}`,
      `Fish caught ${world.caught}  •  Lines snapped ${world.snaps}`,
      '',
      'Press R or click to fish again',
    ], '#ff8a7a');
  } else if (world.screen === SCREEN_WIN) {
    panel(ctx, 'MASTER ANGLER!', [
      'All five days cleared — the whole bay is yours.',
      `Final score ${world.score}  •  Best ${world.best}`,
      `Fish caught ${world.caught}  •  Best combo x${world.bestCombo}`,
      '',
      'Press R or click to play again',
    ], '#ffd94d');
  }
}
