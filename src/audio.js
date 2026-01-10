// Audio management: Tone.js for background music, ZzFX for tool sounds
class AudioManager {
  constructor() {
    this.backgroundEnabled = true;
    this.sfxEnabled = true;
    this.synths = [];
    this.sequences = [];
    this.hasStarted = false;
  }
  
  init() {
    // Desert-inspired ambient theme with multiple layers
    
    // Layer 1: Low drone (desert wind)
    const droneSynth = new Tone.Synth({
      oscillator: {
        type: 'sawtooth'
      },
      envelope: {
        attack: 2,
        decay: 1,
        sustain: 0.7,
        release: 3
      }
    }).connect(new Tone.Volume(-12)).toDestination();
    
    // Layer 2: Melodic desert theme (pentatonic scale - common in desert music)
    const melodySynth = new Tone.Synth({
      oscillator: {
        type: 'square'
      },
      envelope: {
        attack: 0.05,
        decay: 0.2,
        sustain: 0.4,
        release: 0.3
      }
    }).connect(new Tone.Volume(-8)).toDestination();
    
    // Layer 3: Percussive element (sand shifting)
    const percSynth = new Tone.Synth({
      oscillator: {
        type: 'triangle'
      },
      envelope: {
        attack: 0.01,
        decay: 0.3,
        sustain: 0,
        release: 0.2
      }
    }).connect(new Tone.Volume(-10)).toDestination();
    
    this.synths = [droneSynth, melodySynth, percSynth];
    
    // Drone sequence - sustained low notes (wind)
    const droneSeq = new Tone.Sequence((time, note) => {
      droneSynth.triggerAttackRelease(note, '2n', time);
    }, ['C2', 'D2', 'C2', 'Eb2'], '2n');
    
    // Melody sequence - desert pentatonic theme
    // Using pentatonic scale: C, D, E, G, A (evokes desert/middle eastern feel)
    const melodySeq = new Tone.Sequence((time, note) => {
      melodySynth.triggerAttackRelease(note, '8n', time);
    }, ['C4', 'D4', 'E4', 'G4', 'A4', 'G4', 'E4', 'D4', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'A4', 'G4'], '8n');
    
    // Percussion sequence - subtle sand shifting sounds
    const percSeq = new Tone.Sequence((time, note) => {
      if (note && Math.random() > 0.7) {
        percSynth.triggerAttackRelease(note, '16n', time);
      }
    }, ['C3', null, 'D3', null, 'C3', null, 'Eb3', null], '4n');
    
    this.sequences = [droneSeq, melodySeq, percSeq];
    
    // Set all sequences to loop
    this.sequences.forEach(seq => {
      seq.loop = true;
    });
  }
  
  start() {
    if (this.backgroundEnabled) {
      // Start Tone.js audio context if not already started
      if (Tone.context.state !== 'running') {
        Tone.start().then(() => {
          this.startSequences();
        }).catch(err => {
          console.error('Audio start error:', err);
          // Try to start sequences anyway
          this.startSequences();
        });
      } else {
        // Audio context already running, just start sequences
        this.startSequences();
      }
    }
  }
  
  startSequences() {
    if (this.sequences.length > 0 && this.backgroundEnabled) {
      // Stop sequences first to ensure clean restart
      this.sequences.forEach(seq => seq.stop());
      // Small delay to ensure clean restart
      setTimeout(() => {
        this.sequences.forEach(seq => {
          seq.start(0);
        });
      }, 10);
      this.hasStarted = true;
    }
  }
  
  stopSequences() {
    if (this.sequences.length > 0) {
      this.sequences.forEach(seq => seq.stop());
    }
  }
  
  toggleBackground() {
    this.backgroundEnabled = !this.backgroundEnabled;
    
    if (this.backgroundEnabled) {
      // Turn audio on
      if (!this.hasStarted) {
        // First time starting
        this.start();
      } else {
        // Restart sequences if they were stopped
        if (Tone.context.state === 'running') {
          this.startSequences();
        } else {
          this.start();
        }
      }
    } else {
      // Turn audio off
      this.stopSequences();
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
        // Drawing in sand - light scraping sound
        soundParams = [0.15, , 600, 0.02, 0.05, 0.15, , 0.3, , , , , , 0.1];
        break;
      case 'finger':
        // Smearing sand - soft whoosh/rustle
        soundParams = [0.25, , 300, 0.1, 0.15, 0.25, , 0.2, , , , , , 0.25];
        break;
      case 'trowel':
        // Digging - deeper scraping/digging sound
        soundParams = [0.35, , 150, 0.15, 0.2, 0.35, , 0.5, , , , , , 0.3];
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

