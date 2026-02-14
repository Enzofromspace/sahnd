// Tool definitions and behaviors.
export default class ToolManager {
  constructor(sandSim, audioManager) {
    this.sandSim = sandSim;
    this.audioManager = audioManager;
    this.currentTool = 'stick';
    this.isActive = false;
    this.lastX = 0;
    this.lastY = 0;
    this.lastMoveAngle = 0;
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

    const dx = x - this.lastX;
    const dy = y - this.lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0.001) {
      this.lastMoveAngle = Math.atan2(dy, dx);
    }

    this.applyTool(x, y, false);

    // Interpolate between last and current position for smooth tool paths.
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
      default:
        break;
    }
  }

  // Stick: fine placement for line drawing.
  applyStick(x, y, isStart) {
    if (isStart) {
      this.audioManager.playToolSound('stick');
    }
    this.sandSim.addSand(x, y, 2, 0.9);
  }

  // Finger: adds material and smears nearby particles in drag direction.
  applyFinger(x, y, isStart) {
    if (isStart) {
      this.audioManager.playToolSound('finger');
    }
    this.sandSim.addSand(x, y, 10, 0.75);
    this.sandSim.pushSand(x, y, 12, this.lastMoveAngle, 1.4);
  }

  // Trowel: digs and displaces sand downward.
  applyTrowel(x, y, isStart) {
    if (isStart) {
      this.audioManager.playToolSound('trowel');
    }
    this.sandSim.removeSand(x, y, 6);
    this.sandSim.displaceSandDown(x, y, 8);
  }
}
