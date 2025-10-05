import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import UploadModal from './UploadModal';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import { RootStackParamList, Dog } from '../../App';
import { getAccessToken } from '../../services/CognitoService';
import { getPresignedUrls,uploadImagesToS3 } from '../../src/api';

const MAX_PHOTOS = 6;
const windowWidth = Dimensions.get('window').width;
const gridPadding = 40; // total horizontal padding (container + margin)
const gridColumns = 3;
const cellMargin = 10;
const cellWidth = Math.floor((windowWidth - gridPadding - cellMargin * (gridColumns * 2)) / gridColumns);
const cellHeight = Math.floor(cellWidth * 1.5);

type AddDogPicRouteProp = RouteProp<RootStackParamList, 'AddDogPic'>;


const AddDogPicScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<AddDogPicRouteProp>();
  const {
    onAddDog,
    shelterId,
    shelterPostcode,
    name,
    breed,
    dob,
    age,
    gender,
    color,
    size,
    editMode,
    existingDog,   
  } = route.params || {};

  // Initialize photos with existing dog's photos if in edit mode
  const [photos, setPhotos] = useState<string[]>(() => {
    if (editMode && existingDog && existingDog.photoURLs) {
      // Pre-populate with existing photos, but limit to MAX_PHOTOS
      return existingDog.photoURLs.slice(0, MAX_PHOTOS);
    }
    return [];
  });
  const [modalVisible, setModalVisible] = useState(false);

	const handleContinue = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return alert('Please sign in first');

      let allPhotoKeys: string[] = [];

      // Only upload new photos if there are any
      if (photos.length > 0) {
        // Filter out existing photos (URLs vs local URIs) for upload
        const newPhotos = photos.filter(photo => !photo.startsWith('http'));
        const existingPhotos = photos.filter(photo => photo.startsWith('http'));

        // Upload new photos and get their S3 keys
        let newPhotoKeys: string[] = [];
        if (newPhotos.length > 0) {
          const uploadResponse = await getPresignedUrls(newPhotos.length, token);
          const uploadUrls = uploadResponse.uploadUrls;
          newPhotoKeys = uploadResponse.keys;
          await uploadImagesToS3(newPhotos, uploadUrls);
        }

        // For existing photos, extract the S3 keys from their URLs
        let existingPhotoKeys: string[] = [];
        if (editMode && existingDog && existingPhotos.length > 0) {
          existingPhotoKeys = existingPhotos.map(photoUrl => {
            // Extract S3 key from URL (assuming URL format: https://bucket.s3.region.amazonaws.com/key)
            try {
              const url = new URL(photoUrl);
              return url.pathname.substring(1); // Remove leading slash
            } catch (error) {
              console.error('Error parsing photo URL:', photoUrl, error);
              return ''; // Return empty string for invalid URLs
            }
          }).filter(key => key !== ''); // Filter out empty strings
        }

        // Combine existing and new photo keys in the order they appear in the photos array
        allPhotoKeys = photos.map(photo => {
          if (photo.startsWith('http')) {
            // Existing photo - extract S3 key from URL
            try {
              const url = new URL(photo);
              return url.pathname.substring(1);
            } catch (error) {
              console.error('Error parsing photo URL:', photo, error);
              return '';
            }
          } else {
            // New photo - find corresponding S3 key
            const newPhotoIndex = newPhotos.indexOf(photo);
            return newPhotoIndex !== -1 ? newPhotoKeys[newPhotoIndex] : '';
          }
        }).filter(key => key !== ''); // Filter out empty keys
      }
  
      navigation.navigate('AddDogDescription', {
        onAddDog,
        shelterId,
        shelterPostcode,
        name,
        breed,
        dob,
        age,
        gender,
        color,
        size,
        photos, // Current photos (mix of existing URLs and new local URIs)
        photoKeys: allPhotoKeys, // All S3 keys (both existing and new)
        // Pass edit mode parameters
        editMode,
        existingDog,
      });
    } catch (error) {
      
      console.error('Image upload failed:', error);
      alert('Failed to upload images. Please try again.');
    }
  };
  
// Save image to the correct slot (1-6)
  const saveImage = async (image: string) => {
  try {
    setPhotos(prev =>
      prev.length < MAX_PHOTOS
        ? [...prev, image]
        : prev
    );

  } catch (error) {
    console.error('Error saving image:', error);
  }
}
  // Placeholder for picking an image
  const handleAddPhoto = async () => {
    setModalVisible(true);
  };

  const handleCamera = async () => {
    
    try{
      await ImagePicker.requestCameraPermissionsAsync();
      let result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.back,
        allowsEditing: true,
        aspect: [2, 3],
        quality: 1,
      });
      if (!result.canceled) {
        await saveImage(result.assets[0].uri);
      };
    } catch (error) {
      if (error instanceof Error) {
        alert('Error uploading image: ' + error.message);
      } else {
        alert('Error uploading image');
      }
      setModalVisible(false);
    };
    setModalVisible(false);
  };

  const handleGallery = async() => {
   try{
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      let result = await ImagePicker.launchImageLibraryAsync({
        cameraType: ImagePicker.CameraType.back,
        allowsEditing: true,
        aspect: [2, 3],
        quality: 1,
      });
      if (!result.canceled) {
        await saveImage(result.assets[0].uri);
      };
    } catch (error) {
      if (error instanceof Error) {
        alert('Error uploading image: ' + error.message);
      } else {
        alert('Error uploading image');
      }
      setModalVisible(false);
    };
    setModalVisible(false);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Render photo grid (2 rows x 3 columns, responsive)
  const renderPhotoCell = (index: number) => {
    const photo = photos[index];
    if (photo) {
      const isExistingPhoto = photo.startsWith('http'); // Existing photos are URLs, new ones are local URIs
      return (
        <View style={[styles.photoCell, { width: cellWidth, height: cellHeight }]} key={index}>
          <Image source={{ uri: photo }} style={styles.photoImage} />
          {/* Show indicator for existing photos */}
          {editMode && isExistingPhoto && (
            <View style={styles.existingPhotoIndicator}>
              <Text style={styles.existingPhotoText}>Original</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemovePhoto(index)}
          >
            <Ionicons name="close-circle" size={Math.floor(cellWidth * 0.28)} color="#F7B781" />
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <TouchableOpacity
          style={[styles.photoCell, { width: cellWidth, height: cellHeight }]}
          key={index}
          onPress={handleAddPhoto}
        >
          <View style={styles.addIconWrapper}>
            <Ionicons name="add-circle" size={Math.floor(cellWidth * 0.36)} color="#F7B781" />
          </View>
        </TouchableOpacity>
      );
    }
  };

  

  // Grid: always 6 cells
  const photoGrid = Array.from({ length: MAX_PHOTOS }, (_, i) => renderPhotoCell(i));

  return (
    <View style={styles.container}>
      {/* Back Arrow */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>{'<'}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>
        {editMode ? 'Update photos' : 'Add photos'}
      </Text>
      <Text style={styles.subtitle}>
        {editMode ? 'Modify existing photos or add new ones' : 'Add at least 2 photos to continue'}
      </Text>
      {editMode && (
        <Text style={styles.editHelpText}>
          • Tap ✕ to remove photos
          • Tap + to add new photos
          • "Original" photos are from the current profile
        </Text>
      )}
  <View style={[styles.gridContainer, { width: windowWidth - gridPadding }]}> {photoGrid} </View>
      {photos.length < 2 ? (
        <View style={[styles.continueButton, styles.continueButtonDisabled]}>
          <Text style={styles.continueButtonText}>CONTINUE</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.nextButtonWrapper} activeOpacity={0.8} onPress={handleContinue}>
          <LinearGradient
            colors={["#F7B781", "#F7C98B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButtonGradient}
          >
            <Text style={styles.nextButtonText}>CONTINUE</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
      <UploadModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCamera={handleCamera}
        onGallery={handleGallery}
        onRemove={() => {}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
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
  subtitle: {
    fontSize: 13,
    color: '#A3A3A3',
    marginBottom: 18,
    textAlign: 'center',
  },
  editHelpText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    alignSelf: 'center',
  },
  photoCell: {
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    margin: cellMargin,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 11,
    padding: 0,
    zIndex: 2,
  },
  addIconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  continueButton: {
    width: 270,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  continueButtonDisabled: {
    backgroundColor: '#E5E5E5',
    opacity: 0.7,
  },
  continueButtonText: {
    color: '#A3A3A3',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  // Style for existing photo indicator
  existingPhotoIndicator: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    backgroundColor: 'rgba(71, 85, 105, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  existingPhotoText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default AddDogPicScreen;
  