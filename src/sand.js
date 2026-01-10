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
    
    this.initGrids();
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
    this.fillToPercentage(0.3); // Fill 30% of screen by default
  }
  
  // Fill sand to a percentage of the screen
  fillToPercentage(percentage) {
    const totalCells = this.cols * this.rows;
    const targetCells = Math.floor(totalCells * percentage);
    let filledCells = 0;
    
    // Fill from bottom up, creating a natural sand pile
    for (let y = this.rows - 1; y >= 0 && filledCells < targetCells; y--) {
      for (let x = 0; x < this.cols && filledCells < targetCells; x++) {
        this.grid[y][x] = 1;
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
  
  setCell(col, row, value) {
    if (this.isValid(col, row)) {
      this.grid[row][col] = value;
    }
  }
  
  // Add sand particles in a circular area
  addSand(centerX, centerY, radius, density = 0.7) {
    const { col: centerCol, row: centerRow } = this.worldToGrid(centerX, centerY);
    const gridRadius = Math.ceil(radius / this.cellSize);
    
    for (let dy = -gridRadius; dy <= gridRadius; dy++) {
      for (let dx = -gridRadius; dx <= gridRadius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= gridRadius && Math.random() < density) {
          const col = centerCol + dx;
          const row = centerRow + dy;
          if (this.isValid(col, row) && this.getCell(col, row) === 0) {
            this.setCell(col, row, 1);
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
  
  // Push sand laterally (for Finger tool)
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
          if (this.isValid(col, row) && this.getCell(col, row) === 1) {
            particles.push({ col, row, dx, dy, dist });
          }
        }
      }
    }
    
    // Move particles based on angle
    for (const p of particles) {
      const newCol = Math.round(p.col + pushX * (gridRadius - p.dist) / gridRadius);
      const newRow = Math.round(p.row + pushY * (gridRadius - p.dist) / gridRadius);
      
      if (this.isValid(newCol, newRow) && this.getCell(newCol, newRow) === 0) {
        this.setCell(p.col, p.row, 0);
        this.setCell(newCol, newRow, 1);
      }
    }
  }
  
  // Displace sand downward (for Trowel tool)
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
          
          if (this.isValid(col, row) && this.getCell(col, row) === 1) {
            // Try to move down
            const newRow = row + 1;
            if (this.isValid(col, newRow) && this.getCell(col, newRow) === 0) {
              this.setCell(col, row, 0);
              this.setCell(col, newRow, 1);
            }
            // If can't move straight down, try diagonals
            else {
              const leftCol = col - 1;
              const rightCol = col + 1;
              const leftEmpty = this.isValid(leftCol, newRow) && this.getCell(leftCol, newRow) === 0;
              const rightEmpty = this.isValid(rightCol, newRow) && this.getCell(rightCol, newRow) === 0;
              
              if (leftEmpty && rightEmpty) {
                this.setCell(col, row, 0);
                this.setCell(Math.random() < 0.5 ? leftCol : rightCol, newRow, 1);
              } else if (leftEmpty) {
                this.setCell(col, row, 0);
                this.setCell(leftCol, newRow, 1);
              } else if (rightEmpty) {
                this.setCell(col, row, 0);
                this.setCell(rightCol, newRow, 1);
              }
            }
          }
        }
      }
    }
  }
  
  // Update sand physics - gravity and settling
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
        if (this.grid[y][x] === 1) {
          // Try to fall straight down
          if (this.grid[y + 1][x] === 0) {
            this.nextGrid[y][x] = 0;
            this.nextGrid[y + 1][x] = 1;
          }
          // Try diagonal falls
          else {
            const leftEmpty = x > 0 && this.grid[y + 1][x - 1] === 0;
            const rightEmpty = x < this.cols - 1 && this.grid[y + 1][x + 1] === 0;
            
            if (leftEmpty && rightEmpty) {
              this.nextGrid[y][x] = 0;
              this.nextGrid[y + 1][Math.random() < 0.5 ? x - 1 : x + 1] = 1;
            } else if (leftEmpty) {
              this.nextGrid[y][x] = 0;
              this.nextGrid[y + 1][x - 1] = 1;
            } else if (rightEmpty) {
              this.nextGrid[y][x] = 0;
              this.nextGrid[y + 1][x + 1] = 1;
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
    fill(0, 100, 255); // Blue sand (RGB)
    noStroke();
    
    // Particle size is smaller than cell size to create spacing
    // This creates gaps between particles even when stacked
    const particleSize = this.cellSize * 0.7; // 70% of cell size
    const offset = (this.cellSize - particleSize) / 2; // Center particles in cells
    
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.grid[y][x] === 1) {
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

