/**
 * @file DraggableLocalVideo.tsx
 * @description Floating, interactive Picture-in-Picture (PiP) local video window
 *              with pan responder dragging and toggle options.
 */

import React, { useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, PanResponder, Text } from 'react-native';

let RTCView: any = null;
try {
  const webrtc = require('react-native-webrtc');
  RTCView = webrtc.RTCView;
} catch (e) {
  // Simulation fallback
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DraggableLocalVideoProps {
  localStream: any;
  isVideoOff: boolean;
  isFrontCamera: boolean;
}

export const DraggableLocalVideo: React.FC<DraggableLocalVideoProps> = ({
  localStream,
  isVideoOff,
  isFrontCamera,
}) => {
  const panPosition = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - 120, y: 80 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        panPosition.setOffset({
          // @ts-ignore
          x: panPosition.x._value,
          // @ts-ignore
          y: panPosition.y._value,
        });
        panPosition.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: panPosition.x, dy: panPosition.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        panPosition.flattenOffset();
      },
    })
  ).current;

  if (isVideoOff) return null;

  return (
    <Animated.View style={[styles.pipContainer, panPosition.getLayout()]} {...panResponder.panHandlers}>
      {RTCView && localStream ? (
        <RTCView
          streamURL={localStream.toURL()}
          style={StyleSheet.absoluteFillObject}
          objectFit="cover"
          mirror={isFrontCamera}
        />
      ) : (
        <View style={styles.simulationBox}>
          <Text style={styles.simulationText}>Your Cam</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  pipContainer: {
    position: 'absolute',
    width: 100,
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#38BDF8',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    zIndex: 999,
  },
  simulationBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simulationText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default DraggableLocalVideo;
