import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { updateUserAttributes, getAccessToken } from '../../services/CognitoService';
import { RootStackParamList } from '../../App';
import { NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { AppHeader } from '../../components/layout';
import { LoadingSpinner, Button, Input, Card } from '../../components/ui';
import { colors } from '../../components/styles/GlobalStyles';
import UploadModal from '../shelters/UploadModal';
import { BackButton } from '../../components/ui/Button';

// ==========================
// Constants
// ==========================
const API_PRESIGN_ICON_URL = 'https://1g53nof6f8.execute-api.eu-west-2.amazonaws.com/presignIconUrl';
const PUBLIC_DEFAULT_IMAGE = 'https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg';
const S3_BASE_URL = 'https://icon-images-uploads-2.s3.eu-west-2.amazonaws.com/';
const DEFAULT_AVATAR_FILENAME = 'default-avatar-icon.jpg';

// ==========================
// Utility functions for S3
// ==========================
const getPresignedUrlForIcon = async (token: string) => {
  try {
    const response = await fetch(API_PRESIGN_ICON_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ count: 1 }),
    });

    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }

    const data = await response.json();
    return { signedUrl: data.uploadUrls[0], key: data.keys[0] };
  } catch (error) {
    console.error('Error fetching presigned URL:', error);
    throw error;
  }
};

const uploadImageToS3 = async (uri: string, signedUrl: string) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const result = await fetch(signedUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': 'image/jpeg' },
    });

    if (!result.ok) {
      throw new Error('Image upload to S3 failed.');
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// ==========================
// Types
// ==========================
type EditAdopterProfileScreenNavigationProp = NavigationProp<RootStackParamList, 'EditAdopterProfile'>;
type EditAdopterProfileScreenRouteProp = RouteProp<RootStackParamList, 'EditAdopterProfile'>;

// ==========================
// Component
// ==========================
const EditAdopterProfileScreen: React.FC = () => {
  const navigation = useNavigation<EditAdopterProfileScreenNavigationProp>();
  const route = useRoute<EditAdopterProfileScreenRouteProp>();
  const { profile } = route.params;

  const [adopterName, setAdopterName] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [postcode, setPostcode] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [iconUrl, setIconUrl] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Validation errors
  const [nameError, setNameError] = useState('');
  const [contactError, setContactError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [postcodeError, setPostcodeError] = useState('');

  // Holds local image URI before saving
  const [imageFileUri, setImageFileUri] = useState<string | null>(null);

  useEffect(() => {
    setAdopterName(profile.adopterName);
    setContact(profile.contact);
    setAddress(profile.address.formatted);
    setPostcode(profile.postcode);
    setIconUrl(profile.iconUrl);
    setIsLoading(false);
  }, [profile]);

  // Validation functions
  const validateName = (nameString: string): boolean => {
    setNameError('');
    if (nameString.trim().length < 2) {
      setNameError('Name must be at least 2 characters.');
      return false;
    }
    if (!/^[a-zA-Z\s]+$/.test(nameString)) {
      setNameError('Name can only contain letters and spaces.');
      return false;
    }
    return true;
  };

  const validatePhoneNo = (phoneString: string): boolean => {
    setContactError('');
    if (phoneString.trim().length === 0) {
      setContactError('Phone number is required.');
      return false;
    }
    if (!phoneString.startsWith('+')) {
      setContactError('Phone number must start with a country code (e.g., +44).');
      return false;
    }
    if (phoneString.length < 10 || phoneString.length > 15) {
      setContactError('Phone number must be between 10 and 15 characters.');
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
    if (postcodeString.trim().length === 0) {
      setPostcodeError('Postcode is required.');
      return false;
    }
    // UK postcode validation
    const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
    if (!postcodeRegex.test(postcodeString.trim())) {
      setPostcodeError('Please enter a valid UK postcode.');
      return false;
    }
    return true;
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
        console.error('Failed to fetch coordinates:', error);
      }
    }
  };

  const formatPhoneNo = (text: string) => {
    if (!text.startsWith('+')) {
      setContact('+' + text.replace(/\D/g, ''));
    } else {
      const cleaned = '+' + text.substring(1).replace(/\D/g, '');
      setContact(cleaned);
    }
  };

  const handleSave = async () => {
    // Validate all fields
    const isNameValid = validateName(adopterName);
    const isContactValid = validatePhoneNo(contact);
    const isAddressValid = validateAddress(address);
    const isPostcodeValid = validatePostcode(postcode);

    if (!isNameValid || !isContactValid || !isAddressValid || !isPostcodeValid) {
      Alert.alert('Validation Error', 'Please fix the errors before saving.');
      return;
    }

    setIsUploading(true);
    let newIconUrl = iconUrl;

    try {
      if (imageFileUri) {
        const token = await getAccessToken();
        if (!token) {
          Alert.alert('Authentication Error', 'Could not get access token. Please sign in again.');
          setIsUploading(false);
          return;
        }

        const { signedUrl, key } = await getPresignedUrlForIcon(token);
        await uploadImageToS3(imageFileUri, signedUrl);
        newIconUrl = key;
      }

      const attributesToUpdate = {
        email: profile.email,
        name: adopterName,
        phone_number: contact,
        address: JSON.stringify({ formatted: address }),
        'custom:postcode': postcode,
        'custom:iconURL': newIconUrl,
        'custom:latitude': latitude,
        'custom:longitude': longitude,
      };

      await updateUserAttributes(attributesToUpdate);
      setImageFileUri(null);
      Alert.alert('Success', 'Profile updated successfully!');
      console.log('Profile updated:', attributesToUpdate);
      navigation.goBack();
    } catch (error) {
      console.error('Error updating attributes:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImagePicker = (source: 'camera' | 'gallery') => {
    setTimeout(async () => {
      let result;
      try {
        if (source === 'camera') {
          const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
          if (!permissionResult.granted) {
            Alert.alert('Permission Denied', 'Camera access is required to take a photo.');
            return;
          }
          result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
          });
        } else {
          const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permissionResult.granted) {
            Alert.alert('Permission Denied', 'Photo library access is required to choose an image.');
            return;
          }
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
          });
        }

        if (result?.canceled) return;

        const imageUri = result.assets[0].uri;
        setImageFileUri(imageUri);
        setIconUrl(imageUri);
        Alert.alert('Image Selected', 'Press "Save Changes" to finalize your profile update.');
      } catch (error) {
        console.error('Image selection failed:', error);
        Alert.alert('Error', 'An error occurred while selecting the image.');
      } finally {
        setModalVisible(false);
      }
    }, 150);
  };

  const handleCamera = () => handleImagePicker('camera');
  const handleGallery = () => handleImagePicker('gallery');

  const displayImageUrl =
    iconUrl === DEFAULT_AVATAR_FILENAME
      ? PUBLIC_DEFAULT_IMAGE
      : imageFileUri || `${S3_BASE_URL}${iconUrl}`;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LoadingSpinner size="large" color={colors.red} />
        <Text style={styles.loadingText}>Loading profile data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader 
        leftComponent={
          <BackButton onPress={() => navigation.goBack()} />
        }
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.sectionTitle}>Edit Adopter Information</Text>

          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.imageContainer}>
            {isUploading ? (
              <View style={[styles.profilePic, styles.uploadingOverlay]}>
                <LoadingSpinner size="large" color={colors.white} />
              </View>
            ) : (
              <Image source={{ uri: displayImageUrl }} style={styles.profilePic} />
            )}
            <View style={styles.changeIconOverlay}>
              <Ionicons name="camera" size={30} color={colors.white} />
            </View>
          </TouchableOpacity>

          <Card style={styles.formCard}>
            <Input
              label="Adopter Name"
              value={adopterName}
              onChangeText={(text) => {
                setAdopterName(text);
                validateName(text);
              }}
              error={nameError}
            />

            <Input
              label="Contact Number"
              value={contact}
              onChangeText={(text) => {
                formatPhoneNo(text);
                validatePhoneNo(contact);
              }}
              keyboardType="phone-pad"
              error={contactError}
            />

            <Input
              label="Address"
              value={address}
              onChangeText={(text) => {
                setAddress(text);
                validateAddress(text);
              }}
              multiline
              error={addressError}
            />

            <Input
              label="Postcode"
              value={postcode}
              onChangeText={handlePostcodeChange}
              error={postcodeError}
            />
          </Card>

          <Button
            title={isUploading ? 'Saving...' : 'Save Changes'}
            onPress={handleSave}
            disabled={isUploading}
            variant="primary"
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <UploadModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCamera={handleCamera}
        onGallery={handleGallery}
        onRemove={() => {
          throw new Error('Function not implemented.');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingContainer: { flex: 1 },
  safeArea: { 
    flex: 1, 
    backgroundColor: colors.white 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: colors.white 
  },
  loadingText: { 
    marginTop: 16, 
    fontSize: 16, 
    color: colors.grey 
  },
  container: { 
    flexGrow: 1, 
    padding: 20, 
    paddingBottom: 80, 
    alignItems: 'center' 
  },
  sectionTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: colors.darkGrey, 
    marginBottom: 20 
  },
  backButton: {
    padding: 8,
  },
  imageContainer: { 
    marginBottom: 20, 
    position: 'relative' 
  },
  profilePic: { 
    width: 150, 
    height: 150, 
    borderRadius: 75, 
    borderWidth: 3, 
    borderColor: colors.red, 
    backgroundColor: colors.lightGrey 
  },
  uploadingOverlay: { 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.5)' 
  },
  changeIconOverlay: { 
    position: 'absolute', 
    bottom: 0, 
    right: 0, 
    backgroundColor: colors.red, 
    borderRadius: 25, 
    width: 50, 
    height: 50, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderColor: colors.white, 
    borderWidth: 2 
  },
  formCard: {
    width: '100%',
    marginBottom: 20,
    padding: 20,
  },
  saveButton: {
    width: '100%',
    marginTop: 20,
  },
});

export default EditAdopterProfileScreen;