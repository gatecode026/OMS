import 'react-native-gesture-handler/jestSetup';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  useNetInfo: jest.fn(() => ({ isConnected: true, isInternetReachable: true })),
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  }
}));

// Mock expo-secure-store
const store = {};
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn((key, value) => {
    store[key] = value;
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((key) => {
    return Promise.resolve(store[key] || null);
  }),
  deleteItemAsync: jest.fn((key) => {
    delete store[key];
    return Promise.resolve();
  }),
  setItem: jest.fn((key, value) => {
    store[key] = value;
  }),
  getItem: jest.fn((key) => store[key] || null),
  deleteItem: jest.fn((key) => {
    delete store[key];
  }),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  installationId: 'test-installation-id',
  sessionId: 'test-session-id',
  expoConfig: {
    version: '1.0.0',
    extra: {
      eas: {
        projectId: 'test-project-id',
      },
    },
  },
  default: {
    installationId: 'test-installation-id',
    sessionId: 'test-session-id',
    expoConfig: {
      version: '1.0.0',
    }
  }
}));

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-webrtc
jest.mock('react-native-webrtc', () => {
  const mockStream = {
    getTracks: jest.fn(() => []),
    getAudioTracks: jest.fn(() => []),
    getVideoTracks: jest.fn(() => []),
    toURL: jest.fn(() => 'mock-stream-url'),
    release: jest.fn(),
  };
  return {
    RTCPeerConnection: jest.fn().mockImplementation(() => ({
      addStream: jest.fn(),
      removeStream: jest.fn(),
      createOffer: jest.fn(() => Promise.resolve({ sdp: 'mock-sdp', type: 'offer' })),
      createAnswer: jest.fn(() => Promise.resolve({ sdp: 'mock-sdp', type: 'answer' })),
      setLocalDescription: jest.fn(() => Promise.resolve()),
      setRemoteDescription: jest.fn(() => Promise.resolve()),
      addIceCandidate: jest.fn(() => Promise.resolve()),
      close: jest.fn(),
      onicecandidate: null,
      onaddstream: null,
      onconnectionstatechange: null,
      oniceconnectionstatechange: null,
    })),
    RTCIceCandidate: jest.fn(),
    RTCSessionDescription: jest.fn(),
    mediaDevices: {
      enumerateDevices: jest.fn(() => Promise.resolve([{ kind: 'videoinput', facing: 'front', deviceId: 'cam-1' }])),
      getUserMedia: jest.fn(() => Promise.resolve(mockStream)),
    },
  };
});

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const mSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
  };
  return jest.fn(() => mSocket);
});

// Mock expo-font
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
  };
});

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock expo-audio
jest.mock('expo-audio', () => ({
  useAudioRecorder: jest.fn(() => ({
    prepareToRecordAsync: jest.fn(() => Promise.resolve()),
    recordAsync: jest.fn(() => Promise.resolve()),
    stopAsync: jest.fn(() => Promise.resolve()),
    getStatus: jest.fn(() => ({ isRecording: false, duration: 0 })),
    uri: 'mock-uri',
  })),
  requestRecordingPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  RecordingPresets: {
    HIGH_QUALITY: 'high_quality',
  },
}));

// Silence React Native default warnings that clog test output
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Sending `onAnimatedValueUpdate`')) {
    return;
  }
  originalConsoleWarn(...args);
};
