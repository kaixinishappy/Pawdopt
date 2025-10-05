import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, Dog } from '../../App';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader, AppFooter } from '../../components/layout';
import { LoadingSpinner, Button, Card } from '../../components/ui';
import { colors, globalStyles } from '../../components/styles/GlobalStyles';
import DogProfileModal from '../shelters/DogProfileModal';
import { handleAlert } from '../utils/AlertUtils';
import { deleteDog } from '../../src/api';

import { DogsApi } from '../../generated/apis';
import { DogPage } from '../../generated/models';
import { getIdToken } from '../../services/CognitoService';
import { dogApiConfig } from '../../src/api';

import { jwtDecode } from 'jwt-decode';

type ShelterDashboardScreenNavigationProp = NavigationProp<RootStackParamList, 'ShelterDashboard'>;
type AddDogScreenNavigationProp = NavigationProp<RootStackParamList, 'AddDog'>;

const ShelterDashboardScreen: React.FC = () => {
  const navigation = useNavigation<ShelterDashboardScreenNavigationProp>();
  const addDogNavigation = useNavigation<AddDogScreenNavigationProp>();

  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shelterId, setShelterId] = useState<string>(''); 
  const [shelterPostcode, setShelterPostcode] = useState<string>(''); 
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null); // For modal
  const [isModalVisible, setIsModalVisible] = useState(false); // For modal visibility

  const dogsApi = new DogsApi(dogApiConfig);

  // Simulate fetching dogs (replace with actual API call later)
  const fetchDogs = useCallback(async () => {
    setIsRefreshing(true);
    setLoading(true);
    // In a real app, you'd fetch dogs specific to 'shelterId' from your backend
    // For now, we'll filter the mock data
    try {
      const response: DogPage = await dogsApi.listDogs();
      if (response.dogs) {
        setDogs(response.dogs);
      }
    } catch (error: any) {
      console.error('Failed to fetch dogs:', error);

      if (error.response) {
        const text = await error.response.text();
        console.error('Backend error response: ', text);
      }
    }  

    // await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    // const filteredMockDogs = initialMockDogs.filter(dog => dog.shelterId === shelterId);
    // setDogs(filteredMockDogs);
    setLoading(false);
    setIsRefreshing(false);
  }, [shelterId]);

  useEffect(() => {
    fetchDogs();
  }, [fetchDogs]);

  // Use useFocusEffect to refresh data when screen comes into focus (e.g., after adding a dog)
  useFocusEffect(
    useCallback(() => {
      fetchDogs();
    }, [fetchDogs])
  );

  const handleAddDog = useCallback((newDog: Dog) => {
    setDogs(prevDogs => [...prevDogs, newDog]);
    handleAlert('Success', `${newDog.name} added to your list!`);
  }, []);

  const navigateToAddDog = () => {
    // Pass the callback to AddDogScreen
    addDogNavigation.navigate('AddDog', {
      onAddDog: handleAddDog,
      shelterId: shelterId, // Pass current mock shelter ID
      shelterPostcode: shelterPostcode, // Pass current mock shelter postcode
    });
  };

  const renderDogItem = ({ item }: { item: Dog }) => (
    <TouchableOpacity onPress={() => handleDogPress(item)}>
      <Card style={styles.dogCard}>
        {item.photoURLs && item.photoURLs.length > 0 && (
          <Image source={{ uri: item.photoURLs[0] }} style={styles.dogImage} />
        )}
        <View style={styles.dogInfo}>
          <Text style={styles.dogName}>{item.name}</Text>
          <Text style={styles.dogBreedAge}>{item.breed}, {item.age} years old</Text>
          <Text style={styles.dogStatus}>Status: {item.status}</Text>
          {item.description && <Text style={styles.dogDescription}>{item.description.substring(0, 70)}...</Text>}
        </View>
      </Card>
    </TouchableOpacity>
  );

  const handleDogPress = (dog: Dog) => {
    setSelectedDog(dog);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedDog(null);
  };

  const userEditDog = async(dog: Dog) => {
    try {
      // Close the modal first
      closeModal();
      
      // Navigate to AddDog screen with edit mode enabled
      addDogNavigation.navigate('AddDog', {
        onAddDog: handleAddDog,
        shelterId: shelterId,
        shelterPostcode: shelterPostcode,
        editMode: true,
        existingDog: dog, // Pass the dog data to pre-fill the form
      });
      
    } catch (error) {
      console.error('Error navigating to edit dog:', error);
      Alert.alert('Error', 'Failed to open edit screen');
    }
  }

  const userDeleteDog = async(dog:Dog) => {
    try{
      const token =  await getIdToken() || ''
      const response = await deleteDog(dog.id, dog.createdAt, token);
      if (response.ok) {
        alert('Dog deleted!');
        closeModal();
      } else {
        const text = await response.text();
        alert('Deletion failed: ' + text);
      }
    } catch (error) {
      alert('Error: ' + (error as Error).message);
    }
    fetchDogs();
  }

  // --- Footer Navigation Functions ---
  const goToHome = () => {
    // Removed alert for smoother navigation
    navigation.navigate({ name: 'ShelterDashboard', params: {} }); // Stay on the current screen
  };

  const goToChat = async () => {
    type IdTokenPayload = {
      sub: string;
      [key: string]: any;
    };
    const idToken = await getIdToken() ?? '';
    const decoded: IdTokenPayload = jwtDecode(idToken);
    const userId = decoded.sub;
    navigation.navigate('ChatListScreen', {role: "shelter", userId: userId}); // You'll create this screen later
  };

  const goToProfile = () => {
    navigation.navigate('ShelterProfile'); // You'll create this screen later
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
      </View>
    );
  }

  return (
    // Wrap the entire screen content in SafeAreaView
    <SafeAreaView style={styles.safeArea}>
      <AppHeader /> {/* AppHeader will now automatically avoid the safe area */}

      <View style={styles.contentContainer}>
        <Button
          title="Add New Dog"
          variant="primary"
          onPress={navigateToAddDog}
          style={styles.addDogButton}
        />

        {dogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="paw-outline" size={80} color={colors.grey} />
            <Text style={styles.noDogsText}>You haven't added any dogs yet.</Text>
            <Text style={styles.emptySubtext}>Tap 'Add New Dog' to get started!</Text>
          </View>
        ) : (
          <FlatList
            data={dogs}
            keyExtractor={(item) => item.id}
            renderItem={renderDogItem}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={fetchDogs} />
            }
            contentContainerStyle={styles.flatListContent} // Add padding for FlatList
          />
        )}
      </View>

      {/* AppFooter is positioned absolutely, so it will sit at the very bottom of SafeAreaView */}
      <AppFooter
        onPressProfile={goToProfile}
        onPressHome={goToHome}
        onPressChat={goToChat}
        activeScreen="home" // Highlight the home icon for Shelter Dashboard
      />

      {/* Dog Details Modal */}
      <DogProfileModal
        visible={isModalVisible}
        dog={selectedDog}
        onClose={closeModal}
        onEdit={userEditDog}
        onDelete={(dog) => {
          userDeleteDog(dog);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 100, // Add padding to push content away from footer
  },
  flatListContent: {
    paddingBottom: 20,
    ...globalStyles.shadowStyle,
  },
  addDogButton: {
    marginBottom: 25,
    alignSelf: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  noDogsText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.darkGrey,
  },
  emptySubtext: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
    color: colors.grey,
  },
  dogCard: {
    flexDirection: 'row',
    marginBottom: 15,
    overflow: 'hidden',
    // borderWidth: 1,
    // borderColor: colors.lightGrey,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 10, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dogImage: {
    width: 120,
    height: 120,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    resizeMode: 'cover',
  },
  dogInfo: {
    flex: 1,
    padding: 15,
    justifyContent: 'center', 
  },
  dogName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.darkGrey,
    marginBottom: 5,
  },
  dogBreedAge: {
    fontSize: 16,
    color: colors.grey,
    marginBottom: 5,
  },
  dogStatus: {
    fontSize: 14,
    color: colors.grey,
    marginBottom: 5,
  },
  dogDescription: {
    fontSize: 14,
    color: colors.grey,
    lineHeight: 20,
  },
});

export default ShelterDashboardScreen;