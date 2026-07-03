/**
 * @file callSounds.js
 * @description Web Audio API sound synthesizer for WebRTC calls (incoming ring, outgoing ringback, connect chime, disconnect beep).
 * @author Antigravity
 */

class CallSounds {
  constructor() {
    this.audioCtx = null;
    this.incomingInterval = null;
    this.outgoingInterval = null;
    this.incomingOscillators = [];
    this.outgoingOscillators = [];
    this.shouldRingIncoming = false;
    this.shouldRingOutgoing = false;
    this.resumeListener = null;
    this.outgoingResumeListener = null;
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // Play a standard dual-frequency tone
  createTone(freq1, freq2, type = 'sine') {
    this.init();
    const osc1 = this.audioCtx.createOscillator();
    const osc2 = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc1.type = type;
    osc1.frequency.value = freq1;

    osc2.type = type;
    osc2.frequency.value = freq2;

    gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    return { osc1, osc2, gainNode };
  }

  // 1. Play Incoming Ringtone (pulsed dual-frequency ring)
  startIncomingRing() {
    this.stopAll();
    this.shouldRingIncoming = true;
    try {
      this.init();
      
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        throw new Error('AudioContext suspended');
      }

      const playRingCycle = () => {
        if (!this.shouldRingIncoming) return;
        if (!this.audioCtx || this.audioCtx.state === 'suspended') return;
        
        const now = this.audioCtx.currentTime;
        // Classic US Telephone ring: 440Hz + 480Hz
        const tone1 = this.createTone(440, 480);
        const tone2 = this.createTone(440, 480);
        
        // Pulse 1: 0.4s on, 0.2s off
        tone1.gainNode.gain.setValueAtTime(0, now);
        tone1.gainNode.gain.linearRampToValueAtTime(0.12, now + 0.05);
        tone1.gainNode.gain.setValueAtTime(0.12, now + 0.4);
        tone1.gainNode.gain.linearRampToValueAtTime(0, now + 0.45);
        
        // Pulse 2: 0.4s on
        tone2.gainNode.gain.setValueAtTime(0, now + 0.6);
        tone2.gainNode.gain.linearRampToValueAtTime(0.12, now + 0.65);
        tone2.gainNode.gain.setValueAtTime(0.12, now + 1.0);
        tone2.gainNode.gain.linearRampToValueAtTime(0, now + 1.05);
        
        tone1.osc1.start(now);
        tone1.osc2.start(now);
        tone1.osc1.stop(now + 1.1);
        tone1.osc2.stop(now + 1.1);
        
        tone2.osc1.start(now + 0.6);
        tone2.osc2.start(now + 0.6);
        tone2.osc1.stop(now + 1.15);
        tone2.osc2.stop(now + 1.15);

        this.incomingOscillators.push(tone1, tone2);
      };

      playRingCycle();
      this.incomingInterval = setInterval(playRingCycle, 3000);

    } catch(err) {
      console.warn('[CallSounds] Autoplay blocked, trying on first user interaction');
      if (this.resumeListener) {
        document.removeEventListener('click', this.resumeListener);
        document.removeEventListener('keydown', this.resumeListener);
      }
      this.resumeListener = () => {
        if (this.shouldRingIncoming) {
          this.startIncomingRing();
        }
        document.removeEventListener('click', this.resumeListener);
        document.removeEventListener('keydown', this.resumeListener);
        this.resumeListener = null;
      };
      document.addEventListener('click', this.resumeListener, { once: true });
      document.addEventListener('keydown', this.resumeListener, { once: true });
    }
  }

  stopIncomingRing() {
    this.shouldRingIncoming = false;
    if (this.incomingInterval) {
      clearInterval(this.incomingInterval);
      this.incomingInterval = null;
    }
    if (this.resumeListener) {
      document.removeEventListener('click', this.resumeListener);
      document.removeEventListener('keydown', this.resumeListener);
      this.resumeListener = null;
    }
    this.incomingOscillators.forEach(t => {
      try { t.osc1.stop(); t.osc2.stop(); } catch(e){}
    });
    this.incomingOscillators = [];
  }

  // 2. Play Outgoing Ringback Tone ("ring... ring... ")
  startOutgoingRing() {
    this.stopAll();
    this.shouldRingOutgoing = true;
    try {
      this.init();

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        throw new Error('AudioContext suspended');
      }

      const playRingCycle = () => {
        if (!this.shouldRingOutgoing) return;
        if (!this.audioCtx || this.audioCtx.state === 'suspended') return;
        
        const now = this.audioCtx.currentTime;
        // Standard US Ringback: 440Hz + 480Hz, 1.5 seconds on, 3.5 seconds off
        const tone = this.createTone(440, 480);
        
        tone.gainNode.gain.setValueAtTime(0, now);
        tone.gainNode.gain.linearRampToValueAtTime(0.08, now + 0.1);
        tone.gainNode.gain.setValueAtTime(0.08, now + 1.5);
        tone.gainNode.gain.linearRampToValueAtTime(0, now + 1.6);
        
        tone.osc1.start(now);
        tone.osc2.start(now);
        tone.osc1.stop(now + 1.7);
        tone.osc2.stop(now + 1.7);

        this.outgoingOscillators.push(tone);
      };

      playRingCycle();
      this.outgoingInterval = setInterval(playRingCycle, 5000);

    } catch(err) {
      console.warn('[CallSounds] Outgoing autoplay blocked, trying on first user interaction');
      if (this.outgoingResumeListener) {
        document.removeEventListener('click', this.outgoingResumeListener);
        document.removeEventListener('keydown', this.outgoingResumeListener);
      }
      this.outgoingResumeListener = () => {
        if (this.shouldRingOutgoing) {
          this.startOutgoingRing();
        }
        document.removeEventListener('click', this.outgoingResumeListener);
        document.removeEventListener('keydown', this.outgoingResumeListener);
        this.outgoingResumeListener = null;
      };
      document.addEventListener('click', this.outgoingResumeListener, { once: true });
      document.addEventListener('keydown', this.outgoingResumeListener, { once: true });
    }
  }

  stopOutgoingRing() {
    this.shouldRingOutgoing = false;
    if (this.outgoingInterval) {
      clearInterval(this.outgoingInterval);
      this.outgoingInterval = null;
    }
    if (this.outgoingResumeListener) {
      document.removeEventListener('click', this.outgoingResumeListener);
      document.removeEventListener('keydown', this.outgoingResumeListener);
      this.outgoingResumeListener = null;
    }
    this.outgoingOscillators.forEach(t => {
      try { t.osc1.stop(); t.osc2.stop(); } catch(e){}
    });
    this.outgoingOscillators = [];
  }

  // 3. Play Connect Sound (pleasant ascending chime)
  playConnectSound() {
    this.stopAll();
    this.init();
    if (!this.audioCtx || this.audioCtx.state === 'suspended') return;

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
    osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.05);
    gainNode.gain.setValueAtTime(0.12, now + 0.35);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.55);

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.6);
  }

  // 4. Play Disconnect Sound (short descending beep)
  playDisconnectSound() {
    this.stopAll();
    this.init();
    if (!this.audioCtx || this.audioCtx.state === 'suspended') return;

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, now); // E4
    osc.frequency.linearRampToValueAtTime(165, now + 0.2); // E3

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.05);
    gainNode.gain.setValueAtTime(0.12, now + 0.15);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.25);

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  stopAll() {
    this.stopIncomingRing();
    this.stopOutgoingRing();
  }
}

export const callSounds = new CallSounds();
export default callSounds;
