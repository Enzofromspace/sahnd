// Sand particle simulation using a packed-grid cellular automata model.
export default class SandSimulation {
  constructor(width, height, cellSize = 2) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cols = Math.floor(width / cellSize);
    this.rows = Math.floor(height / cellSize);
    this.size = this.cols * this.rows;

    // Packed RGB integer per cell: 0 means empty, 0xRRGGBB means particle color.
    this.grid = new Uint32Array(this.size);
    this.nextGrid = new Uint32Array(this.size);

    this.defaultColorInt = this.rgbToInt(85, 85, 255);
    this.sandColorInt = this.defaultColorInt;

    this.brushCache = new Map();

    // Alternating scan direction removes the horizontal bias of a fixed
    // left-to-right sweep.
    this.scanLeftToRight = true;

    // Probability that a grain slides diagonally when it could; below 1 lets
    // piles hold steeper, more dune-like slopes.
    this.reposeChance = 0.85;

    // One-image frame buffer written pixel-per-cell, drawn scaled up once per
    // frame. Created lazily because p5's createImage needs an active sketch.
    this.frameImage = null;
  }

  rgbToInt(r, g, b) {
    return ((r & 255) << 16) | ((g & 255) << 8) | (b & 255);
  }
<<<<<<< HEAD
  
  getColor() {
    return this.sandColor;
  }
  
  initGrids() {
    for (let y = 0; y < this.rows; y++) {
      this.grid[y] = [];
      this.nextGrid[y] = [];
      for (let x = 0; x < this.cols; x++) {
        this.grid[y][x] = 0;
        this.nextGrid[y][x] = 0;
      }
    }
  }
  
  reset() {
    this.initGrids();
  }
  
  // Fill sand to a percentage of the screen
  fillToPercentage(percentage) {
    const totalCells = this.cols * this.rows;
    const targetCells = Math.floor(totalCells * percentage);
    let filledCells = 0;
    
    // Default blue color for initial fill
    const defaultColor = { r: 0, g: 100, b: 255 };
    
    // Fill from bottom up, creating a natural sand pile
    for (let y = this.rows - 1; y >= 0 && filledCells < targetCells; y--) {
      for (let x = 0; x < this.cols && filledCells < targetCells; x++) {
        this.grid[y][x] = { ...defaultColor };
        filledCells++;
      }
    }
  }
  
  worldToGrid(x, y) {
=======

  intToRgb(value) {
>>>>>>> fc91a4e (codex test)
    return {
      r: (value >>> 16) & 255,
      g: (value >>> 8) & 255,
      b: value & 255,
    };
  }

  hexToInt(hexColor) {
    const hex = (hexColor || '').replace('#', '');
    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return this.sandColorInt;
    return parseInt(hex, 16);
  }

  getIndex(col, row) {
    return row * this.cols + col;
  }

  isValid(col, row) {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  worldToGrid(x, y) {
    return {
      col: Math.floor(x / this.cellSize),
      row: Math.floor(y / this.cellSize),
    };
  }

  getCell(col, row) {
    if (!this.isValid(col, row)) return 0;
    return this.grid[this.getIndex(col, row)];
  }

  isEmpty(col, row) {
    if (!this.isValid(col, row)) return true;
    return this.grid[this.getIndex(col, row)] === 0;
  }

  setCell(col, row, value) {
    if (!this.isValid(col, row)) return;
    this.grid[this.getIndex(col, row)] = value;
  }

  setColor(hexColor) {
    this.sandColorInt = this.hexToInt(hexColor);
  }

  getColor() {
    return this.intToRgb(this.sandColorInt);
  }

  getColorHex() {
    return `#${this.sandColorInt.toString(16).padStart(6, '0').toUpperCase()}`;
  }

  snapshot() {
    return this.grid.slice();
  }

  restore(snapshot) {
    if (!snapshot || snapshot.length !== this.size) return;
    this.grid.set(snapshot);
    this.nextGrid.set(snapshot);
  }

  reset(percentage = 0.3) {
    this.grid.fill(0);
    this.nextGrid.fill(0);
    this.fillToPercentage(percentage);
  }

  fillToPercentage(percentage) {
    this.grid.fill(0);
    const targetCells = Math.floor(this.size * percentage);
    let filledCells = 0;

    for (let y = this.rows - 1; y >= 0 && filledCells < targetCells; y--) {
      for (let x = 0; x < this.cols && filledCells < targetCells; x++) {
        this.grid[this.getIndex(x, y)] = this.jitterColor(this.defaultColorInt);
        filledCells += 1;
      }
    }
  }

  // Slight per-grain brightness variation so sand reads as textured dunes.
  jitterColor(colorInt) {
    const factor = 0.9 + Math.random() * 0.18;
    const r = Math.min(255, Math.round(((colorInt >>> 16) & 255) * factor));
    const g = Math.min(255, Math.round(((colorInt >>> 8) & 255) * factor));
    const b = Math.min(255, Math.round((colorInt & 255) * factor));
    const packed = this.rgbToInt(r, g, b);
    // 0 is reserved for empty; nudge pure black grains up.
    return packed === 0 ? this.rgbToInt(1, 1, 1) : packed;
  }

  getBrushOffsets(gridRadius) {
    const key = String(gridRadius);
    if (this.brushCache.has(key)) {
      return this.brushCache.get(key);
    }

    const offsets = [];
    const radiusSq = gridRadius * gridRadius;

    for (let dy = -gridRadius; dy <= gridRadius; dy++) {
      for (let dx = -gridRadius; dx <= gridRadius; dx++) {
        const distSq = dx * dx + dy * dy;
        if (distSq <= radiusSq) {
          offsets.push({ dx, dy, distSq });
        }
      }
    }

    this.brushCache.set(key, offsets);
    return offsets;
  }

  addSand(centerX, centerY, radius, density = 0.7) {
    const { col: centerCol, row: centerRow } = this.worldToGrid(centerX, centerY);
    const gridRadius = Math.ceil(radius / this.cellSize);
    const offsets = this.getBrushOffsets(gridRadius);

    for (const item of offsets) {
      if (Math.random() > density) continue;
      const col = centerCol + item.dx;
      const row = centerRow + item.dy;
      if (this.isValid(col, row)) {
        const idx = this.getIndex(col, row);
        if (this.grid[idx] === 0) {
          this.grid[idx] = this.jitterColor(this.sandColorInt);
        }
      }
    }
  }

  removeSand(centerX, centerY, radius) {
    const { col: centerCol, row: centerRow } = this.worldToGrid(centerX, centerY);
    const gridRadius = Math.ceil(radius / this.cellSize);
    const offsets = this.getBrushOffsets(gridRadius);

    for (const item of offsets) {
      const col = centerCol + item.dx;
      const row = centerRow + item.dy;
      if (this.isValid(col, row)) {
        this.grid[this.getIndex(col, row)] = 0;
      }
    }
  }

  pushSand(centerX, centerY, radius, angle, strength = 0.7) {
    const { col: centerCol, row: centerRow } = this.worldToGrid(centerX, centerY);
    const gridRadius = Math.ceil(radius / this.cellSize);
    const offsets = this.getBrushOffsets(gridRadius);

    const pushX = Math.cos(angle) * strength;
    const pushY = Math.sin(angle) * strength;
    const stepX = Math.cos(angle);
    const stepY = Math.sin(angle);
    const moved = [];

    for (const item of offsets) {
      const col = centerCol + item.dx;
      const row = centerRow + item.dy;
      if (!this.isValid(col, row)) continue;

      const fromIndex = this.getIndex(col, row);
      const color = this.grid[fromIndex];
      if (color === 0) continue;

      const falloff = 1 - Math.sqrt(item.distSq) / Math.max(1, gridRadius);
      let newCol = Math.round(col + pushX * falloff);
      let newRow = Math.round(row + pushY * falloff);
      if (!this.isValid(newCol, newRow)) continue;

      // If the target is occupied, probe a couple of cells further along the
      // push direction so smearing displaces material instead of stalling.
      let toIndex = this.getIndex(newCol, newRow);
      let probes = 2;
      while (this.grid[toIndex] !== 0 && probes > 0) {
        newCol = Math.round(newCol + stepX);
        newRow = Math.round(newRow + stepY);
        if (!this.isValid(newCol, newRow)) break;
        toIndex = this.getIndex(newCol, newRow);
        probes -= 1;
      }

      if (!this.isValid(newCol, newRow) || this.grid[toIndex] !== 0) continue;
      moved.push({ fromIndex, toIndex, color });
    }

    for (const m of moved) {
      this.grid[m.fromIndex] = 0;
      this.grid[m.toIndex] = m.color;
    }
  }

  displaceSandDown(centerX, centerY, radius) {
    const { col: centerCol, row: centerRow } = this.worldToGrid(centerX, centerY);
    const gridRadius = Math.ceil(radius / this.cellSize);

    for (let dy = gridRadius; dy >= -gridRadius; dy--) {
      for (let dx = -gridRadius; dx <= gridRadius; dx++) {
        const distSq = dx * dx + dy * dy;
        if (distSq > gridRadius * gridRadius) continue;

        const col = centerCol + dx;
        const row = centerRow + dy;
        if (!this.isValid(col, row)) continue;

        const fromIndex = this.getIndex(col, row);
        const color = this.grid[fromIndex];
        if (color === 0) continue;

        const downRow = row + 1;
        if (this.isValid(col, downRow)) {
          const downIndex = this.getIndex(col, downRow);
          if (this.grid[downIndex] === 0) {
            this.grid[fromIndex] = 0;
            this.grid[downIndex] = color;
            continue;
          }

          const leftCol = col - 1;
          const rightCol = col + 1;
          const leftEmpty = this.isValid(leftCol, downRow) && this.grid[this.getIndex(leftCol, downRow)] === 0;
          const rightEmpty = this.isValid(rightCol, downRow) && this.grid[this.getIndex(rightCol, downRow)] === 0;

          if (leftEmpty && rightEmpty) {
            const targetCol = Math.random() < 0.5 ? leftCol : rightCol;
            this.grid[fromIndex] = 0;
            this.grid[this.getIndex(targetCol, downRow)] = color;
          } else if (leftEmpty) {
            this.grid[fromIndex] = 0;
            this.grid[this.getIndex(leftCol, downRow)] = color;
          } else if (rightEmpty) {
            this.grid[fromIndex] = 0;
            this.grid[this.getIndex(rightCol, downRow)] = color;
          }
        }
      }
    }
  }

  update() {
    this.nextGrid.set(this.grid);
    this.scanLeftToRight = !this.scanLeftToRight;

    const xStart = this.scanLeftToRight ? 0 : this.cols - 1;
    const xEnd = this.scanLeftToRight ? this.cols : -1;
    const xStep = this.scanLeftToRight ? 1 : -1;

    for (let y = this.rows - 2; y >= 0; y--) {
      for (let x = xStart; x !== xEnd; x += xStep) {
        const idx = this.getIndex(x, y);
        const color = this.grid[idx];
        if (color === 0) continue;

        const belowRow = y + 1;
        const belowIdx = this.getIndex(x, belowRow);

        if (this.grid[belowIdx] === 0 && this.nextGrid[belowIdx] === 0) {
          this.nextGrid[idx] = 0;
          this.nextGrid[belowIdx] = color;
          continue;
        }

        if (Math.random() > this.reposeChance) continue;

        let leftOpen = false;
        let rightOpen = false;
        let leftIdx = -1;
        let rightIdx = -1;

        if (x > 0) {
          leftIdx = this.getIndex(x - 1, belowRow);
          leftOpen = this.grid[leftIdx] === 0 && this.nextGrid[leftIdx] === 0;
        }

        if (x < this.cols - 1) {
          rightIdx = this.getIndex(x + 1, belowRow);
          rightOpen = this.grid[rightIdx] === 0 && this.nextGrid[rightIdx] === 0;
        }

        if (leftOpen && rightOpen) {
          this.nextGrid[idx] = 0;
          this.nextGrid[Math.random() < 0.5 ? leftIdx : rightIdx] = color;
        } else if (leftOpen) {
          this.nextGrid[idx] = 0;
          this.nextGrid[leftIdx] = color;
        } else if (rightOpen) {
          this.nextGrid[idx] = 0;
          this.nextGrid[rightIdx] = color;
        }
      }
    }

    const temp = this.grid;
    this.grid = this.nextGrid;
    this.nextGrid = temp;
  }

  render() {
    if (!this.frameImage) {
      this.frameImage = createImage(this.cols, this.rows);
      this.frameImage.loadPixels();
    }

    const pixels = this.frameImage.pixels;
    const grid = this.grid;

    for (let i = 0; i < this.size; i++) {
      const cell = grid[i];
      const p = i * 4;
      if (cell === 0) {
        pixels[p + 3] = 0;
      } else {
        pixels[p] = (cell >>> 16) & 255;
        pixels[p + 1] = (cell >>> 8) & 255;
        pixels[p + 2] = cell & 255;
        // 50% alpha so the backdrop stays visible under the sand, like
        // coloring over the scene.
        pixels[p + 3] = 128;
      }
    }

    this.frameImage.updatePixels();
    image(this.frameImage, 0, 0, this.cols * this.cellSize, this.rows * this.cellSize);
  }
}
