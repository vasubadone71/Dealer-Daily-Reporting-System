import { LogBox } from 'react-native';

// Suppress the module-level Expo Go warning regarding push notification removal.
// This prevents Expo Go from popping up a RedBox error overlay during development.
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported'
]);

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
