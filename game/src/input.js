// Keyboard and mouse input, normalised into one small object the world reads each
// frame. Edge-triggered presses (cast, confirm, restart, pause, mute) are true for
// exactly one frame; the main loop clears them after every step.

function canvasX(canvas, clientX) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0) return null;
  return ((clientX - rect.left) / rect.width) * canvas.width;
}

export function createInput(canvas) {
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
  const keys = new Set();

  function recomputeMove() {
    const left = keys.has('ArrowLeft') || keys.has('a') || keys.has('A');
    const right = keys.has('ArrowRight') || keys.has('d') || keys.has('D');
    input.move = (right ? 1 : 0) - (left ? 1 : 0);
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) {
      if (event.code === 'Space') event.preventDefault();
      return;
    }
    keys.add(event.key);
    recomputeMove();
    if (event.code === 'Space') {
      input.castPressed = true;
      input.reelHeld = true;
      event.preventDefault();
    } else if (event.key === 'Enter') {
      input.confirmPressed = true;
    } else if (event.key === 'r' || event.key === 'R') {
      input.restartPressed = true;
    } else if (event.key === 'p' || event.key === 'P') {
      input.pausePressed = true;
    } else if (event.key === 'm' || event.key === 'M') {
      input.mutePressed = true;
    }
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.key);
    recomputeMove();
    if (event.code === 'Space') input.reelHeld = false;
  });
  window.addEventListener('blur', () => {
    keys.clear();
    input.move = 0;
    input.reelHeld = false;
  });

  canvas.addEventListener('pointermove', (event) => {
    input.pointerX = canvasX(canvas, event.clientX);
  });
  canvas.addEventListener('pointerdown', (event) => {
    input.pointerX = canvasX(canvas, event.clientX);
    input.castPressed = true;
    input.reelHeld = true;
    event.preventDefault();
  });
  window.addEventListener('pointerup', () => {
    input.reelHeld = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    input,
    endFrame() {
      input.castPressed = false;
      input.confirmPressed = false;
      input.restartPressed = false;
      input.pausePressed = false;
      input.mutePressed = false;
    },
  };
}
