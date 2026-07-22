/**
 * @file WhiteboardCanvas.tsx
 * @description Interactive SVG drawing canvas supporting free-hand pen strokes,
 *              highlighter overlays, eraser, and animated laser pointer highlight.
 */

import React, { useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import useCollaborationStore from '../store/useCollaborationStore';
import useAuthStore from '../../../shared/store/authStore';
import { Point, WhiteboardPath } from '../types/collaboration.types';

export const WhiteboardCanvas: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const {
    paths,
    activeTool,
    strokeColor,
    strokeWidth,
    addPath,
    laserPointer,
    setLaserPointer,
  } = useCollaborationStore();

  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);

  const convertPointsToSvgPath = (points: Point[]) => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const initialPoint = { x: locationX, y: locationY };

        if (activeTool === 'laser') {
          if (user) {
            setLaserPointer({
              x: locationX,
              y: locationY,
              userId: user.id,
              userName: user.name,
              isActive: true,
            });
          }
        } else {
          setCurrentPoints([initialPoint]);
        }
      },

      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newPoint = { x: locationX, y: locationY };

        if (activeTool === 'laser') {
          if (user) {
            setLaserPointer({
              x: locationX,
              y: locationY,
              userId: user.id,
              userName: user.name,
              isActive: true,
            });
          }
        } else {
          setCurrentPoints((prev) => [...prev, newPoint]);
        }
      },

      onPanResponderRelease: () => {
        if (activeTool === 'laser') {
          setLaserPointer(null);
        } else if (currentPoints.length > 0 && user) {
          const newPath: WhiteboardPath = {
            id: Math.random().toString(),
            userId: user.id,
            points: currentPoints,
            color: activeTool === 'highlighter' ? 'rgba(245, 158, 11, 0.4)' : strokeColor,
            width: activeTool === 'highlighter' ? strokeWidth * 3 : strokeWidth,
            tool: activeTool,
          };
          addPath(newPath);
          setCurrentPoints([]);
        }
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Svg style={StyleSheet.absoluteFillObject}>
        {/* Render Saved Paths */}
        {paths.map((p) => (
          <Path
            key={p.id}
            d={convertPointsToSvgPath(p.points)}
            stroke={p.color}
            strokeWidth={p.width}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Render Active Drawing Path */}
        {currentPoints.length > 0 && (
          <Path
            d={convertPointsToSvgPath(currentPoints)}
            stroke={activeTool === 'highlighter' ? 'rgba(245, 158, 11, 0.4)' : strokeColor}
            strokeWidth={activeTool === 'highlighter' ? strokeWidth * 3 : strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </Svg>

      {/* Render Laser Pointer Overlay */}
      {laserPointer && laserPointer.isActive && (
        <View
          style={[
            styles.laserDot,
            {
              left: laserPointer.x - 10,
              top: laserPointer.y - 10,
            },
          ]}
        >
          <View style={styles.laserCore} />
          <Text style={styles.laserLabel}>{laserPointer.userName}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  laserDot: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  laserCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  laserLabel: {
    position: 'absolute',
    top: 22,
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
});

export default WhiteboardCanvas;
