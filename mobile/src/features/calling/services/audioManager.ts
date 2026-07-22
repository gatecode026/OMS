/**
 * @file audioManager.ts
 * @description Native Audio Engine service using expo-audio.
 *              Handles ringtone & dialing audio playback, background audio mode,
 *              and speakerphone/earpiece route toggles.
 */

import { setAudioModeAsync, createAudioPlayer } from 'expo-audio';

let ringtonePlayer: any = null;
let dialingPlayer: any = null;

export const audioManager = {
  /**
   * Configure background audio mode for active calling
   */
  async configureAudioMode(isSpeaker: boolean = false) {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
      });
    } catch (error) {
      console.warn('[AudioManager] Failed to set audio mode:', error);
    }
  },

  /**
   * Play Incoming Ringtone Sound
   */
  async playRingtone() {
    try {
      if (ringtonePlayer) return;
      await this.configureAudioMode(true);
      const player = createAudioPlayer('https://assets.mixkit.co/active_storage/sfx/1359/1359-84.wav');
      player.loop = true;
      player.volume = 0.85;
      player.play();
      ringtonePlayer = player;
    } catch (e) {
      console.warn('[AudioManager] Error playing ringtone:', e);
    }
  },

  /**
   * Stop Ringtone Sound
   */
  async stopRingtone() {
    try {
      if (ringtonePlayer) {
        ringtonePlayer.pause();
        ringtonePlayer.release();
        ringtonePlayer = null;
      }
    } catch (e) {
      console.warn('[AudioManager] Error stopping ringtone:', e);
    }
  },

  /**
   * Play Outgoing Dialing Sound
   */
  async playDialingSound() {
    try {
      if (dialingPlayer) return;
      await this.configureAudioMode(false);
      const player = createAudioPlayer('https://assets.mixkit.co/active_storage/sfx/2056/2056-84.wav');
      player.loop = true;
      player.volume = 0.5;
      player.play();
      dialingPlayer = player;
    } catch (e) {
      console.warn('[AudioManager] Error playing dialing sound:', e);
    }
  },

  /**
   * Stop Outgoing Dialing Sound
   */
  async stopDialingSound() {
    try {
      if (dialingPlayer) {
        dialingPlayer.pause();
        dialingPlayer.release();
        dialingPlayer = null;
      }
    } catch (e) {
      console.warn('[AudioManager] Error stopping dialing sound:', e);
    }
  },

  /**
   * Clean up all active audio players
   */
  async stopAllSounds() {
    await this.stopRingtone();
    await this.stopDialingSound();
  },
};

export default audioManager;
