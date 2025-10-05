// src/screens/AddDogScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Pressable, // Use Pressable instead of TouchableOpacity
  Platform, // Import Platform for KeyboardAvoidingView
  KeyboardAvoidingView // Import KeyboardAvoidingView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import { RootStackParamList, Dog } from '../../App';
import { Dropdown } from 'react-native-element-dropdown';
import { handleAlert } from '../utils/AlertUtils';

type AddDogRouteProp = RouteProp<RootStackParamList, 'AddDog'>;

// Utility function to convert age to approximate DOB
const convertAgeToApproxDob = (age: number): string => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
  
  const birthYear = currentYear - age;
  // Use current month as approximation
  const birthMonth = currentMonth.toString().padStart(2, '0');
  
  return `${birthYear}/${birthMonth}`;
};

const AddDogScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<AddDogRouteProp>();
  const { onAddDog, shelterId, shelterPostcode, editMode, existingDog } = route.params;

  const breedOptions = [
    { label: 'Australian Shepherd', value: 'Australian Shepherd' },
    { label: 'Beagle', value: 'Beagle' },
    { label: 'Bernese Mountain Dog', value: 'Bernese Mountain Dog' },
    { label: 'Border Collie', value: 'Border Collie' },
    { label: 'Boxer', value: 'Boxer' },
    { label: 'Bulldog (English and French)', value: 'Bulldog (English and French)' },
    { label: 'Chihuahua', value: 'Chihuahua' },
    { label: 'Cocker Spaniel', value: 'Cocker Spaniel' },
    { label: 'Dachshund (Miniature)', value: 'Dachshund (Miniature)' },
    { label: 'Doberman Pinscher', value: 'Doberman Pinscher' },
    { label: 'French Bulldog', value: 'French Bulldog' },
    { label: 'German Shepherd', value: 'German Shepherd' },
    { label: 'Golden Retriever', value: 'Golden Retriever' },
    { label: 'Great Dane', value: 'Great Dane' },
    { label: 'Labrador Retriever', value: 'Labrador Retriever' },
    { label: 'Mastiff (English, Neapolitan, etc.)', value: 'Mastiff (English, Neapolitan, etc.)' },
    { label: 'Newfoundland', value: 'Newfoundland' },
    { label: 'Pomeranian', value: 'Pomeranian' },
    { label: 'Rottweiler', value: 'Rottweiler' },
    { label: 'Saint Bernard', value: 'Saint Bernard' },
    { label: 'Shih Tzu', value: 'Shih Tzu' },
    { label: 'Siberian Husky', value: 'Siberian Husky' },
    { label: 'Toy Poodle', value: 'Toy Poodle' },
    { label: 'Yorkshire Terrier', value: 'Yorkshire Terrier' },
    { label: 'Other', value: 'Other' },
  ];

  // State for dog details
  const [name, setName] = useState(editMode && existingDog ? existingDog.name : '');
  const [breed, setBreed] = useState(() => {
    if (editMode && existingDog) {
      const isPredefineBreed = breedOptions.some(option => option.value === existingDog.breed);
      return isPredefineBreed ? existingDog.breed : 'Other';
    }
    return '';
  });
  const [dob, setDob] = useState(editMode && existingDog ? existingDog.dob : '');
  const [gender, setGender] = useState(editMode && existingDog ? existingDog.gender : '');
  const [color, setColor] = useState(editMode && existingDog ? existingDog.color || '' : '');
  const [size, setSize] = useState(editMode && existingDog ? existingDog.size || '' : '');
  const [calculatedAge, setCalculatedAge] = useState<number | null>(editMode && existingDog ? existingDog.age : null);
  // State for custom breed input
  const [showCustomBreed, setShowCustomBreed] = useState(() => {
    if (editMode && existingDog) {
      // Check if the existing breed is in our predefined list
      const isPredefineBreed = breedOptions.some(option => option.value === existingDog.breed);
      return !isPredefineBreed && existingDog.breed !== '';
    }
    return false;
  });
  const [customBreed, setCustomBreed] = useState(() => {
    if (editMode && existingDog) {
      const isPredefineBreed = breedOptions.some(option => option.value === existingDog.breed);
      return !isPredefineBreed ? existingDog.breed : '';
    }
    return '';
  });
  // const [description, setDescription] = useState('');
  // const [photoUrl, setPhotoUrl] = useState('');
  // const [status, setStatus] = useState('Available');
  const [loading, setLoading] = useState(false);

  const colorOptions = [
    { label: 'Black', value: 'Black' },
    { label: 'White', value: 'White' },
    { label: 'Brown', value: 'Brown' },
    { label: 'Golden', value: 'Golden' },
    { label: 'Gray', value: 'Gray' },
    { label: 'Tan', value: 'Tan' },
    { label: 'Cream', value: 'Cream' },
    { label: 'Red', value: 'Red' },
    { label: 'Brindle', value: 'Brindle' },
    { label: 'Merle', value: 'Merle' },
    { label: 'Mixed', value: 'Mixed' },
  ];

  const sizeOptions = [
    { label: 'Extra Small (Under 10 lbs)', value: 'Extra Small' },
    { label: 'Small (10-25 lbs)', value: 'Small' },
    { label: 'Medium (25-60 lbs)', value: 'Medium' },
    { label: 'Large (60-100 lbs)', value: 'Large' },
    { label: 'Extra Large (Over 100 lbs)', value: 'Extra Large' },
  ];

  const handleAddDog = () => {
  // Remove destructuring of name, breed, dob, gender from route.params

    // Basic validation
    if (!name || !breed || !dob || !gender) {
      handleAlert('Missing Info', 'Please fill in all required dog details.');
      return;
    }
    if (!/^\d{4}\/\d{2}$/.test(dob)) {
      handleAlert('Invalid Date of Birth', 'Please enter DOB in YYYY/MM format.');
      return;
    }
    setLoading(true);


  //   try {
  //     const newDog: Dog = {
  //       id: `mock-dog-${Date.now()}`,
  //       name,
  //       breed,
  //       age: dogAge,
  //       gender,
  //       description,
  //       photoURLs: [photoUrl],
  //       shelterId: shelterId || 'default-shelter-id',
  //       status,
  //       createdAt: new Date().toISOString(),
  //     };

  //     // Call the callback function passed from ShelterDashboardScreen
  //     onAddDog(newDog);

  //     setLoading(false);
  //     navigation.goBack(); // Go back to the dashboard
  //   } catch (error) {
  //     console.error('Error adding mock dog:', error);
  //     handleAlert('Error', 'An unexpected error occurred while adding the dog.');
  //     setLoading(false);
  //   }
   };

  const handleGoBack = () => {
    navigation.goBack(); // Simply go back without adding anything
  };
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

  const handleDobChange = (text: string) => {
    formatDob(text);
    
    // Calculate age in real-time if DOB is complete
    if (/^\d{4}\/\d{2}$/.test(text)) {
      const dobValidation = validateDob(text);
      if (dobValidation.isValid && dobValidation.age !== undefined) {
        setCalculatedAge(dobValidation.age);
      } else {
        setCalculatedAge(null);
      }
    } else {
      setCalculatedAge(null);
    }
  };

  // Initialize DOB with existing dog's age when in edit mode
  useEffect(() => {
    if (editMode && existingDog && dob) {
      // Process the already-initialized DOB through handleDobChange to calculate age
      const dobValidation = validateDob(dob);
      if (dobValidation.isValid && dobValidation.age !== undefined) {
        setCalculatedAge(dobValidation.age);
      }
    }
  }, [editMode, existingDog, dob]);

  const validateDob = (dobString: string) => {
    if (!/^\d{4}\/\d{2}$/.test(dobString)) {
      return { isValid: false, message: 'Please enter DOB in YYYY/MM format.' };
    }

    const [yearStr, monthStr] = dobString.split('/');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    // Check if month is valid (1-12)
    if (month < 1 || month > 12) {
      return { isValid: false, message: 'Please enter a valid month (01-12).' };
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11

    // Calculate age in years
    let age = currentYear - year;
    if (currentMonth < month) {
      age--; // Haven't had birthday this year yet
    }

    // Check if DOB is in the future
    if (age < 0) {
      return { isValid: false, message: 'Date of birth cannot be in the future.' };
    }

    // Check if age is over 30
    if (age > 30) {
      return { isValid: false, message: 'Dog age cannot be over 30 years.' };
    }

    return { isValid: true, message: '', age };
  };

  const handleNext = () => {
    // Determine the breed value to use
    const breedValue = showCustomBreed ? customBreed.trim() : breed;
    // Validate required fields before navigating
    if (!name || !breedValue || !dob || !gender || !color || !size) {
      handleAlert('Missing Info', 'Please fill in all required dog details.');
      return;
    }
    
    const dobValidation = validateDob(dob);
    if (!dobValidation.isValid) {
      handleAlert('Invalid Date of Birth', dobValidation.message);
      return;
    }

    navigation.navigate('AddDogPic', {
      onAddDog,
      shelterId,
      shelterPostcode,
      name,
      breed: breedValue,
      dob, // Original DOB string (YYYY/MM format)
      age: calculatedAge, // Calculated age number
      gender,
      color,
      size,
      // Pass edit mode parameters
      editMode,
      existingDog,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.container}>
          {/* Back Arrow */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>{'<'}</Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            {editMode ? 'Edit dog details' : 'Enter dog details'}
          </Text>

          {/* Dog Name Input */}
          <Text style={styles.inputLabel}>Dog Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Dog Name"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
          />

          {/* Dog DOB Input */}
          <Text style={styles.inputLabel}>Date of Birth (YYYY/MM)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2021/05"
            placeholderTextColor="#999"
            value={dob}
            onChangeText={handleDobChange}
            keyboardType="numeric"
            maxLength={7}
          />

          {/* Dog Breed Dropdown */}
          <Text style={styles.inputLabel}>Breed</Text>
          <Dropdown
            style={styles.input}
            data={breedOptions}
            labelField="label"
            valueField="value"
            placeholder="Select Breed"
            placeholderStyle={{ color: '#999' }}
            value={breed}
            onChange={item => {
              setBreed(item.value);
              if (item.value === 'Other') {
                setShowCustomBreed(true);
              } else {
                setShowCustomBreed(false);
                setCustomBreed('');
              }
            }}
            selectedTextStyle={{ color: '#333', fontSize: 18 }}
            itemTextStyle={{ color: '#333', fontSize: 18 }}
            containerStyle={{ borderRadius: 8 }}
            activeColor="#F7B781"
            renderLeftIcon={() => null}
          />
          {showCustomBreed && (
            <TextInput
              style={styles.input}
              placeholder="Enter Dog Breed"
              placeholderTextColor="#999"
              value={customBreed}
              onChangeText={setCustomBreed}
            />
          )}

          {/* Dog Gender Dropdown */}
          <Text style={styles.inputLabel}>Gender</Text>
          <Dropdown
            style={styles.input}
            data={[
              { label: 'Male', value: 'Male' },
              { label: 'Female', value: 'Female' },
            ]}
            labelField="label"
            valueField="value"
            placeholder="Select Gender"
            placeholderStyle={{ color: '#999' }}
            value={gender}
            onChange={item => setGender(item.value)}
            selectedTextStyle={{ color: '#333', fontSize: 18 }}
            itemTextStyle={{ color: '#333', fontSize: 18 }}
            containerStyle={{ borderRadius: 8 }}
            activeColor="#F7B781"
            renderLeftIcon={() => null}
          />

          {/* Dog Color Dropdown */}
          <Text style={styles.inputLabel}>Color</Text>
          <Dropdown
            style={styles.input}
            data={colorOptions}
            labelField="label"
            valueField="value"
            placeholder="Select Color"
            placeholderStyle={{ color: '#999' }}
            value={color}
            onChange={item => setColor(item.value)}
            selectedTextStyle={{ color: '#333', fontSize: 18 }}
            itemTextStyle={{ color: '#333', fontSize: 18 }}
            containerStyle={{ borderRadius: 8 }}
            activeColor="#F7B781"
            renderLeftIcon={() => null}
          />

          {/* Dog Size Dropdown */}
          <Text style={styles.inputLabel}>Size</Text>
          <Dropdown
            style={styles.input}
            data={sizeOptions}
            labelField="label"
            valueField="value"
            placeholder="Select Size"
            placeholderStyle={{ color: '#999' }}
            value={size}
            onChange={item => setSize(item.value)}
            selectedTextStyle={{ color: '#333', fontSize: 18 }}
            itemTextStyle={{ color: '#333', fontSize: 18 }}
            containerStyle={{ borderRadius: 8 }}
            activeColor="#F7B781"
            renderLeftIcon={() => null}
          />

          {/* Next Button */}
          <TouchableOpacity onPress={handleNext} style={styles.nextButtonWrapper}>
            <LinearGradient
              colors={['#F48B7B', '#F9E286']}
              style={styles.nextButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.nextButtonText}>
                {editMode ? 'Next' : 'Next'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
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
    backgroundColor: '#fff',
    paddingBottom: 150,
    },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 30,
    padding: 5,
  },
  backButtonText: {
    fontSize: 24,
    color: '#F7B781',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F7B781',
    marginBottom: 40,
    alignSelf: 'center',
  },
  inputLabel: {
    alignSelf: 'flex-start',
    fontSize: 16,
    color: '#F7B781',
    marginBottom: 5,
    marginTop: 15,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ddd',
    borderBottomWidth: 1,
    paddingHorizontal: 0,
    fontSize: 18,
    color: '#333',
    marginBottom: 10,
  },
  nextButtonWrapper: {
    width: '100%',
    marginTop: 50,
    borderRadius: 50,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  inputError: {
    borderColor: '#FF6F61', 
  },
  errorText: {
    color: '#FF6F61',
    fontSize: 14,
    marginBottom: 5,
    alignSelf: 'flex-start',
  },
});

export default AddDogScreen;