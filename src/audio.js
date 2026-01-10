// Audio management: Tone.js for background music, ZzFX for tool sounds
class AudioManager {
  constructor() {
    this.backgroundEnabled = true;
    this.sfxEnabled = true;
    this.synth = null;
    this.sequence = null;
    this.hasStarted = false;
  }
  
  init() {
    // Initialize Tone.js synth for 8-bit style music
    this.synth = new Tone.Synth({
      oscillator: {
        type: 'square'
      },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.3,
        release: 0.1
      }
    }).toDestination();
    
    // Create a simple 8-bit style loop
    this.sequence = new Tone.Sequence((time, note) => {
      if (this.backgroundEnabled) {
        this.synth.triggerAttackRelease(note, '8n', time);
      }
    }, ['C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4', 'G3'], '4n');
    
    this.sequence.loop = true;
  }
  
  start() {
    if (!this.hasStarted && this.backgroundEnabled) {
      Tone.start();
      this.sequence.start(0);
      this.hasStarted = true;
    }
  }
  
  toggleBackground() {
    this.backgroundEnabled = !this.backgroundEnabled;
    if (this.backgroundEnabled && !this.hasStarted) {
      this.start();
    } else if (!this.backgroundEnabled && this.sequence) {
      this.sequence.stop();
    } else if (this.backgroundEnabled && this.sequence) {
      this.sequence.start(0);
    }
  }
  
  toggleSFX() {
    this.sfxEnabled = !this.sfxEnabled;
  }
  
  playToolSound(toolName) {
    if (!this.sfxEnabled) return;
    
    let soundParams;
    
    switch (toolName) {
      case 'stick':
        // High, quick tick sound
        soundParams = [0.1, , 800, 0.01, 0.01, 0.1, , 0.5, , , , , , 0.1];
        break;
      case 'finger':
        // Medium, smearing sound
        soundParams = [0.2, , 400, 0.05, 0.1, 0.2, , 0.3, , , , , , 0.2];
        break;
      case 'trowel':
        // Lower, digging sound
        soundParams = [0.3, , 200, 0.1, 0.2, 0.3, , 0.4, , , , , , 0.3];
        break;
      default:
        return;
    }
    
    if (typeof zzfx !== 'undefined') {
      zzfx(...soundParams);
    }
  }
  
  isBackgroundEnabled() {
    return this.backgroundEnabled;
  }
  
  isSFXEnabled() {
    return this.sfxEnabled;
  }
}

