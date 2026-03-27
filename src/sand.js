// Sand particle simulation using cellular automata approach
class SandSimulation {
  constructor(width, height, cellSize = 2) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cols = Math.floor(width / cellSize);
    this.rows = Math.floor(height / cellSize);
    
    // Grid: 0 = empty, 1 = sand particle
    this.grid = [];
    this.nextGrid = [];
    
    // Current sand color (default blue)
    this.sandColor = { r: 0, g: 100, b: 255 };
    
    this.initGrids();
  }
  
  setColor(hexColor) {
    // Convert hex to RGB
    const hex = hexColor.replace('#', '');
    this.sandColor = {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16)
    };
  }
  
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
    return {
      col: Math.floor(x / this.cellSize),
      row: Math.floor(y / this.cellSize)
    };
  }
  
  gridToWorld(col, row) {
    return {
      x: col * this.cellSize,
      y: row * this.cellSize
    };
  }
  
  isValid(col, row) {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }
  
  getCell(col, row) {
    if (!this.isValid(col, row)) return 0;
    return this.grid[row][col];
  }
  
  isEmpty(col, row) {
    const cell = this.getCell(col, row);
    return cell === 0 || cell === null || cell === undefined;
  }
  
  // Helper to check if cell is empty by direct grid index (for update method)
  isEmptyByIndex(y, x) {
    if (y < 0 || y >= this.rows || x < 0 || x >= this.cols) return true;
    const cell = this.grid[y][x];
    // Empty if: 0, null, undefined, or not a valid color object
    if (cell === 0 || cell === null || cell === undefined) return true;
    // If it's an object, check if it has color properties
    if (typeof cell === 'object') {
      return !(cell.r !== undefined && cell.g !== undefined && cell.b !== undefined);
    }
    return true;
  }
  
  setCell(col, row, value) {
    if (this.isValid(col, row)) {
      this.grid[row][col] = value;
    }
  }
  
  setCellWithColor(col, row, color) {
    if (this.isValid(col, row)) {
      this.grid[row][col] = { ...color };
    }
  }
  
  // Add sand particles in a circular area with current color
  addSand(centerX, centerY, radius, density = 0.7) {
    const { col: centerCol, row: centerRow } = this.worldToGrid(centerX, centerY);
    const gridRadius = Math.ceil(radius / this.cellSize);
    
    for (let dy = -gridRadius; dy <= gridRadius; dy++) {
      for (let dx = -gridRadius; dx <= gridRadius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= gridRadius && Math.random() < density) {
          const col = centerCol + dx;
          const row = centerRow + dy;
          if (this.isValid(col, row) && this.isEmpty(col, row)) {
            // Use current selected color
            this.setCellWithColor(col, row, this.sandColor);
          }
        }
      }
    }
  }
  
  // Remove sand particles in a circular area
  removeSand(centerX, centerY, radius) {
    const { col: centerCol, row: centerRow } = this.worldToGrid(centerX, centerY);
    const gridRadius = Math.ceil(radius / this.cellSize);
    
    for (let dy = -gridRadius; dy <= gridRadius; dy++) {
      for (let dx = -gridRadius; dx <= gridRadius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= gridRadius) {
          const col = centerCol + dx;
          const row = centerRow + dy;
          if (this.isValid(col, row)) {
            this.setCell(col, row, 0);
          }
        }
      }
    }
  }
  
  // Push sand laterally (for Finger tool) - preserves color
  pushSand(centerX, centerY, radius, angle, strength = 0.3) {
    const { col: centerCol, row: centerRow } = this.worldToGrid(centerX, centerY);
    const gridRadius = Math.ceil(radius / this.cellSize);
    const pushX = Math.cos(angle) * strength;
    const pushY = Math.sin(angle) * strength;
    
    const particles = [];
    
    // Collect particles in radius
    for (let dy = -gridRadius; dy <= gridRadius; dy++) {
      for (let dx = -gridRadius; dx <= gridRadius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= gridRadius) {
          const col = centerCol + dx;
          const row = centerRow + dy;
          const cell = this.getCell(col, row);
          if (this.isValid(col, row) && !this.isEmpty(col, row)) {
            particles.push({ col, row, dx, dy, dist, color: cell });
          }
        }
      }
    }
    
    // Move particles based on angle, preserving color
    for (const p of particles) {
      const newCol = Math.round(p.col + pushX * (gridRadius - p.dist) / gridRadius);
      const newRow = Math.round(p.row + pushY * (gridRadius - p.dist) / gridRadius);
      
      if (this.isValid(newCol, newRow) && this.isEmpty(newCol, newRow)) {
        this.setCell(p.col, p.row, 0);
        this.setCellWithColor(newCol, newRow, p.color);
      }
    }
  }
  
  // Displace sand downward (for Trowel tool) - preserves color
  displaceSandDown(centerX, centerY, radius) {
    const { col: centerCol, row: centerRow } = this.worldToGrid(centerX, centerY);
    const gridRadius = Math.ceil(radius / this.cellSize);
    
    // Process from bottom to top to avoid double-moving
    for (let dy = gridRadius; dy >= -gridRadius; dy--) {
      for (let dx = -gridRadius; dx <= gridRadius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= gridRadius) {
          const col = centerCol + dx;
          const row = centerRow + dy;
          const cell = this.getCell(col, row);
          
          if (this.isValid(col, row) && !this.isEmpty(col, row)) {
            // Try to move down
            const newRow = row + 1;
            if (this.isValid(col, newRow) && this.isEmpty(col, newRow)) {
              this.setCell(col, row, 0);
              this.setCellWithColor(col, newRow, cell);
            }
            // If can't move straight down, try diagonals
            else {
              const leftCol = col - 1;
              const rightCol = col + 1;
              const leftEmpty = this.isValid(leftCol, newRow) && this.isEmpty(leftCol, newRow);
              const rightEmpty = this.isValid(rightCol, newRow) && this.isEmpty(rightCol, newRow);
              
              if (leftEmpty && rightEmpty) {
                this.setCell(col, row, 0);
                const targetCol = Math.random() < 0.5 ? leftCol : rightCol;
                this.setCellWithColor(targetCol, newRow, cell);
              } else if (leftEmpty) {
                this.setCell(col, row, 0);
                this.setCellWithColor(leftCol, newRow, cell);
              } else if (rightEmpty) {
                this.setCell(col, row, 0);
                this.setCellWithColor(rightCol, newRow, cell);
              }
            }
          }
        }
      }
    }
  }
  
  // Update sand physics - gravity and settling (preserves color)
  update() {
    // Copy current grid to next grid
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.nextGrid[y][x] = this.grid[y][x];
      }
    }
    
    // Process from bottom to top
    for (let y = this.rows - 2; y >= 0; y--) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.grid[y][x];
        if (!this.isEmptyByIndex(y, x)) {
          // Try to fall straight down
          if (this.isEmptyByIndex(y + 1, x)) {
            this.nextGrid[y][x] = 0;
            this.nextGrid[y + 1][x] = cell;
          }
          // Try diagonal falls
          else {
            const leftEmpty = x > 0 && this.isEmptyByIndex(y + 1, x - 1);
            const rightEmpty = x < this.cols - 1 && this.isEmptyByIndex(y + 1, x + 1);
            
            if (leftEmpty && rightEmpty) {
              this.nextGrid[y][x] = 0;
              this.nextGrid[y + 1][Math.random() < 0.5 ? x - 1 : x + 1] = cell;
            } else if (leftEmpty) {
              this.nextGrid[y][x] = 0;
              this.nextGrid[y + 1][x - 1] = cell;
            } else if (rightEmpty) {
              this.nextGrid[y][x] = 0;
              this.nextGrid[y + 1][x + 1] = cell;
            }
          }
        }
      }
    }
    
    // Swap grids
    const temp = this.grid;
    this.grid = this.nextGrid;
    this.nextGrid = temp;
  }
  
  // Render sand particles with spacing for see-through effect
  render() {
    noStroke();
    
    // Particle size is smaller than cell size to create spacing
    // This creates gaps between particles even when stacked
    const particleSize = this.cellSize * 0.7; // 70% of cell size
    const offset = (this.cellSize - particleSize) / 2; // Center particles in cells
    
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.grid[y][x];
        // Check if cell contains a color object (sand particle)
        if (cell && typeof cell === 'object' && cell.r !== undefined && cell.g !== undefined && cell.b !== undefined) {
          // Use each particle's stored color
          fill(cell.r, cell.g, cell.b);
          // Draw particle smaller than cell, centered in cell
          rect(
            x * this.cellSize + offset, 
            y * this.cellSize + offset, 
            particleSize, 
            particleSize
          );
        }
      }
    }
  }
  
  // Export canvas data for saving
  exportCanvas(p5) {
    return p5.canvas;
  }
}
