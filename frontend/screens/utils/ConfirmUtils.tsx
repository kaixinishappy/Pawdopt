import { Alert, Platform } from "react-native";

export const handleConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel: () => void = () => {}
) => {
  if (Platform.OS === 'web') {
    // For web, use the browser's built-in confirm()
    if (window.confirm(`${title}: ${message}`)) {
      onConfirm();
    } else {
      onCancel();
    }
  } else {
    // For mobile (iOS/Android), use the native Alert component with buttons
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', onPress: onCancel, style: 'cancel' },
        { text: 'Logout', onPress: onConfirm },
      ],
      { cancelable: false }
    );
  }
};