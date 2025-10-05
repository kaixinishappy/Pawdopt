import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../../App';
import { handleAlert } from '../utils/AlertUtils'; 
import { signIn } from '../../services/CognitoService';
import { jwtDecode } from 'jwt-decode';
import { Ionicons } from '@expo/vector-icons';

// Import the new modular components
import { Input, GradientButton } from '../../components';
import { colors } from '../../components/styles/GlobalStyles';

type LoginScreenProps = NavigationProp<RootStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenProps>();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false); // State to toggle password visibility


  // Handle Login button press
  const handleLogin = async () => {
    if (!email || !password) {
      handleAlert('Error', 'Please enter both email and password.');
      return;
    }

    try {
      // IMPORTANT CHANGE: Call the signIn function from CognitoService
      // This function handles the API call, token storage (including refreshToken),
      // and returns the tokens or throws an error.
      const { idToken } = await signIn(email, password); 

      // Additional explicit storage of idToken (redundant but for confirmation)
      await AsyncStorage.setItem("idToken", idToken);

      // Now, decode the token to get the user role.
      // You still need jwtDecode here if you want to determine role immediately after login.
      // If you prefer, you can modify the signIn function in CognitoService to also return the userRole.
      const decodedToken: { 'custom:role': 'shelter' | 'adopter' } = jwtDecode(idToken);
      const userRole = decodedToken['custom:role']; 

      if (userRole === 'shelter') {
        handleAlert('Login Success', 'Welcome, Shelter User!');
        navigation.navigate('ShelterDashboard', {});
      } else {
        handleAlert('Login Success', 'Welcome, Adopter!');
        navigation.navigate('AdopterDashboard');
      }
    } catch (err: any) {
      // The error message comes from the signIn function now
      handleAlert('Login Failed', err.message || 'Something went wrong.');
    }
  };

  // Navigate to the Onboarding/Signup page
  const handleCreateAccount = () => {
    navigation.navigate('Onboarding'); // Navigate back to the Onboarding screen for signup options
  };

  return (
    <View style={styles.container}>
      <Text style={styles.greetingTitle}>Log in</Text>
      <Text style={styles.greetingSubtitle}>Hi! Welcome to</Text>

      {/* Pawdopt Logo and Name */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/pawdopt_logo.png')} 
          style={styles.logo}
        />
        <Text style={styles.appName}>Pawdopt</Text>
      </View>

      {/* Email Input */}
      <View style={styles.emailInputWrapper}>
        <Input
          label="Email Address"
          placeholder="Enter Your Email"
          placeholderTextColor={colors.grey}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          style={styles.customInput}
        />
      </View>

      {/* Password Input */}
      <View style={styles.passwordInputWrapper}>
        <Input
          label="Password"
          placeholder="Enter Your Password"
          placeholderTextColor={colors.grey}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          style={styles.customInput}
          containerStyle={styles.passwordInputStyle}
        />
        <TouchableOpacity
          style={styles.passwordToggle}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color={colors.grey} />
        </TouchableOpacity>
      </View>

      {/* Login Button - Using the new modular GradientButton */}
      <GradientButton 
        onPress={handleLogin} 
        title="Log In"
        style={styles.loginButtonWrapper}
      />

      {/* "Forgotten your password?" - Skipping for MVP */}
      {/* <TouchableOpacity style={styles.forgotPasswordButton}>
        <Text style={styles.forgotPasswordText}>Forgotten your password ?</Text>
      </TouchableOpacity> */}

      {/* "Don't have an account? Create an Account" */}
      <View style={styles.createAccountContainer}>
        <Text style={styles.createAccountText}>Don't have an account? </Text>
        <TouchableOpacity onPress={handleCreateAccount}>
          <Text style={styles.createAccountLink}>Create an Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white, 
    alignItems: 'center',
    paddingHorizontal: 30, 
    paddingTop: 80, 
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.orange,
    marginBottom: 5,
  },
  greetingSubtitle: {
    fontSize: 20,
    color: colors.grey,
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 60, 
    height: 60, 
    resizeMode: 'contain',
    marginRight: 10,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.orange, 
  },
  // Custom input styling to match your original design
  customInput: {
    borderWidth: 0,
    borderBottomWidth: 1,
    borderColor: colors.lightGrey,
    borderRadius: 0,
    paddingHorizontal: 0,
    fontSize: 18,
  },
  emailInputWrapper: {
    width: '100%',
    marginBottom: 20,
  },
  // Password input wrapper for the icon
  passwordInputWrapper: {
    width: '100%',
    position: 'relative',
    marginBottom: 20,
  },
  passwordInputStyle: {
    marginBottom: 0, // Remove margin from Input component for password
  },
  passwordToggle: {
    position: 'absolute',
    right: 0,
    top: 35, // Adjust based on label height
    padding: 10,
  },
  loginButtonWrapper: {
    marginTop: 30,
    width: '100%',
  },
  createAccountContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 150,
  },
  createAccountText: {
    color: colors.grey,
    fontSize: 16,
  },
  createAccountLink: {
    color: colors.orange,
    fontSize: 16,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
