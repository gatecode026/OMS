import { useEffect } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { toast } from '../../../shared/components/Toast';

let activeGlobalVoicePlayer: any = null;

export const useVoicePlayer = (url: string, duration: number) => {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  const isPlaying = status.playing;
  const loadedDuration = status.duration || duration;
  const position = loadedDuration > 0 ? status.currentTime / loadedDuration : 0;
  const speed = status.playbackRate;

  useEffect(() => {
    const subscription = player.addListener('playbackStatusUpdate', (s: any) => {
      if (s.didJustFinish) {
        player.pause();
        player.seekTo(0);
        if (activeGlobalVoicePlayer === player) {
          activeGlobalVoicePlayer = null;
        }
      }
    });
    return () => {
      subscription.remove();
      try {
        player.pause();
        if (activeGlobalVoicePlayer === player) {
          activeGlobalVoicePlayer = null;
        }
      } catch (e) {
        // ignore
      }
    };
  }, [player]);

  const playPause = async () => {
    try {
      if (isPlaying) {
        player.pause();
        if (activeGlobalVoicePlayer === player) {
          activeGlobalVoicePlayer = null;
        }
      } else {
        if (activeGlobalVoicePlayer && activeGlobalVoicePlayer !== player) {
          try {
            activeGlobalVoicePlayer.pause();
          } catch (e) {
            // ignore
          }
        }
        activeGlobalVoicePlayer = player;
        player.play();
      }
    } catch (err) {
      console.log('Voice playback error:', err);
      toast.error('Unable to play voice note');
    }
  };

  const changeSpeed = async () => {
    let nextSpeed = 1;
    if (speed === 1) nextSpeed = 1.5;
    else if (speed === 1.5) nextSpeed = 2;
    else nextSpeed = 1;

    try {
      player.setPlaybackRate(nextSpeed);
    } catch (err) {
      console.log('Change speed error:', err);
    }
  };

  const seek = async (progress: number) => {
    try {
      player.seekTo(progress * loadedDuration * 1000);
    } catch (e) {
      console.log('Error seeking audio:', e);
    }
  };

  return {
    isPlaying,
    position,
    speed,
    loadedDuration,
    playPause,
    changeSpeed,
    seek,
  };
};

export default useVoicePlayer;
