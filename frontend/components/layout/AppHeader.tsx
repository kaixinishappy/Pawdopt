import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

interface AppHeaderProps {
  rightComponent?: React.ReactNode;
  leftComponent?: React.ReactNode;
  style?: ViewStyle;
}

const AppHeader: React.FC<AppHeaderProps> = ({ rightComponent, leftComponent, style }) => {
  return (
    <View style={[styles.header, style]}>
      {/* Left Component Container */}
      {/* Always render leftContainer to maintain layout consistency, even if empty */}
      <View style={styles.leftContainer}>
        {leftComponent}
      </View>

      {/* Logo and Title Container - takes flexible space and centers its own content */}
      <View style={styles.logoTitleContainer}>
        <Image
          source={require('../../assets/pawdopt_logo.png')} 
          style={styles.logo}
        />
        <MaskedView
          style={styles.headerTitleMaskedView}
          maskElement={
            <Text style={[styles.headerTitle, { backgroundColor: 'transparent' }]}>Pawdopt</Text>
          }
        >
          <LinearGradient
            colors={["#F9E286", "#F48B7B"]}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 0 }}
            style={styles.headerTitleGradientBackground}
          />
        </MaskedView>
      </View>

      {/* Right Component Container */}
      {/* Always render rightContainer to maintain layout consistency, even if empty */}
      <View style={styles.rightContainer}>
        {rightComponent}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    minHeight: 70,
    justifyContent: 'space-between', // Always space out the three main sections
  },

  leftContainer: {
    flex: 0.2, // Reserve space for the left component
    alignItems: 'flex-start', // Align content to the left
    justifyContent: 'center', // Center content vertically
    // borderColor: '#ddd',
    // borderWidth: 1, // Optional: Add a right border for separations
  },
  logoTitleContainer: {
    flex: 0.6, // Allows this container to take up all available space
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Centers the logo and title within this flexible container
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginRight: 10,
  },
  headerTitleMaskedView: {
    height: 40,
    width: 130, // Adjusted width to ensure "Pawdopt" fits at fontSize 30
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: 'bold',
  },
  headerTitleGradientBackground: {
    flex: 1,
  },
  rightContainer: {
    flex: 0.2, // Reserve space for the right component
    alignItems: 'flex-end', // Align content to the right
    justifyContent: 'center', // Center content vertically
  },
});

export default AppHeader;
