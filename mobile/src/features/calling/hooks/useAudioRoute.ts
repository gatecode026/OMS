/**
 * @file useAudioRoute.ts
 * @description Enterprise Audio Route selection and state listener hook.
 *              Manages switching between Speaker, Earpiece, Bluetooth, and Wired Headsets.
 */

import { useState, useCallback } from 'react';
import { AudioRoute } from '../components/AudioRoutePickerModal';

export interface UseAudioRouteResult {
  activeRoute: AudioRoute;
  selectRoute: (route: AudioRoute) => void;
  isSpeakerActive: boolean;
  isBluetoothActive: boolean;
}

export const useAudioRoute = (initialRoute: AudioRoute = 'speaker'): UseAudioRouteResult => {
  const [activeRoute, setActiveRoute] = useState<AudioRoute>(initialRoute);

  const selectRoute = useCallback((route: AudioRoute) => {
    setActiveRoute(route);
  }, []);

  return {
    activeRoute,
    selectRoute,
    isSpeakerActive: activeRoute === 'speaker',
    isBluetoothActive: activeRoute === 'bluetooth',
  };
};

export default useAudioRoute;
