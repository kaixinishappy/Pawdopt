import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/GlobalStyles';

// Define props for navigation
interface AppFooterProps {
  onPressProfile: () => void;
  onPressHome: () => void;
  onPressChat: () => void;
  activeScreen: 'profile' | 'home' | 'chat'; // To highlight active icon
}

const AppFooter: React.FC<AppFooterProps> = ({
  onPressProfile,
  onPressHome,
  onPressChat,
  activeScreen,
}) => {
  const getIconColor = (screen: string) =>
    activeScreen === screen ? colors.red : colors.grey;

  return (
    <View style={styles.footer}>
      <TouchableOpacity onPress={onPressChat} style={styles.footerIcon}>
        <Ionicons name="chatbubbles-outline" size={30} color={getIconColor('chat')} />
        <Text style={[styles.iconText, { color: getIconColor('chat') }]}>Chat</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onPressHome} style={styles.footerIcon}>
        <Ionicons name="home-outline" size={30} color={getIconColor('home')} />
        <Text style={[styles.iconText, { color: getIconColor('home') }]}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onPressProfile} style={styles.footerIcon}>
        <Ionicons name="person-outline" size={30} color={getIconColor('profile')} />
        <Text style={[styles.iconText, { color: getIconColor('profile') }]}>Profile</Text>
      </TouchableOpacity>
      
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.lightGrey,
    backgroundColor: colors.white,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 20,
  },
  footerIcon: {
    alignItems: 'center',
    flex: 1, // Distribute space evenly
  },
  iconText: {
    fontSize: 12,
    marginTop: 2,
    color: colors.grey,
  },
});

export default AppFooter;
