// Tool definitions and behaviors
class ToolManager {
  constructor(sandSim, audioManager) {
    this.sandSim = sandSim;
    this.audioManager = audioManager;
    this.currentTool = 'stick';
    this.isActive = false;
    this.lastX = 0;
    this.lastY = 0;
  }
  
  setTool(toolName) {
    this.currentTool = toolName;
  }
  
  start(x, y) {
    this.isActive = true;
    this.lastX = x;
    this.lastY = y;
    this.applyTool(x, y, true);
  }
  
  move(x, y) {
    if (!this.isActive) return;
    
    this.applyTool(x, y, false);
    
    // Interpolate between last position and current for smooth drawing
    const dx = x - this.lastX;
    const dy = y - this.lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.floor(dist / 2));
    
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const interpX = this.lastX + dx * t;
      const interpY = this.lastY + dy * t;
      this.applyTool(interpX, interpY, false);
    }
    
    this.lastX = x;
    this.lastY = y;
  }
  
  end() {
    this.isActive = false;
  }
  
  applyTool(x, y, isStart) {
    switch (this.currentTool) {
      case 'stick':
        this.applyStick(x, y, isStart);
        break;
      case 'finger':
        this.applyFinger(x, y, isStart);
        break;
      case 'trowel':
        this.applyTrowel(x, y, isStart);
        break;
    }
  }
  
  // Stick: Fine, precise lines - places sand
  applyStick(x, y, isStart) {
    if (isStart) {
      this.audioManager.playToolSound('stick');
    }
    this.sandSim.addSand(x, y, 3, 0.8);
  }
  
  // Finger: Wide, smearing motion - pushes sand laterally
  applyFinger(x, y, isStart) {
    if (isStart) {
      this.audioManager.playToolSound('finger');
    }
    
    if (this.lastX !== x || this.lastY !== y) {
      const angle = Math.atan2(y - this.lastY, x - this.lastX);
      this.sandSim.pushSand(x, y, 8, angle, 0.4);
    }
  }
  
  // Trowel: Digging tool - removes or displaces sand downward
  applyTrowel(x, y, isStart) {
    if (isStart) {
      this.audioManager.playToolSound('trowel');
    }
    
    // Remove some sand
    this.sandSim.removeSand(x, y, 6);
    
    // Displace remaining sand downward
    this.sandSim.displaceSandDown(x, y, 8);
  }
}

