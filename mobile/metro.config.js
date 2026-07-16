const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Redirect react-native-webrtc imports directly to the compiled commonjs version
// This allows us to keep default Expo resolver main fields (react-native, browser, main)
// so that third party packages (like debug, socket.io-client) resolve their browser/mobile versions without requiring Node.js tty modules.
config.resolver.extraNodeModules = {
  'react-native-webrtc': path.resolve(__dirname, 'node_modules/react-native-webrtc/lib/commonjs/index.js'),
};

module.exports = config;
