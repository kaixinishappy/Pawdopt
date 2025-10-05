import { StyleSheet } from "react-native";

export const colors = {
    brightRed: '#F44336',
    red: '#F48B7B',
    orange: '#F7B781',
    yellow: '#F9E286',
    brightGreen: '#4CAF50',
    lightGrey: '#ddd',
    grey: '#999',
    darkGrey: '#333',
    white: '#fff',
    black: '#000',
};

export const globalStyles = StyleSheet.create({
  // Add any global styles here if needed
  shadowStyle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
