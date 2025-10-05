import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native"; 
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../App'; 

// Import the new modular components
import { GradientBackground, Button } from '../../components';
import { colors } from '../../components/styles/GlobalStyles';

// Define the type for the navigation prop for this screen
type OnboardingScreenProps = NavigationProp<RootStackParamList, 'Onboarding'>; 

const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<OnboardingScreenProps>();
  return (
    <GradientBackground colors={[colors.yellow, colors.red]}>
      <View style={styles.container}>
        {/* Pawdopt Logo */}
        <Image
          source={require("../../assets/pawdopt_logo_white.png")} 
          style={styles.logo}
        />
        <Text style={styles.logoText}>Pawdopt</Text>
        
        {/* Buttons using modular Button component */}
        <Button
          title="SIGN UP AS ADOPTER"
          variant="primary"
          onPress={() =>
            navigation.navigate("UniversalCreateAccount", { role: "adopter" })
          }
          style={styles.adopterButton}
          textStyle={styles.buttonText}
        />
        
        <Button
          title="SIGN UP AS SHELTER"
          variant="primary"
          onPress={() =>
            navigation.navigate("UniversalCreateAccount", { role: "shelter" })
          }
          style={styles.shelterButton}
          textStyle={styles.buttonText}
        />
        
        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  logo: {
    width: 150, 
    height: 150, 
    resizeMode: "contain",
    marginBottom: 10,
  },
  logoText: {
    fontSize: 48, 
    fontWeight: "bold",
    color: colors.white, 
    marginBottom: 50, 
  },
  adopterButton: {
    width: "80%",
    backgroundColor: colors.white,
    borderRadius: 50,
    marginBottom: 15,
    paddingVertical: 15,
  },
  shelterButton: {
    width: "80%", 
    backgroundColor: colors.white,
    borderRadius: 50,
    marginBottom: 15,
    paddingVertical: 15,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.orange,
  },
  loginContainer: {
    flexDirection: "row",
    marginTop: 20,
    alignItems: "center",
  },
  loginText: {
    color: colors.white,
    fontSize: 16,
  },
  loginLink: {
    color: colors.white, 
    fontSize: 16,
    fontWeight: "bold",
    textDecorationLine: "underline", 
  },
});

export default OnboardingScreen;
