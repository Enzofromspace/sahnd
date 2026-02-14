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

const RETRO_PALETTE = [
  '#000000', '#1E1E1E', '#3C3C3C', '#7C7C7C',
  '#B85E0B', '#D98E04', '#E7C267', '#EFD9A6',
  '#0C4A6E', '#1E88E5', '#47B1FF', '#9AD4FF',
  '#2E7D32', '#5DA84A', '#B7C968', '#D9E7A8',
];

let sandSim;
let toolManager;
let audioManager;

let backgroundImage = null;
let currentBackgroundKey = 'pyramids';
let backgroundColor = '#000000';

let fallbackLayer;
let stickCursorUrl;

let canvasWidth = 800;
let canvasHeight = 600;

function preload() {
  loadBackgroundImage(currentBackgroundKey);
}

function setup() {
  const container = document.getElementById('canvas-container');
  const containerWidth = container ? container.clientWidth : window.innerWidth - 40;
  const containerHeight = container ? container.clientHeight : window.innerHeight - 240;

  canvasWidth = Math.max(400, Math.min(containerWidth - 20, 1200));
  canvasHeight = Math.max(300, Math.min(containerHeight - 20, 800));

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

function setupUI() {
  const toolRadios = document.querySelectorAll('input[name="tool"]');
  const checkedTool = document.querySelector('input[name="tool"]:checked');

  if (checkedTool && toolManager) {
    toolManager.setTool(checkedTool.value);
    updateCursor(checkedTool.value);
  }

  for (const radio of toolRadios) {
    radio.addEventListener('change', () => {
      if (!toolManager) return;
      toolManager.setTool(radio.value);
      updateCursor(radio.value);
    });
  }

  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      sandSim?.reset();
    });
  }

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
  const colorHex = document.getElementById('color-hex');
  const applyColorBtn = document.getElementById('apply-color');
  const paletteLock = document.getElementById('palette-lock');

  if (colorPicker && colorHex) {
    colorPicker.addEventListener('input', (event) => {
      const raw = event.target.value.toUpperCase();
      const snapped = isPaletteLocked(paletteLock) ? snapToRetroPalette(raw) : raw;
      colorHex.value = snapped;
      if (snapped !== raw) {
        colorPicker.value = snapped;
      }
    });
  }

  if (colorHex && colorPicker) {
    colorHex.addEventListener('input', (event) => {
      const hex = event.target.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        const normalized = hex.toUpperCase();
        const snapped = isPaletteLocked(paletteLock) ? snapToRetroPalette(normalized) : normalized;
        colorPicker.value = snapped;
      }
    });

    colorHex.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        applyColorBtn?.click();
      }
    });
  }

  if (applyColorBtn && colorHex && colorPicker) {
    applyColorBtn.addEventListener('click', () => {
      const source = colorHex.value || colorPicker.value || '#0064FF';
      if (!/^#[0-9A-Fa-f]{6}$/.test(source)) {
        const currentHex = sandSim?.getColorHex() || '#0064FF';
        colorHex.value = currentHex;
        colorPicker.value = currentHex;
        return;
      }

      const normalized = source.toUpperCase();
      const nextHex = isPaletteLocked(paletteLock) ? snapToRetroPalette(normalized) : normalized;
      sandSim?.setColor(nextHex);
      colorHex.value = nextHex;
      colorPicker.value = nextHex;
    });
  }

  if (colorPicker) {
    colorPicker.addEventListener('change', () => {
      applyColorBtn?.click();
    });
  }
}

function syncInitialUI() {
  const colorPicker = document.getElementById('color-picker');
  const colorHex = document.getElementById('color-hex');
  const bgSelect = document.getElementById('bg-select');
  const bgColorPicker = document.getElementById('bg-color-picker');

  const currentColorHex = sandSim.getColorHex();
  if (colorPicker) colorPicker.value = currentColorHex;
  if (colorHex) colorHex.value = currentColorHex;

  if (bgSelect) bgSelect.value = currentBackgroundKey;
  if (bgColorPicker) bgColorPicker.value = backgroundColor;

  audioManager.setMusicVolume(0.4);
  audioManager.setSfxVolume(0.7);
}

function isPaletteLocked(paletteLockElement) {
  return Boolean(paletteLockElement && paletteLockElement.checked);
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
  background(backgroundColor);

  if (backgroundImage) {
    image(backgroundImage, 0, 0, canvasWidth, canvasHeight);
  } else if (fallbackLayer) {
    image(fallbackLayer, 0, 0);
  }

  if (sandSim) {
    sandSim.update();
    sandSim.render();
  }
}

function mousePressed() {
  audioManager?.start();
  toolManager?.start(mouseX, mouseY);
}

function mouseDragged() {
  toolManager?.move(mouseX, mouseY);
}

function mouseReleased() {
  toolManager?.end();
}

function touchStarted() {
  audioManager?.start();
  if (toolManager && touches.length > 0) {
    toolManager.start(touches[0].x, touches[0].y);
  }
  return false;
}

function touchMoved() {
  if (toolManager && touches.length > 0) {
    toolManager.move(touches[0].x, touches[0].y);
  }
  return false;
}

function touchEnded() {
  toolManager?.end();
  return false;
}

window.preload = preload;
window.setup = setup;
window.draw = draw;
window.mousePressed = mousePressed;
window.mouseDragged = mouseDragged;
window.mouseReleased = mouseReleased;
window.touchStarted = touchStarted;
window.touchMoved = touchMoved;
window.touchEnded = touchEnded;
