// Audio manager: Tone.js background score + ZzFX tool SFX.
export default class AudioManager {
  constructor() {
    this.backgroundEnabled = true;
    this.sfxEnabled = true;
    this.synths = [];
    this.sequences = [];
    this.hasStarted = false;
    this.starting = false;

    this.musicVolume = 0.4;
    this.sfxVolume = 0.7;
    this.lastSfxTime = 0;

    this.masterVolume = null;
  }

  init() {
    if (typeof Tone === 'undefined') return;

    this.masterVolume = new Tone.Volume(this.volumeToDb(this.musicVolume)).toDestination();

    const droneSynth = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 2, decay: 1, sustain: 0.7, release: 3 },
    }).connect(this.masterVolume);

    const melodySynth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.4, release: 0.3 },
    }).connect(this.masterVolume);

    const percSynth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 },
    }).connect(this.masterVolume);

    this.synths = [droneSynth, melodySynth, percSynth];

    const droneSeq = new Tone.Sequence((time, note) => {
      if (this.backgroundEnabled) {
        droneSynth.triggerAttackRelease(note, '2n', time);
      }
    }, ['C2', 'D2', 'C2', 'Eb2'], '2n');

    const melodySeq = new Tone.Sequence((time, note) => {
      if (this.backgroundEnabled) {
        melodySynth.triggerAttackRelease(note, '8n', time);
      }
    }, ['C4', 'D4', 'E4', 'G4', 'A4', 'G4', 'E4', 'D4', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'A4', 'G4'], '8n');

    const percSeq = new Tone.Sequence((time, note) => {
      if (this.backgroundEnabled && note && Math.random() > 0.7) {
        percSynth.triggerAttackRelease(note, '16n', time);
      }
    }, ['C3', null, 'D3', null, 'C3', null, 'Eb3', null], '4n');

    this.sequences = [droneSeq, melodySeq, percSeq];
    for (const seq of this.sequences) {
      seq.loop = true;
    }
  }

  volumeToDb(value) {
    if (value <= 0) return -60;
    return 20 * Math.log10(value);
  }

  setMusicVolume(value) {
    this.musicVolume = Math.min(1, Math.max(0, value));
    if (this.masterVolume) {
      this.masterVolume.volume.value = this.volumeToDb(this.musicVolume);
    }
  }

  setSfxVolume(value) {
    this.sfxVolume = Math.min(1, Math.max(0, value));
  }

  async start() {
    if (!this.backgroundEnabled || typeof Tone === 'undefined') return;
    if (this.hasStarted || this.starting) return;

    this.starting = true;
    try {
      await Tone.start();
      if (Tone.Transport.state !== 'started') {
        Tone.Transport.start();
      }

      for (const seq of this.sequences) {
        if (seq.state !== 'started') {
          seq.start(0);
        }
      }

      this.hasStarted = true;
    } catch (err) {
      // Keep app functional if browser audio context fails to start.
      console.error('Audio failed to start', err);
    } finally {
      this.starting = false;
    }
  }

  startSequences() {
    if (!this.backgroundEnabled || typeof Tone === 'undefined') return;

    if (Tone.Transport.state !== 'started') {
      Tone.Transport.start();
    }

    for (const seq of this.sequences) {
      if (seq.state !== 'started') {
        seq.start(0);
      }
    }
  }

  stopSequences() {
    for (const seq of this.sequences) {
      if (seq.state === 'started') {
        seq.stop();
      }
    }
  }

  toggleBackground() {
    this.backgroundEnabled = !this.backgroundEnabled;

    if (this.backgroundEnabled) {
      if (!this.hasStarted) {
        this.start();
      } else {
        this.startSequences();
      }
    } else {
      this.stopSequences();
    }
  }

  toggleSFX() {
    this.sfxEnabled = !this.sfxEnabled;
  }

  getToolParams(toolName) {
    switch (toolName) {
      case 'stick':
        return [0.15, undefined, 600, 0.02, 0.05, 0.15, undefined, 0.3, undefined, undefined, undefined, undefined, undefined, 0.1];
      case 'finger':
        return [0.25, undefined, 300, 0.1, 0.15, 0.25, undefined, 0.2, undefined, undefined, undefined, undefined, undefined, 0.25];
      case 'trowel':
        return [0.35, undefined, 150, 0.15, 0.2, 0.35, undefined, 0.5, undefined, undefined, undefined, undefined, undefined, 0.3];
      default:
        return null;
    }
  }

  playToolSound(toolName) {
    if (!this.sfxEnabled || typeof zzfx === 'undefined') return;

    const now = performance.now();
    if (now - this.lastSfxTime < 45) return;
    this.lastSfxTime = now;

    const params = this.getToolParams(toolName);
    if (!params) return;

    const output = [...params];
    output[0] = (output[0] || 0.2) * this.sfxVolume;
    zzfx(...output);
  }

  isBackgroundEnabled() {
    return this.backgroundEnabled;
  }

  isSFXEnabled() {
    return this.sfxEnabled;
  }
}
