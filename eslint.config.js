import js from '@eslint/js';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';

const p5Globals = {
  createCanvas: 'readonly',
  createGraphics: 'readonly',
  background: 'readonly',
  fill: 'readonly',
  noStroke: 'readonly',
  noSmooth: 'readonly',
  pixelDensity: 'readonly',
  createImage: 'readonly',
  resizeCanvas: 'readonly',
  triangle: 'readonly',
  rect: 'readonly',
  image: 'readonly',
  tint: 'readonly',
  noTint: 'readonly',
  loadImage: 'readonly',
  saveCanvas: 'readonly',
  mouseX: 'readonly',
  mouseY: 'readonly',
  touches: 'readonly',
};

const audioGlobals = {
  Tone: 'readonly',
};

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'src/vendor']),
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...p5Globals,
        ...audioGlobals,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
]);
