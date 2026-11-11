// Turns keyboard and pointer (mouse / finger) into one vertical steering intent.
// Keyboard: ↑/↓ or W/S. Pointer: the plane drifts toward the pointer's height.

const keys = new Set();
let pointerY = null; // CSS px, or null when no pointer steering
let pointerActive = false;
let lastPointerMove = 0;
let activePointerId = null; // the finger that is steering

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'w', 's', ' '].includes(k)) e.preventDefault();
    keys.add(k);
    pointerY = null; // keyboard takes over
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());

  const setPointer = (e) => {
    const rect = canvas.getBoundingClientRect();
    pointerY = e.clientY - rect.top;
    lastPointerMove = performance.now();
  };
  canvas.addEventListener('pointerdown', (e) => {
    pointerActive = true;
    activePointerId = e.pointerId;
    setPointer(e);
  });
  canvas.addEventListener('pointermove', (e) => {
    // Mouse steers on hover; touch steers while the (first) finger is down.
    if (e.pointerType === 'mouse' || (pointerActive && e.pointerId === activePointerId)) setPointer(e);
  });
  const end = (e) => {
    if (e.pointerType !== 'mouse' && e.pointerId !== activePointerId) return; // another finger lifted
    pointerActive = false;
    activePointerId = null;
    if (e.pointerType !== 'mouse') pointerY = null; // lift finger: plane levels off
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') pointerY = null;
  });
}

/**
 * Steering intent in [-1, 1]; negative = up. 0 means "let go" (plane auto-levels).
 * `planeY` is the plane's current height in CSS px.
 */
export function steerIntent(planeY) {
  const up = keys.has('arrowup') || keys.has('w');
  const down = keys.has('arrowdown') || keys.has('s');
  if (up !== down) return up ? -1 : 1;
  if (pointerY != null) {
    const d = pointerY - planeY;
    if (Math.abs(d) < 12) return 0;
    return Math.max(-1, Math.min(1, d / 90));
  }
  return 0;
}

export function isKeyDown(k) {
  return keys.has(k);
}
