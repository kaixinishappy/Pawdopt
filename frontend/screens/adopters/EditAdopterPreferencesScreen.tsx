import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { getAccessToken } from '../../services/CognitoService';
import { AppHeader } from '../../components/layout';
import { LoadingSpinner, Button, Input, Card } from '../../components/ui';
import { colors } from '../../components/styles/GlobalStyles';
import { BackButton } from '../../components/ui/Button';

// =====================
// Constants
// =====================
const API_BASE_URL = process.env.EXPO_PUBLIC_PREFERENCES_API_URL;
const PREFERENCE_CRUD_ENDPOINT = API_BASE_URL;

// Define the structure for adopter preferences
interface Preferences {
  minAge: string;
  maxAge: string;
  size: string[];
  color: string[];
  preferredBreeds: string[];
}

type EditAdopterPreferencesScreenNavigationProp = NavigationProp<
  RootStackParamList,
  'EditAdopterPreference'
>;

// Define options for the dropdowns
const SIZES = ['Small', 'Medium', 'Large', 'Any'];
const COLORS = ['Black', 'Brown', 'White', 'Ginger', 'Tricolor', 'Any'];
const BREEDS = [
  'Labrador',
  'German Shepherd',
  'Poodle',
  'Bulldog',
  'Beagle',
  'Golden Retriever',
  'Any',
];

const EditAdopterPreferencesScreen: React.FC = () => {
  const navigation =
    useNavigation<EditAdopterPreferencesScreenNavigationProp>();

  const [preferences, setPreferences] = useState<Preferences>({
    minAge: '',
    maxAge: '',
    size: ['Any'],
    color: ['Any'],
    preferredBreeds: ['Any'],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentModalType, setCurrentModalType] = useState<
    'size' | 'color' | 'preferredBreeds' | null
  >(null);

  // Function to fetch preferences from your API
  const fetchPreferences = async () => {
    setIsLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        Alert.alert(
          'Authentication Error',
          'Could not get access token.'
        );
        navigation.goBack();
        return;
      }

      const response = await fetch(PREFERENCE_CRUD_ENDPOINT, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }

      const data = await response.json();
      setPreferences({
        minAge: data.minAge?.toString() || '',
        maxAge: data.maxAge?.toString() || '',
        size:
          data.size && Array.isArray(data.size) ? data.size : ['Any'],
        color:
          data.color && Array.isArray(data.color) ? data.color : ['Any'],
        preferredBreeds:
          data.preferredBreeds && Array.isArray(data.preferredBreeds)
            ? data.preferredBreeds
            : ['Any'],
      });
    } catch (error) {
      console.error('Error fetching preferences:', error);
      Alert.alert(
        'Error',
        'Failed to load preferences. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  // Function to save preferences to your API
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        Alert.alert(
          'Authentication Error',
          'Could not get access token.'
        );
        return;
      }

      const preferencesToSave = {
        ...preferences,
        minAge: preferences.minAge
          ? parseInt(preferences.minAge)
          : null,
        maxAge: preferences.maxAge
          ? parseInt(preferences.maxAge)
          : null,
      };

      const response = await fetch(PREFERENCE_CRUD_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(preferencesToSave),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      Alert.alert('Success', 'Preferences updated successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert(
        'Error',
        'Failed to save preferences. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleModalOpen = (
    type: 'size' | 'color' | 'preferredBreeds'
  ) => {
    setCurrentModalType(type);
    setModalVisible(true);
  };

  const handleSelectOption = (option: string) => {
    if (!currentModalType) return;

    setPreferences((prev) => {
      let currentOptions = prev[currentModalType];
      let updatedOptions = [...currentOptions];

      if (option === 'Any') {
        updatedOptions = ['Any'];
      } else {
        if (updatedOptions.includes('Any')) {
          updatedOptions = [];
        }
        const index = updatedOptions.indexOf(option);
        if (index > -1) {
          updatedOptions.splice(index, 1);
        } else {
          updatedOptions.push(option);
        }
        if (updatedOptions.length === 0) {
          updatedOptions = ['Any'];
        }
      }
      return { ...prev, [currentModalType]: updatedOptions };
    });
  };

  const renderDropdownModal = () => {
    let options: string[] = [];
    let title = '';
    let selectedOptions: string[] = [];

    switch (currentModalType) {
      case 'size':
        options = SIZES;
        title = 'Select Size(s)';
        selectedOptions = preferences.size;
        break;
      case 'color':
        options = COLORS;
        title = 'Select Color(s)';
        selectedOptions = preferences.color;
        break;
      case 'preferredBreeds':
        options = BREEDS;
        title = 'Select Preferred Breed(s)';
        selectedOptions = preferences.preferredBreeds;
        break;
      default:
        return null;
    }

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{title}</Text>
            <ScrollView style={styles.modalOptionsContainer}>
              {options.map((option, index) => {
                const isSelected = selectedOptions.includes(option);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.modalOption,
                      isSelected && styles.selectedOption,
                    ]}
                    onPress={() => handleSelectOption(option)}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        isSelected && styles.selectedOptionText,
                      ]}
                    >
                      {option}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#FF6F61"
                        style={styles.checkmarkIcon}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LoadingSpinner size="large" color={colors.red} />
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        leftComponent={
          <BackButton
            onPress={() => navigation.goBack()}
          />
        }
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Edit Pet Preferences</Text>

          <Card style={styles.formCard}>
            {/* Age Preferences */}
            <View style={styles.ageSection}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="time" size={20} color={colors.red} />
                <Text style={styles.sectionTitle}>Age Range</Text>
              </View>
              
              <View style={styles.ageRow}>
                <Input
                  label="Min Age (years)"
                  value={preferences.minAge}
                  onChangeText={(text: string) =>
                    setPreferences({ ...preferences, minAge: text })
                  }
                  keyboardType="numeric"
                  placeholder="e.g., 1"
                  style={styles.ageInput}
                />
                
                <Input
                  label="Max Age (years)"
                  value={preferences.maxAge}
                  onChangeText={(text: string) =>
                    setPreferences({ ...preferences, maxAge: text })
                  }
                  keyboardType="numeric"
                  placeholder="e.g., 5"
                  style={styles.ageInput}
                />
              </View>
            </View>

            {/* Size Preferences */}
            <View style={styles.preferenceSection}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="resize" size={20} color={colors.red} />
                <Text style={styles.sectionTitle}>Size Preference</Text>
              </View>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => handleModalOpen('size')}
              >
                <Text style={styles.dropdownText}>
                  {preferences.size.join(', ') || 'Select one or more sizes'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.grey} />
              </TouchableOpacity>
            </View>

            {/* Color Preferences */}
            <View style={styles.preferenceSection}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="color-palette" size={20} color={colors.red} />
                <Text style={styles.sectionTitle}>Color Preference</Text>
              </View>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => handleModalOpen('color')}
              >
                <Text style={styles.dropdownText}>
                  {preferences.color.join(', ') || 'Select one or more colors'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.grey} />
              </TouchableOpacity>
            </View>

            {/* Breed Preferences */}
            <View style={styles.preferenceSection}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="paw" size={20} color={colors.red} />
                <Text style={styles.sectionTitle}>Breed Preference</Text>
              </View>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => handleModalOpen('preferredBreeds')}
              >
                <Text style={styles.dropdownText}>
                  {preferences.preferredBreeds.join(', ') || 'Select one or more breeds'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.grey} />
              </TouchableOpacity>
            </View>
          </Card>

          <Button
            title={isSaving ? 'Saving...' : 'Save Preferences'}
            onPress={handleSave}
            disabled={isSaving}
            variant="primary"
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      {renderDropdownModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: colors.white 
  },
  keyboardAvoidingContainer: { 
    flex: 1 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 16, 
    fontSize: 16, 
    color: colors.grey 
  },
  container: { 
    flexGrow: 1, 
    padding: 20, 
    paddingBottom: 80 
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: colors.darkGrey, 
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  formCard: {
    width: '100%',
    marginBottom: 20,
    padding: 20,
  },
  ageSection: {
    marginBottom: 24,
  },
  preferenceSection: {
    marginBottom: 24,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.darkGrey,
    marginLeft: 8,
  },
  ageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  ageInput: {
    flex: 1,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lightGrey,
    borderRadius: 8,
    padding: 12,
    minHeight: 50,
  },
  dropdownText: {
    fontSize: 16,
    color: colors.darkGrey,
    flex: 1,
  },
  saveButton: {
    width: '100%',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalOptionsContainer: {},
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedOption: {
    backgroundColor: '#fff5f5',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  selectedOptionText: {
    fontWeight: 'bold',
    color: '#FF6F61',
  },
  checkmarkIcon: {
    marginLeft: 10,
  },
  modalCloseButton: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#FF6F61',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default EditAdopterPreferencesScreen;