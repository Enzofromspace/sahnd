import { zzfx } from './vendor/zzfx.js';

// Audio manager: Tone.js desert lofi 8-bit score + ZzFX tool SFX.
//
// Music design: ~72 BPM with light swing, D phrygian dominant for the desert
// flavor. Four layers — triangle bass drone, square-wave melody through
// lowpass/delay/reverb, brown-noise wind pad, sparse triangle percussion —
// glued by a subtle bitcrusher + lowpass on the music bus.

const BPM = 72;

// Melody phrases, each spanning a 2-measure loop. Offsets use Tone's
// "bar:beat:sixteenth" notation relative to the loop start. Notes stay on the
// calmer degrees of D phrygian dominant (root, 4th, 5th, minor 7th) with
// occasional Eb/F#/Bb color tones.
const MELODY_PHRASES = [
  [
    ['0:0', 'D4', '8n'],
    ['0:1', 'G4', '8n'],
    ['0:2', 'A4', '4n'],
    ['1:0', 'C5', '8n'],
    ['1:1', 'A4', '2n'],
  ],
  [
    ['0:0', 'A4', '4n'],
    ['0:2', 'G4', '8n'],
    ['0:3', 'F#4', '8n'],
    ['1:0', 'D4', '2n'],
  ],
  [
    ['0:0', 'D5', '8n'],
    ['0:2', 'C5', '8n'],
    ['0:3', 'A4', '8n'],
    ['1:0', 'Bb4', '4n'],
    ['1:2', 'A4', '4n'],
  ],
  [
    ['0:0', 'G4', '4n'],
    ['0:2', 'A4', '8n'],
    ['1:0', 'F#4', '8n'],
    ['1:1', 'Eb4', '8n'],
    ['1:2', 'D4', '2n'],
  ],
  [
    ['0:1', 'A3', '8n'],
    ['0:2', 'D4', '4n'],
    ['1:0', 'G4', '8n'],
    ['1:2', 'A4', '2n'],
  ],
];

// Phrase order per 2-measure slot; null bars are rests so the loop breathes.
const PHRASE_PATTERN = [0, null, 1, 2, null, 3, 0, 4, null, 2, 1, null];

// 8-bar bass line, one note per measure: i / bVII / bII / i cadence.
const BASS_NOTES = ['D2', 'D2', 'C2', 'C2', 'Eb2', 'Eb2', 'D2', 'A1'];

// 2-measure percussion pattern on quarter notes, mostly rests.
const PERC_PATTERN = [null, 'D3', null, null, null, 'A2', null, null];

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
    this.windNoise = null;
    this.windFilter = null;
    this.phraseStep = 0;
  }

  init() {
    if (typeof Tone === 'undefined') return;

    Tone.Transport.bpm.value = BPM;
    Tone.Transport.swing = 0.15;
    Tone.Transport.swingSubdivision = '8n';

    // Music bus: bitcrusher + gentle lowpass round off the chiptune edges.
    this.masterVolume = new Tone.Volume(this.volumeToDb(this.musicVolume)).toDestination();
    const busFilter = new Tone.Filter(3200, 'lowpass').connect(this.masterVolume);
    const crusher = new Tone.BitCrusher(8).connect(busFilter);
    crusher.wet.value = 0.35;
    const bus = new Tone.Gain(0.9).connect(crusher);

    const bassSynth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.6, decay: 0.4, sustain: 0.8, release: 2.5 },
      volume: -10,
    }).connect(bus);

    const melodyFx = new Tone.Filter(1100, 'lowpass');
    const melodyDelay = new Tone.FeedbackDelay('8n.', 0.22);
    melodyDelay.wet.value = 0.3;
    const melodyReverb = new Tone.Reverb({ decay: 4, wet: 0.3 });
    melodyFx.chain(melodyDelay, melodyReverb, bus);

    const melodySynth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.5 },
      volume: -16,
    }).connect(melodyFx);

    const percSynth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.15, sustain: 0, release: 0.1 },
      volume: -20,
    }).connect(bus);

    // Wind pad: brown noise through a slowly swept bandpass filter.
    this.windFilter = new Tone.AutoFilter({
      frequency: 0.05,
      baseFrequency: 200,
      octaves: 2,
      type: 'sine',
    }).connect(bus);
    this.windFilter.filter.type = 'bandpass';
    this.windNoise = new Tone.Noise({ type: 'brown', volume: -30 }).connect(this.windFilter);

    this.synths = [bassSynth, melodySynth, percSynth];

    const bassSeq = new Tone.Sequence((time, note) => {
      if (this.backgroundEnabled) {
        bassSynth.triggerAttackRelease(note, '1n', time, 0.8);
      }
    }, BASS_NOTES, '1n');

    const melodyLoop = new Tone.Loop((time) => {
      if (!this.backgroundEnabled) return;
      const slot = PHRASE_PATTERN[this.phraseStep % PHRASE_PATTERN.length];
      this.phraseStep += 1;
      if (slot === null) return;

      for (const [offset, note, duration] of MELODY_PHRASES[slot]) {
        melodySynth.triggerAttackRelease(note, duration, time + Tone.Time(offset).toSeconds(), 0.6);
      }
    }, '2m');

    const percSeq = new Tone.Sequence((time, note) => {
      if (this.backgroundEnabled && note && Math.random() < 0.3) {
        percSynth.triggerAttackRelease(note, '16n', time, 0.5);
      }
    }, PERC_PATTERN, '4n');

    this.sequences = [bassSeq, melodyLoop, percSeq];
    for (const seq of this.sequences) {
      if ('loop' in seq) {
        seq.loop = true;
      }
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

  // Always unlock the AudioContext on the first gesture; only sequence
  // playback is gated by the music toggle.
  async start() {
    if (typeof Tone === 'undefined') return;
    if (this.hasStarted || this.starting) return;

    this.starting = true;
    try {
      await Tone.start();
      this.hasStarted = true;
      if (this.backgroundEnabled) {
        this.startSequences();
      }
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

    if (this.windNoise && this.windNoise.state !== 'started') {
      this.windNoise.start();
    }
    if (this.windFilter && this.windFilter.state !== 'started') {
      this.windFilter.start();
    }
  }

  stopSequences() {
    for (const seq of this.sequences) {
      if (seq.state === 'started') {
        seq.stop();
      }
    }

    if (this.windNoise && this.windNoise.state === 'started') {
      this.windNoise.stop();
    }
    if (this.windFilter && this.windFilter.state === 'started') {
      this.windFilter.stop();
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
    if (!this.sfxEnabled) return;

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
