import { Alert, Platform } from 'react-native';

export const handleAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    // For web, use the browser's built-in alert or a simple console.log
    alert(`${title}: ${message}`);
  } else {
    // For mobile (iOS/Android), use the native Alert component
    Alert.alert(title, message);
  }
};