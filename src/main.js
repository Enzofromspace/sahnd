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
  backgroundImage = loadImage('assets/pyramids.png', 
    (img) => { 
      // Only use image if it's large enough (not placeholder)
      backgroundImageLoaded = img.width > 100 && img.height > 100;
    },
    () => { backgroundImageLoaded = false; }
  );
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
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  
  canvasWidth = Math.min(containerWidth - 20, 1200);
  canvasHeight = Math.min(containerHeight - 20, 800);
  
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('canvas-container');
  
  // Initialize systems
  sandSim = new SandSimulation(canvasWidth, canvasHeight, 2);
  audioManager = new AudioManager();
  audioManager.init();
  toolManager = new ToolManager(sandSim, audioManager);
  
  // Setup UI event listeners
  setupUI();
  
  // Setup canvas interaction
  canvas.mousePressed(handleMousePressed);
  canvas.mouseDragged(handleMouseDragged);
  canvas.mouseReleased(handleMouseReleased);
  canvas.touchStarted(handleTouchStarted);
  canvas.touchMoved(handleTouchMoved);
  canvas.touchEnded(handleTouchEnded);
  
  // Start audio after first user interaction
  document.addEventListener('click', () => {
    audioManager.start();
  }, { once: true });
  
  document.addEventListener('touchstart', () => {
    audioManager.start();
  }, { once: true });
}

function setupUI() {
  // Tool selector
  const toolRadios = document.querySelectorAll('input[name="tool"]');
  toolRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      toolManager.setTool(radio.value);
    });
  });
  
  // Reset button
  document.getElementById('reset-btn').addEventListener('click', () => {
    sandSim.reset();
  });
  
  // Save button
  document.getElementById('save-btn').addEventListener('click', () => {
    saveCanvas('sahnd-scene', 'png');
  });
  
  // Audio toggle
  const audioToggle = document.getElementById('audio-toggle');
  audioToggle.addEventListener('click', () => {
    audioManager.toggleBackground();
    audioToggle.textContent = `Audio: ${audioManager.isBackgroundEnabled() ? 'ON' : 'OFF'}`;
  });
}

function draw() {
  // Layer 1: Immutable Background (pyramids)
  background(0);
  if (backgroundImageLoaded && backgroundImage) {
    image(backgroundImage, 0, 0, canvasWidth, canvasHeight);
  } else {
    drawPyramids();
  }
  
  // Update sand physics
  sandSim.update();
  
  // Layer 2: Sand Simulation
  sandSim.render();
}

function handleMousePressed() {
  toolManager.start(mouseX, mouseY);
}

function handleMouseDragged() {
  toolManager.move(mouseX, mouseY);
}

function handleMouseReleased() {
  toolManager.end();
}

function handleTouchStarted(e) {
  e.preventDefault();
  if (touches.length > 0) {
    toolManager.start(touches[0].x, touches[0].y);
  }
}

function handleTouchMoved(e) {
  e.preventDefault();
  if (touches.length > 0) {
    toolManager.move(touches[0].x, touches[0].y);
  }
}

function handleTouchEnded(e) {
  e.preventDefault();
  toolManager.end();
}

