import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { Dropdown } from 'react-native-element-dropdown';
import { handleAlert } from '../utils/AlertUtils';

// Import the new modular components
import { Input, GradientButton, AppHeader, BackButton } from '../../components';
import { colors } from '../../components/styles/GlobalStyles';

type SignupAdopterDetailsScreenRouteProp = RouteProp<RootStackParamList, 'SignupAdopterDetails'>;
type SignupAdopterDetailsScreenNavigationProp = NavigationProp<RootStackParamList, 'SignupAdopterDetails'>;

const SignupAdopterDetailsScreen: React.FC = () => {
  const navigation = useNavigation<SignupAdopterDetailsScreenNavigationProp>();
  const route = useRoute<SignupAdopterDetailsScreenRouteProp>();

  const { email, password } = route.params;

  const [name, setName] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [gender, setGender] = useState<string>(''); 
  const [address, setAddress] = useState<string>('');
  const [postcode, setPostcode] = useState<string>('');
  const [phoneNo, setPhoneNo] = useState<string>('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [dobError, setDobError] = useState<string>('');
  const [addressError, setAddressError] = useState<string>('');
  const [postcodeError, setPostcodeError] = useState<string>('');
  const [phoneNoError, setPhoneNoError] = useState<string>('');

  const formatDob = (text: string) => {
    // Remove all non-digit characters
    let cleanedText = text.replace(/\D/g, '');

    // Apply YYYY/MM/DD format
    let formattedText = '';
    if (cleanedText.length > 0) {
      formattedText = cleanedText.substring(0, 4); // Year
      if (cleanedText.length >= 5) {
        formattedText += '/' + cleanedText.substring(4, 6); // Month
      }
      if (cleanedText.length >= 7) {
        formattedText += '/' + cleanedText.substring(6, 8); // Day
      }
    }
    setDob(formattedText);
  };

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
    //Add regex for only alphabetic characters if desired
    if (!/^[a-zA-Z\s]+$/.test(nameString)) {
      setNameError('Name can only contain letters and spaces.');
      return false;
    }
    return true;
  };

  const validateDob = (dobString: string): boolean => {
    setDobError(''); // Clear previous error at the start of validation
    const parts = dobString.split('/');

    // Allow empty string to pass validation when not yet complete
    if (dobString.length === 0) {
      return true;
    }

    // Check for correct YYYY/MM/DD format structure
    if (parts.length !== 3 || parts.some(part => part === '')) {
      setDobError('Format: YYYY/MM/DD');
      return false;
    }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    // Basic range checks for year, month, day
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear) { // Adjust 1900 if your minimum birth year is different
      setDobError('Year must be between 1900 and ' + currentYear + '.');
      return false;
    }
    if (month < 1 || month > 12) {
      setDobError('Month must be between 01 and 12.');
      return false;
    }
    if (day < 1 || day > 31) { // Initial day check, more precise check follows
      setDobError('Day must be between 01 and 31.');
      return false;
    }

    // Comprehensive date validation using Date object to handle month-day limits (e.g., Feb 30th)
    // Month is 0-indexed in Date object (e.g., January is 0, December is 11)
    const date = new Date(year, month - 1, day);
    // If the Date object "corrects" the date (e.g., turns Feb 30 into March 2), it means it was invalid
    if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
      setDobError('Please enter a valid calendar date (e.g., February 30th is invalid).');
      return false;
    }

    // Check if the date is not in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day for accurate comparison
    if (date > today) {
      setDobError('Date of Birth cannot be in the future.');
      return false;
    }

    return true; // Date is valid
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
    setName(text);
    validateName(text);
  };

  const handleDobChange = (text: string) => {
    formatDob(text);
    validateDob(text); 
  };


  const handleAddressChange = (text: string) => {
    setAddress(text);
    validateAddress(text); 
  };

  const handlePostcodeChange = async (text: string) => {
    setPostcode(text);
    const isValid = validatePostcode(text);
    
    // If postcode is valid, fetch coordinates
    if (isValid && text.trim().length > 0) {
      try {
        const response = await fetch(`https://api.postcodes.io/postcodes/${text.trim()}`);
        const data = await response.json();
        if (data.result && data.result.latitude && data.result.longitude) {
          console.log('Fetched coordinates for adopter:', data.result.latitude, data.result.longitude);
          setLatitude(data.result.latitude.toString());
          setLongitude(data.result.longitude.toString());
        }
      } catch (error) {
        // Silently fail if coordinates can't be fetched
        console.error('Failed to fetch coordinates:', error);
      }
    }
  };

  const handlePhoneNoChange = (text: string) => {
    formatPhoneNo(text);
    validatePhoneNo(text); 
  };

  const handleNext = () => {
    const isNameValid = validateName(name);
    const isDobValid = validateDob(dob);
    const isAddressValid = validateAddress(address);
    const isPostcodeValid = validatePostcode(postcode);
    const isPhoneNoValid = validatePhoneNo(phoneNo);

    // Check if any field is empty (required check)
    if (!name.trim() || !dob.trim() || !gender.trim() || !address.trim() || !postcode.trim() || !phoneNo.trim()) {
      handleAlert('Error', 'All fields are required.');
      return;
    }

    // Check if all individual validations passed
    if (!isNameValid || !isDobValid || !isAddressValid || !isPostcodeValid || !isPhoneNoValid) {
      handleAlert('Validation Error', 'Please correct the highlighted fields before proceeding.');
      return;
    }

    // Pass all collected info to experience screen for final sign-up
    console.log('Passing coordinates to experience screen:', { latitude, longitude });
    navigation.navigate('SignupAdopterExperience', {
      email,
      password,
      name,
      dob,
      gender,
      address,
      postcode,
      phoneNo,
      latitude,
      longitude,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
      >
        <AppHeader
        leftComponent={
          <BackButton
            onPress={() => navigation.goBack()}
          />
        }
        />
        <View style={styles.container}>

          <Text style={styles.title}>Create Account</Text>

          {/* Name Input */}
          <Input
            label="Name"
            placeholder="Enter Your Name"
            placeholderTextColor={colors.grey}
            value={name}
            onChangeText={handleNameChange}
            style={styles.customInput}
            error={nameError}
          />

          {/* Date of Birth Input */}
          <Input
            label="Date of Birth"
            placeholder="YYYY/MM/DD"
            placeholderTextColor={colors.grey}
            keyboardType="numeric"
            value={dob}
            onChangeText={handleDobChange}
            maxLength={10}
            style={styles.customInput}
            error={dobError}
          />

          {/* Gender Input (Dropdown) */}
          <Text style={styles.inputLabel}>Gender</Text>
          <Dropdown
            style={styles.dropdown}
            data={[
              { label: 'Male', value: 'Male' },
              { label: 'Female', value: 'Female' },
              { label: 'Non-binary', value: 'Non-binary' },
              { label: 'Prefer not to say', value: 'Prefer not to say' },
            ]}
            labelField="label"
            valueField="value"
            placeholder="Select Gender"
            placeholderStyle={{ color: colors.grey, fontSize: 18}}
            value={gender}
            onChange={(item: { value: React.SetStateAction<string>; }) => setGender(item.value)}
            selectedTextStyle={{ color: colors.darkGrey, fontSize: 18 }}
            itemTextStyle={{ color: colors.darkGrey, fontSize: 18 }}
            containerStyle={{ borderRadius: 8 }}
            activeColor={colors.orange}
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
    paddingTop: Platform.OS === 'ios' ? 60 : 0,
    paddingBottom: 100,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 30,
    paddingTop: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.orange,
    marginBottom: 40,
    alignSelf: 'center',
  },
  inputLabel: {
    alignSelf: 'flex-start',
    fontSize: 16,
    fontWeight: '500',
    color: colors.orange,
    marginBottom: 5,
    marginTop: 0,
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
  // Dropdown styling
  dropdown: {
    width: '100%',
    height: 50,
    borderColor: colors.lightGrey,
    borderBottomWidth: 1,
    paddingHorizontal: 0,
    fontSize: 18,
    color: colors.darkGrey,
    marginBottom: 20,
  },
  nextButtonWrapper: {
    width: '100%',
    marginTop: 50,
    marginBottom: 100,
  },
});

export default SignupAdopterDetailsScreen;
