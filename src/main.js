import AudioManager from './audio.js';
import SandSimulation from './sand.js';
import ToolManager from './tools.js';

import pyramidsUrl from '../assets/pyramids.png';
import beachUrl from '../assets/beach.png';
import camelsUrl from '../assets/camels.png';
import marsUrl from '../assets/mars.png';
import sandboxUrl from '../assets/sandbox.png';

const BACKGROUNDS = {
  none: null,
  pyramids: pyramidsUrl,
  beach: beachUrl,
  camels: camelsUrl,
  mars: marsUrl,
  sandbox: sandboxUrl,
};

// The true EGA/AGI 16-color palette Sierra games drew from.
const RETRO_PALETTE = [
  '#000000', '#555555', '#AAAAAA', '#FFFFFF',
  '#AA0000', '#FF5555', '#AA5500', '#FFFF55',
  '#00AA00', '#55FF55', '#00AAAA', '#55FFFF',
  '#0000AA', '#5555FF', '#AA00AA', '#FF55FF',
];

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const SIM_SUBSTEPS = 2;
const UNDO_LIMIT = 10;

let sandSim;
let toolManager;
let audioManager;

let backgroundImage = null;
let currentBackgroundKey = 'pyramids';
// Tint applied to the backdrop; white means untinted.
let backgroundColor = '#FFFFFF';

let fallbackLayer;
let stickCursorUrl;

let canvasWidth = 800;
let canvasHeight = 600;

const undoStack = [];

function preload() {
  loadBackgroundImage(currentBackgroundKey);
}

function computeCanvasSize() {
  const container = document.getElementById('canvas-container');
  const containerWidth = container ? container.clientWidth : window.innerWidth - 40;
  const containerHeight = container ? container.clientHeight : window.innerHeight - 240;

  // Floors small enough that the canvas never overflows a phone screen.
  canvasWidth = Math.max(240, Math.min(containerWidth - 20, 1200));
  canvasHeight = Math.max(200, Math.min(containerHeight - 20, 800));
}

function setup() {
  computeCanvasSize();

  pixelDensity(1);
  noSmooth();

  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('canvas-container');

  fallbackLayer = createGraphics(canvasWidth, canvasHeight);
  fallbackLayer.pixelDensity(1);
  fallbackLayer.noSmooth();
  buildFallbackLayer();

  sandSim = new SandSimulation(canvasWidth, canvasHeight, 2);
  sandSim.fillToPercentage(0.3);

  audioManager = new AudioManager();
  audioManager.init();

  toolManager = new ToolManager(sandSim, audioManager);
  stickCursorUrl = createStickCursor();

  setupUI();
  syncInitialUI();

  document.addEventListener('pointerdown', () => {
    audioManager.start();
  }, { once: true });
}

function windowResized() {
  const previousGrid = sandSim ? sandSim.snapshot() : null;
  const previousSim = sandSim;
  const previousWidth = canvasWidth;
  const previousHeight = canvasHeight;

  computeCanvasSize();
  // Mobile browsers fire resize as the address bar hides and shows while
  // scrolling; don't rebuild the sim (and lose undo history) unless the
  // canvas actually changed size.
  if (canvasWidth === previousWidth && canvasHeight === previousHeight) return;

  resizeCanvas(canvasWidth, canvasHeight);

  fallbackLayer = createGraphics(canvasWidth, canvasHeight);
  fallbackLayer.pixelDensity(1);
  fallbackLayer.noSmooth();
  buildFallbackLayer();

  const nextSim = new SandSimulation(canvasWidth, canvasHeight, 2);
  if (previousSim && previousGrid) {
    copyGridInto(previousSim, previousGrid, nextSim);
  }

  sandSim = nextSim;
  if (toolManager) {
    toolManager.sandSim = nextSim;
  }

  // Old snapshots no longer match the grid dimensions.
  undoStack.length = 0;
  updateUndoButton();
}

// Copy the overlapping region, keeping columns left-aligned and rows
// bottom-aligned so existing sand stays grounded.
function copyGridInto(fromSim, fromGrid, toSim) {
  const cols = Math.min(fromSim.cols, toSim.cols);
  const rows = Math.min(fromSim.rows, toSim.rows);
  const fromRowStart = fromSim.rows - rows;
  const toRowStart = toSim.rows - rows;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      toSim.grid[(toRowStart + y) * toSim.cols + x] = fromGrid[(fromRowStart + y) * fromSim.cols + x];
    }
  }
}

function pushUndoSnapshot() {
  if (!sandSim) return;
  undoStack.push(sandSim.snapshot());
  if (undoStack.length > UNDO_LIMIT) {
    undoStack.shift();
  }
  updateUndoButton();
}

function undo() {
  if (!sandSim || undoStack.length === 0) return;
  sandSim.restore(undoStack.pop());
  updateUndoButton();
}

function updateUndoButton() {
  const undoBtn = document.getElementById('undo-btn');
  if (undoBtn) {
    undoBtn.disabled = undoStack.length === 0;
  }
}

function isPaletteLocked() {
  const paletteLock = document.getElementById('palette-lock');
  return Boolean(paletteLock && paletteLock.checked);
}

// Single entry point for color changes: snaps to the AGI palette when locked,
// updates the sim, and keeps picker, hex field, chip, and swatches in sync.
function applyColor(hex) {
  if (!HEX_PATTERN.test(hex)) return;

  const normalized = hex.toUpperCase();
  const nextHex = isPaletteLocked() ? snapToRetroPalette(normalized) : normalized;
  sandSim?.setColor(nextHex);
  syncColorUI(nextHex);
}

function syncColorUI(hex) {
  const colorPicker = document.getElementById('color-picker');
  const colorHex = document.getElementById('color-hex');
  const chip = document.getElementById('current-color-chip');

  if (colorPicker) colorPicker.value = hex;
  if (colorHex) colorHex.value = hex;
  if (chip) chip.style.background = hex;

  const swatches = document.querySelectorAll('.palette-swatch');
  for (const swatch of swatches) {
    swatch.classList.toggle('is-selected', swatch.dataset.color === hex);
    swatch.setAttribute('aria-selected', swatch.dataset.color === hex ? 'true' : 'false');
  }
}

function buildPaletteSwatches() {
  const container = document.getElementById('palette-swatches');
  if (!container) return;

  for (const color of RETRO_PALETTE) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'palette-swatch';
    swatch.dataset.color = color;
    swatch.style.background = color;
    swatch.title = color;
    swatch.setAttribute('role', 'option');
    swatch.addEventListener('click', () => applyColor(color));
    container.appendChild(swatch);
  }
}

function setToolAndSync(toolName) {
  if (!toolManager) return;
  toolManager.setTool(toolName);
  updateCursor(toolName);

  const radio = document.querySelector(`input[name="tool"][value="${toolName}"]`);
  if (radio) radio.checked = true;
}

function setBrushScaleAndSync(percent) {
  const clamped = Math.min(250, Math.max(50, percent));
  toolManager?.setSizeScale(clamped / 100);

  const slider = document.getElementById('brush-size');
  if (slider) slider.value = String(clamped);
}

function getFillPercentage() {
  const fillSelect = document.getElementById('fill-select');
  const value = fillSelect ? Number(fillSelect.value) : 0.3;
  return Number.isFinite(value) ? value : 0.3;
}

function resetSand() {
  if (!sandSim) return;
  pushUndoSnapshot();
  sandSim.reset(getFillPercentage());
}

function setupUI() {
  buildPaletteSwatches();

  const toolRadios = document.querySelectorAll('input[name="tool"]');
  const checkedTool = document.querySelector('input[name="tool"]:checked');

  if (checkedTool) {
    setToolAndSync(checkedTool.value);
  }

  for (const radio of toolRadios) {
    radio.addEventListener('change', () => setToolAndSync(radio.value));
  }

  const brushSize = document.getElementById('brush-size');
  if (brushSize) {
    brushSize.addEventListener('input', (event) => {
      setBrushScaleAndSync(Number(event.target.value));
    });
  }

  document.getElementById('reset-btn')?.addEventListener('click', resetSand);
  document.getElementById('undo-btn')?.addEventListener('click', undo);

  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveCanvas('sahnd-scene', 'png');
    });
  }

  const bgSelect = document.getElementById('bg-select');
  if (bgSelect) {
    bgSelect.addEventListener('change', (event) => {
      const key = event.target.value;
      currentBackgroundKey = Object.prototype.hasOwnProperty.call(BACKGROUNDS, key) ? key : 'none';
      loadBackgroundImage(currentBackgroundKey);
    });
  }

  const bgColorPicker = document.getElementById('bg-color-picker');
  if (bgColorPicker) {
    bgColorPicker.addEventListener('input', (event) => {
      backgroundColor = event.target.value;
    });
  }

  const audioToggle = document.getElementById('audio-toggle');
  if (audioToggle) {
    audioToggle.addEventListener('click', () => {
      if (!audioManager) return;
      audioManager.toggleBackground();
      audioToggle.textContent = `Music: ${audioManager.isBackgroundEnabled() ? 'ON' : 'OFF'}`;
    });
  }

  const sfxToggle = document.getElementById('sfx-toggle');
  if (sfxToggle) {
    sfxToggle.addEventListener('click', () => {
      if (!audioManager) return;
      audioManager.toggleSFX();
      sfxToggle.textContent = `SFX: ${audioManager.isSFXEnabled() ? 'ON' : 'OFF'}`;
    });
  }

  const musicVolume = document.getElementById('music-volume');
  if (musicVolume) {
    musicVolume.addEventListener('input', (event) => {
      audioManager?.setMusicVolume(Number(event.target.value) / 100);
    });
  }

  const sfxVolume = document.getElementById('sfx-volume');
  if (sfxVolume) {
    sfxVolume.addEventListener('input', (event) => {
      audioManager?.setSfxVolume(Number(event.target.value) / 100);
    });
  }

  const colorPicker = document.getElementById('color-picker');
  if (colorPicker) {
    colorPicker.addEventListener('input', (event) => {
      applyColor(event.target.value);
    });
  }

  const colorHex = document.getElementById('color-hex');
  if (colorHex) {
    const applyHexField = () => {
      const hex = colorHex.value.trim();
      if (HEX_PATTERN.test(hex)) {
        applyColor(hex);
      } else {
        syncColorUI(sandSim?.getColorHex() || '#5555FF');
      }
    };

    colorHex.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        applyHexField();
        colorHex.blur();
      }
    });
    colorHex.addEventListener('blur', applyHexField);
  }

  const paletteLock = document.getElementById('palette-lock');
  if (paletteLock) {
    paletteLock.addEventListener('change', () => {
      if (paletteLock.checked && sandSim) {
        applyColor(sandSim.getColorHex());
      }
    });
  }

  const helpOverlay = document.getElementById('help-overlay');
  const setHelpVisible = (visible) => {
    if (helpOverlay) helpOverlay.hidden = !visible;
  };
  document.getElementById('help-btn')?.addEventListener('click', () => setHelpVisible(true));
  document.getElementById('help-close-btn')?.addEventListener('click', () => setHelpVisible(false));
  document.getElementById('help-close-x')?.addEventListener('click', () => setHelpVisible(false));
  helpOverlay?.addEventListener('click', (event) => {
    if (event.target === helpOverlay) setHelpVisible(false);
  });

  document.addEventListener('keydown', handleShortcuts);
}

function isHelpOpen() {
  const overlay = document.getElementById('help-overlay');
  return Boolean(overlay && !overlay.hidden);
}

function handleShortcuts(event) {
  if (isHelpOpen()) {
    if (event.key === 'Escape') {
      document.getElementById('help-overlay').hidden = true;
    }
    return;
  }

  const target = event.target;
  const tag = target?.tagName;
  if (tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (tag === 'INPUT' && !['radio', 'checkbox', 'range'].includes(target.type)) return;

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    undo();
    return;
  }

  if (event.ctrlKey || event.metaKey || event.altKey) return;

  switch (event.key) {
    case '1':
      setToolAndSync('stick');
      break;
    case '2':
      setToolAndSync('finger');
      break;
    case '3':
      setToolAndSync('trowel');
      break;
    case '[':
      setBrushScaleAndSync((toolManager?.getSizeScale() || 1) * 100 - 25);
      break;
    case ']':
      setBrushScaleAndSync((toolManager?.getSizeScale() || 1) * 100 + 25);
      break;
    case 'r':
    case 'R':
      resetSand();
      break;
    case '?':
      document.getElementById('help-overlay')?.removeAttribute('hidden');
      break;
    default:
      break;
  }
}

function syncInitialUI() {
  const bgSelect = document.getElementById('bg-select');
  const bgColorPicker = document.getElementById('bg-color-picker');

  syncColorUI(sandSim.getColorHex());
  updateUndoButton();

  if (bgSelect) bgSelect.value = currentBackgroundKey;
  if (bgColorPicker) bgColorPicker.value = backgroundColor;

  audioManager.setMusicVolume(0.4);
  audioManager.setSfxVolume(0.7);
}

function snapToRetroPalette(hex) {
  const normalized = hex.toUpperCase();
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);

  let best = RETRO_PALETTE[0];
  let minDist = Number.POSITIVE_INFINITY;

  for (const swatch of RETRO_PALETTE) {
    const sr = parseInt(swatch.slice(1, 3), 16);
    const sg = parseInt(swatch.slice(3, 5), 16);
    const sb = parseInt(swatch.slice(5, 7), 16);

    const dr = r - sr;
    const dg = g - sg;
    const db = b - sb;
    const dist = dr * dr + dg * dg + db * db;

    if (dist < minDist) {
      minDist = dist;
      best = swatch;
    }
  }

  return best;
}

function loadBackgroundImage(key) {
  const selected = BACKGROUNDS[key];

  if (!selected) {
    backgroundImage = null;
    return;
  }

  loadImage(
    selected,
    (img) => {
      if (img && img.width > 8 && img.height > 8) {
        backgroundImage = img;
      } else {
        backgroundImage = null;
      }
    },
    () => {
      backgroundImage = null;
    },
  );
}

function buildFallbackLayer() {
  fallbackLayer.background(0);
  fallbackLayer.noStroke();

  const scaleX = canvasWidth / 800;
  const scaleY = canvasHeight / 600;

  fallbackLayer.fill(30);
  fallbackLayer.triangle(50 * scaleX, 550 * scaleY, 150 * scaleX, 550 * scaleY, 100 * scaleX, 450 * scaleY);
  fallbackLayer.triangle(200 * scaleX, 550 * scaleY, 400 * scaleX, 550 * scaleY, 300 * scaleX, 350 * scaleY);
  fallbackLayer.triangle(500 * scaleX, 550 * scaleY, 700 * scaleX, 550 * scaleY, 600 * scaleX, 400 * scaleY);

  fallbackLayer.fill(20);
  for (let x = 100 * scaleX; x < 300 * scaleX; x += 20 * scaleX) {
    for (let y = 450 * scaleY; y < 550 * scaleY; y += 20 * scaleY) {
      if ((x + y) % (40 * scaleX) < 20 * scaleX) {
        fallbackLayer.rect(x, y, 10 * scaleX, 10 * scaleY);
      }
    }
  }
}

function updateCursor(toolName) {
  const canvas = document.querySelector('#canvas-container canvas');
  if (!canvas) return;

  if (toolName === 'stick') {
    canvas.style.cursor = `url(${stickCursorUrl}) 8 2, crosshair`;
  } else {
    canvas.style.cursor = 'default';
  }
}

function createStickCursor() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const context = canvas.getContext('2d');

  if (!context) return 'auto';

  context.clearRect(0, 0, 16, 16);
  context.strokeStyle = '#8B4513';
  context.lineWidth = 2;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(8, 1);
  context.lineTo(8, 13);
  context.stroke();

  context.fillStyle = '#654321';
  context.beginPath();
  context.arc(8, 1, 1.5, 0, Math.PI * 2);
  context.fill();

  return canvas.toDataURL();
}

function draw() {
  background(0);

  // The tint multiplies the backdrop, so white leaves it unchanged. With no
  // backdrop image, the tint color fills the canvas directly.
  if (backgroundImage) {
    tint(backgroundColor);
    image(backgroundImage, 0, 0, canvasWidth, canvasHeight);
    noTint();
  } else if (currentBackgroundKey === 'none') {
    background(backgroundColor);
  } else if (fallbackLayer) {
    tint(backgroundColor);
    image(fallbackLayer, 0, 0);
    noTint();
  }

  if (sandSim) {
    for (let i = 0; i < SIM_SUBSTEPS; i++) {
      sandSim.update();
    }
    sandSim.render();
  }
}

function mousePressed() {
  audioManager?.start();
  if (toolManager && mouseX >= 0 && mouseX < canvasWidth && mouseY >= 0 && mouseY < canvasHeight) {
    pushUndoSnapshot();
    toolManager.start(mouseX, mouseY);
  }
}

function mouseDragged() {
  toolManager?.move(mouseX, mouseY);
}

function mouseReleased() {
  toolManager?.end();
}

// Touch events target the element the touch started on. Only claim (and
// preventDefault) touches that began on the sketch canvas; returning true
// everywhere else keeps page scrolling and tap-to-click working on mobile.
function isCanvasTouch(event) {
  const canvas = document.querySelector('#canvas-container canvas');
  return Boolean(canvas && event && event.target === canvas);
}

function touchStarted(event) {
  if (!isCanvasTouch(event)) return true;
  audioManager?.start();
  if (toolManager && touches.length > 0) {
    const { x, y } = touches[0];
    if (x >= 0 && x < canvasWidth && y >= 0 && y < canvasHeight) {
      pushUndoSnapshot();
      toolManager.start(x, y);
    }
  }
  return false;
}

function touchMoved(event) {
  if (!isCanvasTouch(event)) return true;
  if (toolManager && touches.length > 0) {
    toolManager.move(touches[0].x, touches[0].y);
  }
  return false;
}

function touchEnded(event) {
  if (!isCanvasTouch(event)) return true;
  toolManager?.end();
  return false;
}

window.preload = preload;
window.setup = setup;
window.draw = draw;
window.windowResized = windowResized;
window.mousePressed = mousePressed;
window.mouseDragged = mouseDragged;
window.mouseReleased = mouseReleased;
window.touchStarted = touchStarted;
window.touchMoved = touchMoved;
window.touchEnded = touchEnded;
