import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { signUp } from '../../services/CognitoService';
import { handleAlert } from '../utils/AlertUtils';

// Import the new modular components
import { Input, GradientButton, AppHeader, BackButton } from '../../components';
import { colors } from '../../components/styles/GlobalStyles';

// Define the type for the route parameters for this screen
type SignupShelterDetailsScreenRouteProp = RouteProp<RootStackParamList, 'SignupShelterDetails'>;

const axios = require('axios');

async function getCoordinatesFromPostcode(postcode: any) {
    try {
        const response = await axios.get(`https://api.postcodes.io/postcodes/${postcode}`);
        const { latitude, longitude } = response.data.result;
        return { latitude, longitude };
    } catch (err) {
        if (err instanceof Error) {
            console.error('Postcode lookup failed:', err.message);
        } else {
            console.error('Postcode lookup failed:', err);
        }
        throw new Error('Invalid postcode or failed to fetch coordinates.');
    }
}

const SignupShelterDetailsScreen: React.FC = () => {
  const navigation = useNavigation<import('@react-navigation/native').NavigationProp<RootStackParamList>>();
  const route = useRoute<SignupShelterDetailsScreenRouteProp>();
  const { email, password } = route.params; // Get email and password from previous screen

  // State for form fields
  const [shelterName, setShelterName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [postcode, setPostcode] = useState<string>('');
  const [phoneNo, setPhoneNo] = useState<string>('');

  const [nameError, setNameError] = useState<string>('');
  const [addressError, setAddressError] = useState<string>('');
  const [postcodeError, setPostcodeError] = useState<string>('');
  const [phoneNoError, setPhoneNoError] = useState<string>('');
  
  const formatPhoneNo = (text: string) => {
    // If the input starts with anything other than '+', prepend it.
    // This handles accidental deletion of '+' or initial paste without it.
    if (!text.startsWith('+')) {
      setPhoneNo('+' + text.replace(/\D/g, '')); // Ensure only digits follow the '+'
    } else {
      // Remove any non-digits after the '+'
      const cleaned = '+' + text.substring(1).replace(/\D/g, '');
      setPhoneNo(cleaned);
    }
  };

  const validateName = (nameString: string): boolean => {
    setNameError('');
    if (nameString.trim().length < 2) {
      setNameError('Name must be at least 2 characters.');
      return false;
    }
    // Add regex for only numeric and alphabetic characters if desired
    if (!/^[a-zA-Z0-9\s]+$/.test(nameString)) {
      setNameError('Name can only contain letters and spaces.');
      return false;
    }
    return true;
  };
  const validateAddress = (addressString: string): boolean => {
    setAddressError('');
    if (addressString.trim().length < 5) {
      setAddressError('Address must be at least 5 characters.');
      return false;
    }
    return true;
  };

  const validatePostcode = (postcodeString: string): boolean => {
    setPostcodeError('');
    // Basic UK postcode regex, adjust as needed for other regions
    const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
    if (!ukPostcodeRegex.test(postcodeString.trim())) {
      setPostcodeError('Please enter a valid postcode format (e.g., SW1A 0AA).');
      return false;
    }
    return true;
  };

  const validatePhoneNo = (phoneNoString: string): boolean => {
    setPhoneNoError('');
    // Basic phone number regex, allows digits, spaces, hyphens, and plus sign for international
    const phoneRegex = /^\+?[0-9\s-]{7,20}$/; // Example: 7 to 20 digits/symbols
    if (!phoneRegex.test(phoneNoString.trim())) {
      setPhoneNoError('Please enter a valid phone number (7-20 digits, may include +,-,spaces).');
      return false;
    }
    return true;
  };

  const handleNameChange = (text: string) => {
    setShelterName(text);
    validateName(text); 
  };

  const handleAddressChange = (text: string) => {
    setAddress(text);
    validateAddress(text); 
  };

  const handlePostcodeChange = (text: string) => {
    setPostcode(text);
    validatePostcode(text); 
  };

  const handlePhoneNoChange = (text: string) => {
    formatPhoneNo(text);
    validatePhoneNo(text); 
  };

  const handleNext = async () => {
    const isNameValid = validateName(shelterName);
    const isAddressValid = validateAddress(address);
    const isPostcodeValid = validatePostcode(postcode);
    const isPhoneNoValid = validatePhoneNo(phoneNo);
    
    if (!shelterName.trim() || !address.trim() || !postcode.trim() || !phoneNo.trim()) {
      handleAlert('Error', 'All fields are required.');
      return;
    }
    
    if (!isNameValid || !isAddressValid || !isPostcodeValid || !isPhoneNoValid) {
      handleAlert('Validation Error', 'Please correct the highlighted fields before proceeding.');
      return;
    }
    
    try {
      // Get coordinates from postcode
      const { latitude, longitude } = await getCoordinatesFromPostcode(postcode);
      
      // Sign up the user with Cognito (Lambda backend)
      await signUp({
        email,
        password,
        name: shelterName,
        dob: "1999/11/11",           // Not used for shelter, pass empty string
        gender: "",        // Not used for shelter, pass empty string
        address,
        postcode,
        phoneNo,
        role: "shelter",
        shelterName,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
      });
      handleAlert("Shelter Account Created!", "Please verify your email and login.");
      navigation.navigate("Login");
    } catch (err: any) {
      if (err.message && err.message.includes('coordinates')) {
        handleAlert('Location Error', 'Failed to get coordinates from postcode. Please check the postcode and try again.');
      } else {
        handleAlert("Sign Up Error", err.message || "Something went wrong.");
      }
    }
  };

  return (
    <KeyboardAvoidingView
          style={styles.keyboardAvoidingContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
      <ScrollView contentContainerStyle={styles.scrollViewContent}>

      <AppHeader
        leftComponent={
          <BackButton
            onPress={() => navigation.goBack()}
          />
        }
      />
      <View style={styles.container}>
  
        <Text style={styles.title}>Create Account</Text>

        {/* Shelter Name Input */}
        <Input
          label="Shelter Name"
          placeholder="Enter Shelter Name"
          placeholderTextColor={colors.grey}
          value={shelterName}
          onChangeText={handleNameChange}
          style={styles.customInput}
          error={nameError}
        />

        {/* Address Input */}
        <Input
          label="Address"
          placeholder="Enter Your Location"
          placeholderTextColor={colors.grey}
          value={address}
          onChangeText={handleAddressChange}
          style={styles.customInput}
          error={addressError}
        />

        {/* Postcode Input */}
        <Input
          label="Postcode"
          placeholder="Enter Your Postcode"
          placeholderTextColor={colors.grey}
          value={postcode}
          onChangeText={handlePostcodeChange}
          style={styles.customInput}
          error={postcodeError}
        />

        {/* Phone No. Input */}
        <Input
          label="Phone No."
          placeholder="+44-"
          placeholderTextColor={colors.grey}
          keyboardType="phone-pad"
          value={phoneNo}
          onChangeText={handlePhoneNoChange}
          style={styles.customInput}
          error={phoneNoError}
        />

        {/* Next Button */}
        <GradientButton 
          onPress={handleNext} 
          title="Next"
          style={styles.nextButtonWrapper}
        />
      </View>
    </ScrollView>
            
    </KeyboardAvoidingView>
    
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingTop: Platform.OS === 'ios' ? 60 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 30,
    paddingTop: 15,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.orange,
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
  nextButtonWrapper: {
    width: '100%',
    marginTop: 50,
  },
});

export default SignupShelterDetailsScreen;
