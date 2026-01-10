// Main application entry point
let sandSim;
let toolManager;
let audioManager;
let backgroundImage;
let backgroundImageLoaded = false;
let canvasWidth = 800;
let canvasHeight = 600;

function preload() {
  // Load background pyramids image
  try {
    backgroundImage = loadImage('assets/pyramids.png', 
      (img) => { 
        // Only use image if it's large enough (not placeholder)
        if (img && img.width > 100 && img.height > 100) {
          backgroundImageLoaded = true;
        } else {
          backgroundImageLoaded = false;
        }
      },
      () => { 
        // Error loading image
        backgroundImageLoaded = false;
      }
    );
  } catch (e) {
    backgroundImageLoaded = false;
  }
}

function drawPyramids() {
  // Draw simple pixel-art style pyramids if image didn't load
  fill(30);
  noStroke();
  
  const scaleX = canvasWidth / 800;
  const scaleY = canvasHeight / 600;
  
  // Pyramid 1 (left)
  triangle(50 * scaleX, 550 * scaleY, 150 * scaleX, 550 * scaleY, 100 * scaleX, 450 * scaleY);
  
  // Pyramid 2 (center, larger)
  triangle(200 * scaleX, 550 * scaleY, 400 * scaleX, 550 * scaleY, 300 * scaleX, 350 * scaleY);
  
  // Pyramid 3 (right)
  triangle(500 * scaleX, 550 * scaleY, 700 * scaleX, 550 * scaleY, 600 * scaleX, 400 * scaleY);
  
  // Add some pixel details
  fill(20);
  for (let x = 100 * scaleX; x < 300 * scaleX; x += 20 * scaleX) {
    for (let y = 450 * scaleY; y < 550 * scaleY; y += 20 * scaleY) {
      if ((x + y) % (40 * scaleX) < 20 * scaleX) {
        rect(x, y, 10 * scaleX, 10 * scaleY);
      }
    }
  }
}

function setup() {
  const container = document.getElementById('canvas-container');
  const containerWidth = container ? container.clientWidth : window.innerWidth - 40;
  const containerHeight = container ? container.clientHeight : window.innerHeight - 200;
  
  canvasWidth = Math.max(400, Math.min(containerWidth - 20, 1200));
  canvasHeight = Math.max(300, Math.min(containerHeight - 20, 800));
  
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('canvas-container');
  
  // Initialize systems
  sandSim = new SandSimulation(canvasWidth, canvasHeight, 2);
  // Fill sand to 30% of screen by default
  sandSim.fillToPercentage(0.3);
  audioManager = new AudioManager();
  audioManager.init();
  toolManager = new ToolManager(sandSim, audioManager);
  
  // Setup UI event listeners
  setupUI();
  
  // Set initial cursor
  setTimeout(() => {
    const checkedTool = document.querySelector('input[name="tool"]:checked');
    if (checkedTool) {
      updateCursor(checkedTool.value);
    }
  }, 100);
  
  // Start audio after first user interaction
  document.addEventListener('click', () => {
    audioManager.start();
  }, { once: true });
  
  document.addEventListener('touchstart', () => {
    audioManager.start();
  }, { once: true });
}

function setupUI() {
  // Tool selector - set initial tool
  const toolRadios = document.querySelectorAll('input[name="tool"]');
  const checkedTool = document.querySelector('input[name="tool"]:checked');
  if (checkedTool && toolManager) {
    toolManager.setTool(checkedTool.value);
    updateCursor(checkedTool.value);
  }
  
  toolRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (toolManager) {
        toolManager.setTool(radio.value);
        updateCursor(radio.value);
      }
    });
  });
  
  // Reset button
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (sandSim) {
      sandSim.reset();
    }
  });
  
  // Save button
  document.getElementById('save-btn').addEventListener('click', () => {
    saveCanvas('sahnd-scene', 'png');
  });
  
  // Audio toggle
  const audioToggle = document.getElementById('audio-toggle');
  audioToggle.addEventListener('click', () => {
    if (audioManager) {
      audioManager.toggleBackground();
      audioToggle.textContent = `Audio: ${audioManager.isBackgroundEnabled() ? 'ON' : 'OFF'}`;
    }
  });
}

function updateCursor(toolName) {
  const canvas = document.querySelector('#canvas-container canvas');
  if (!canvas) return;
  
  if (toolName === 'stick') {
    // Create custom stick cursor
    const stickCursor = createStickCursor();
    canvas.style.cursor = `url(${stickCursor}) 8 2, crosshair`;
  } else if (toolName === 'finger') {
    canvas.style.cursor = 'default';
  } else {
    canvas.style.cursor = 'default';
  }
}

function createStickCursor() {
  // Create a simple stick cursor as data URL
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  
  // Clear with transparent background
  ctx.clearRect(0, 0, 16, 16);
  
  // Draw a simple stick (vertical line) - brown color
  ctx.strokeStyle = '#8B4513'; // Brown stick color
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(8, 1);
  ctx.lineTo(8, 13);
  ctx.stroke();
  
  // Add a small tip/point at the top
  ctx.fillStyle = '#654321';
  ctx.beginPath();
  ctx.arc(8, 1, 1.5, 0, Math.PI * 2);
  ctx.fill();
  
  return canvas.toDataURL();
}

function draw() {
  // Layer 1: Immutable Background (pyramids)
  background(0);
  
  // Check if image is loaded and valid
  if (backgroundImage && backgroundImage.width > 100 && backgroundImage.height > 100) {
    image(backgroundImage, 0, 0, canvasWidth, canvasHeight);
  } else {
    drawPyramids();
  }
  
  // Update sand physics
  if (sandSim) {
    sandSim.update();
    
    // Layer 2: Sand Simulation
    sandSim.render();
  }
}

// p5.js global event handlers
function mousePressed() {
  // Start audio on first interaction
  if (audioManager && !audioManager.hasStarted) {
    audioManager.start();
  }
  
  if (toolManager) {
    toolManager.start(mouseX, mouseY);
  }
}

function mouseDragged() {
  if (toolManager) {
    toolManager.move(mouseX, mouseY);
  }
}

function mouseReleased() {
  if (toolManager) {
    toolManager.end();
  }
}

function touchStarted() {
  // Start audio on first interaction
  if (audioManager && !audioManager.hasStarted) {
    audioManager.start();
  }
  
  if (toolManager && touches.length > 0) {
    toolManager.start(touches[0].x, touches[0].y);
  }
  return false; // Prevent default
}

function touchMoved() {
  if (toolManager && touches.length > 0) {
    toolManager.move(touches[0].x, touches[0].y);
  }
  return false; // Prevent default
}

function touchEnded() {
  if (toolManager) {
    toolManager.end();
  }
  return false; // Prevent default
}

