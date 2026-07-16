import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../shared/hooks/useTheme';
import { useVoicePlayer } from '../hooks/useVoicePlayer';

interface VoicePlayerProps {
  url: string;
  duration: number;
  isMe: boolean;
}

const waveformBars = [8, 12, 16, 10, 14, 22, 18, 12, 8, 12, 18, 26, 20, 14, 10, 16, 24, 14, 8, 12, 10, 14, 18, 12, 8];

export const VoicePlayer: React.FC<VoicePlayerProps> = ({ url, duration, isMe }) => {
  const { colors, typography } = useTheme();
  const { isPlaying, position, speed, loadedDuration, playPause, changeSpeed, seek } = useVoicePlayer(url, duration);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={styles.voicePlayerRow}>
      <Pressable
        onPress={playPause}
        style={[
          styles.voicePlayBtn,
          { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : colors.neutralLight },
        ]}
      >
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={isMe ? '#FFFFFF' : colors.primary} />
      </Pressable>

      <View style={styles.voiceWaveformContainer}>
        <Pressable
          onPress={(event) => {
            const { locationX } = event.nativeEvent;
            // Waveform component layout width is 120px
            const progress = Math.max(0, Math.min(1, locationX / 120));
            seek(progress);
          }}
          style={styles.waveformPressArea}
        >
          {waveformBars.map((height, idx) => {
            const isActive = idx / waveformBars.length <= position;
            return (
              <View
                key={idx}
                style={[
                  styles.waveformBar,
                  {
                    height,
                    backgroundColor: isActive
                      ? (isMe ? '#FFFFFF' : colors.primary)
                      : (isMe ? 'rgba(255,255,255,0.3)' : colors.border),
                  },
                ]}
              />
            );
          })}
        </Pressable>
        <Text style={[styles.voiceDurationText, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
          {formatTime(loadedDuration * (1 - position))}
        </Text>
      </View>

      <Pressable
        onPress={changeSpeed}
        style={[styles.speedBtn, { borderColor: isMe ? 'rgba(255,255,255,0.4)' : colors.border }]}
      >
        <Text style={[styles.speedText, { color: isMe ? '#FFFFFF' : colors.text, fontFamily: typography.fonts.bold }]}>
          {speed}x
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  voicePlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 210,
    height: 44,
  },
  voicePlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceWaveformContainer: {
    flex: 1,
    marginHorizontal: 10,
    justifyContent: 'center',
  },
  waveformPressArea: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    width: 120,
    justifyContent: 'space-between',
  },
  waveformBar: {
    width: 3,
    borderRadius: 1.5,
  },
  voiceDurationText: {
    fontSize: 9,
    marginTop: 3,
  },
  speedBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedText: {
    fontSize: 10,
  },
});

export default VoicePlayer;
