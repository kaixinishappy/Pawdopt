import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { RootStackParamList, Dog } from '../../App';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import { getAccessToken } from '../../services/CognitoService';
import { uploadDogProfile, updateDogProfile } from '../../src/api';

type AddDogDescriptionRouteProp = RouteProp<RootStackParamList, 'AddDogDescription'>;

const AddDogDescriptionScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<AddDogDescriptionRouteProp>();
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
    photos,
    photoKeys,
    editMode,
    existingDog,
  } = route.params || {};

  // Initialize bio with existing dog's description if in edit mode
  const [bio, setBio] = useState(editMode && existingDog ? existingDog.description || '' : '');

  const canContinue = bio.trim().length > 0;

  const handleContinue = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return alert('Please sign in first');

      const payload = {
        name,
        age: age, // Use the calculated age number
        dob: dob, // Also store the original DOB string (YYYY/MM format)
        breed,
        gender,
        color,
        size,
        description: bio,
        dog_status: 'AVAILABLE',
        shelter_id: shelterId,
        shelter_postcode: shelterPostcode,
        // For edit mode, we might have a mix of existing and new photos
        photo_keys: photoKeys || [], // Try both field names
      };

      console.log('Payload being sent:', JSON.stringify(payload, null, 2));
      console.log('PhotoKeys:', photoKeys);

      let response;
      
      if (editMode && existingDog) {
        // Update existing dog
        response = await updateDogProfile(existingDog.id, payload, token);
        
        if (response.ok) {
          alert('Dog updated successfully!');
          // Navigate back to dashboard
          navigation.navigate('AddDogSuccess');
        } else {
          const text = await response.text();
          alert('Update failed: ' + text);
        }
      } else {
        // Create new dog
        response = await uploadDogProfile(payload, token);
        
        if (response.ok) {
          alert('Dog uploaded!');
          navigation.navigate('AddDogSuccess');
        } else {
          const text = await response.text();
          alert('Upload failed: ' + text);
        }
      }
    } catch (error) {
      alert('Error: ' + (error as Error).message);
    }
  };
  
  

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      <View style={styles.container}>
        {/* Back Arrow */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {editMode ? 'Update dog description' : 'Enter dog description'}
        </Text>
        <Text style={styles.inputLabel}>Bio</Text>
        {editMode && existingDog && existingDog.description && (
          <Text style={styles.editNote}>
            Editing existing description - make any changes needed below:
          </Text>
        )}
        <TextInput
          style={styles.textAreaInput}
          value={bio}
          onChangeText={setBio}
          placeholder={editMode ? "Update the dog's bio..." : "Enter a description for the dog..."}
          multiline
          textAlignVertical="top"
        />
        <View style={styles.continueButtonWrapper}>
          <TouchableOpacity
            disabled={!canContinue}
            activeOpacity={canContinue ? 0.8 : 1}
            onPress={handleContinue}
          >
            <View style={[styles.continueButtonGradient, { backgroundColor: canContinue ? '#F7B781' : '#E5E5E5' }]}>
              <Text style={[styles.continueButtonText, { color: canContinue ? '#fff' : '#A3A3A3' }]}>
                {editMode ? 'UPDATE' : 'CONTINUE'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
    marginBottom: 50,
    alignSelf: 'center',
  },
  inputLabel: {
    alignSelf: 'flex-start',
    fontSize: 16,
    color: '#F7B781',
    marginBottom: 5,
    marginTop: 15,
  },
  editNote: {
    alignSelf: 'flex-start',
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  textAreaInput: {
    width: '100%',
    height: 370,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 18,
    color: '#333',
    marginBottom: 10,
  },
  continueButtonWrapper: {
    width: '100%',
    marginTop: 50,
    borderRadius: 50,
    overflow: 'hidden',
  },
  continueButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default AddDogDescriptionScreen;
