import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { handleAlert } from '../utils/AlertUtils';
import { Ionicons } from '@expo/vector-icons';

// Import the new modular components
import { Input, GradientButton, AppHeader, BackButton } from '../../components';
import { colors } from '../../components/styles/GlobalStyles';

// Define the type for the route and navigation parameters for this screen
type UniversalCreateAccountScreenNavigationProp = NavigationProp<RootStackParamList, 'UniversalCreateAccount'>;
type UniversalCreateAccountScreenRouteProp = RouteProp<RootStackParamList, 'UniversalCreateAccount'>;

const UniversalCreateAccountScreen: React.FC = () => {
  const navigation = useNavigation<UniversalCreateAccountScreenNavigationProp>();
  const route = useRoute<UniversalCreateAccountScreenRouteProp>();
  const { role } = route.params; // Get the 'role' parameter passed from OnboardingScreen

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rePassword, setRePassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false); // For password visibility toggle

  const handleNext = () => {
    // Basic client-side validation
    if (!email || !password || !rePassword) {
      handleAlert('Error', 'All fields are required.');
      return;
    }
    if (password !== rePassword) {
      handleAlert('Error', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) { // Minimum password length
      handleAlert('Error', 'Password must be at least 6 characters long.');
      return;
    }
    console.log(`Universal Account creation for ${role}:`, { email, password });

    // Navigate to the next specific screen based on the role
    if (role === 'adopter') {
      navigation.navigate('SignupAdopterDetails', { email, password }); // Pass credentials to next screen
    } else if (role === 'shelter') {
      navigation.navigate('SignupShelterDetails', { email, password }); // Pass credentials to next screen
    } else {
      handleAlert('Error', 'Invalid role specified for signup.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Back Arrow */}
      <AppHeader
        leftComponent={
          <BackButton
            onPress={() => navigation.goBack()}
          />
        }
      />

      <Text style={styles.title}>Create Account</Text>

      <View style={styles.miniContainer}> 
        {/* Email Input */}
        <Input
          label="Email Address"
          placeholder="Enter your email"
          placeholderTextColor={colors.grey}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          style={styles.customInput}
        />

        {/* Password Input with toggle */}
        <View style={styles.passwordWrapper}>
          <Input
            label="Password"
            placeholder="Enter your password"
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
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} 
              size={24} 
              color={colors.grey} />
          </TouchableOpacity>
        </View>

        {/* Re-enter Password Input */}
        <Input
          label="Re-enter password"
          placeholder="Re-enter your password"
          placeholderTextColor={colors.grey}
          secureTextEntry={true}
          value={rePassword}
          onChangeText={setRePassword}
          style={styles.customInput}
        />

        {/* Next Button */}
        <GradientButton 
          onPress={handleNext} 
          title="Next"
          style={styles.nextButtonWrapper}
        />
      </View> 
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 0,
    paddingTop: Platform.OS === 'ios' ? 60 : 0,
  },
  miniContainer: {
    paddingHorizontal: 30,
    backgroundColor: colors.white,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.orange,
    marginTop: 15,
    marginBottom: 40,
    alignSelf: 'center',
  },
  // Custom input styling to match your original design
  customInput: {
    borderWidth: 0,
    borderBottomWidth: 1,
    borderColor: colors.lightGrey,
    borderRadius: 0,
    paddingHorizontal: 0,
    fontSize: 18,
    marginBottom: 10,
  },
  // Password input wrapper for the icon
  passwordWrapper: {
    width: '100%',
    position: 'relative',
  },
  passwordInputStyle: {
    marginBottom: 20, // Remove margin from Input component for password
  },
  passwordToggle: {
    position: 'absolute',
    right: 0,
    top: 35, // Adjust based on label height
    padding: 10,
  },
  nextButtonWrapper: {
    marginTop: 50,
    width: '100%',
  },
});

export default UniversalCreateAccountScreen;