import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ScrollView, Alert, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { handleAlert } from '../utils/AlertUtils';
import { dogsApi } from '../../src/api';
import { Dog } from '../../generated';
import { swipe } from './DogSwipeScreen';
import MapView, { Marker } from 'react-native-maps';
import { getIdToken } from '../../services/CognitoService';
import { updateDogProfile } from '../../src/api';
import { LoadingSpinner, GradientButton, Card } from '../../components/ui';
import { colors } from '../../components/styles/GlobalStyles';

// Define types (assuming they are correct)
type DogProfileDetailScreenRouteProp = RouteProp<RootStackParamList, 'DogProfileDetail'>;
type DogProfileDetailScreenNavigationProp = NavigationProp<RootStackParamList, 'DogProfileDetail'>;

// CORRECTED API_BASE_URL
const API_BASE_URL = 'https://qka5mqb8xl.execute-api.eu-west-2.amazonaws.com/default/getLocation';

const DogProfileDetailScreen: React.FC<{
  navigation: DogProfileDetailScreenNavigationProp;
  route: DogProfileDetailScreenRouteProp;
}> = ({ navigation, route }) => {
  const { dogId, dogCreatedAt, distance, role = 'adopter', adopterId, fromChat = false } = route.params;
  
  interface Location {
    latitude: number;
    longitude: number;
  }
  
  const [adopterLocation, setAdopterLocation] = useState<Location | null>(null);
  const [dogLocation, setDogLocation] = useState<Location | null>(null);
  const [dog, setDog] = useState<Dog | null>(null);
  const [isLoading, setIsLoading] = useState(true); // New loading state
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    const fetchDogAndLocations = async () => {
      console.log("Starting data fetch for Dog ID:", dogId);
      setIsLoading(true);

      try {
        // Fetch JWT token for authentication
        const token = await getIdToken();
        if (!token) {
          throw new Error('No authentication token found. Please log in.');
        }

        // Fetch dog details first
        const foundDog = await dogsApi.getDog({ dogId, dogCreatedAt });
        console.log("Successfully fetched dog details:", foundDog.name);
        setDog(foundDog);

        // Now fetch location data from the new API endpoint
        // CORRECTED: Passing dogId and dogCreatedAt as query parameters
        const locationApiUrl = `${API_BASE_URL}?dogId=${dogId}&dogCreatedAt=${dogCreatedAt}`;
        console.log("Fetching location data from:", locationApiUrl);
        
        const response = await fetch(locationApiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("API call failed with status:", response.status, "and message:", errorData.message);
          throw new Error(errorData.message || 'Failed to fetch location data');
        }

        const locationData = await response.json();
        console.log('Successfully received location data:', locationData);
        
        // CRITICAL CHECK: Validate the data before setting state
        if (locationData && locationData.adopter && locationData.dog) {
          setAdopterLocation(locationData.adopter);
          setDogLocation(locationData.dog);
          console.log("Locations set successfully.");
        } else {
          console.warn("Location data is missing 'adopter' or 'dog' properties. Received data:", locationData);
          handleAlert('Warning', 'Location data is incomplete. Map may not display correctly.');
        }

      } catch (e) {
        console.error("An error occurred during fetchDogAndLocations:", e);
        handleAlert('Error', `Failed to fetch data`);
        navigation.goBack();
      } finally {
        setIsLoading(false); // Set loading to false regardless of success or failure
      }
    };
    fetchDogAndLocations();
  }, [dogId, dogCreatedAt]);

  const handleApplyForAdoption = async () => {
    if (dog) {
      const success = await swipe(dogId, dogCreatedAt, 'right', dog.shelterId);
      try {
        if (success) {
          handleAlert(`Request Success`, `Applying for ${dog.name} from ${dog.shelterName}!`);
        }
      } catch (e) {
        handleAlert('Error', `${e}`);
      }
    }
    navigation.navigate('AdopterDashboard');
  };

  const handleAcceptAdopter = async () => {
    if (dog && adopterId) {
      try {
        // TODO: FOR SHELTER TO ACCEPT ADOPTER
        // Here you would call an API to accept the adoption request
        // For now, I'll create a placeholder
        try {
              const token = await getIdToken();
              if (!token) return alert('Please sign in first');
        
              const payload = {
                dogStatus: 'ADOPTED',
                adopterId: adopterId
              };

              let response;
              
              response = await updateDogProfile(dog.id, payload, token);
                
                if (response.ok) {
                  alert('Dog updated successfully!');
                  // Navigate back to dashboard
                  navigation.navigate('AddDogSuccess');
                } else {
                  const text = await response.text();
                  alert('Update failed: ' + text);
                }
            } catch (e) {
              handleAlert('Error', 'Update dog status error');
            }
              

        handleAlert('Adoption Accepted', `You have accepted the adoption request for ${dog.name}!`);
        
        // Navigate back to shelter dashboard
        navigation.navigate('ShelterDashboard', {});
      } catch (e) {
        handleAlert('Error', `Failed to accept adoption request: ${e}`);
      }
    } else {
      handleAlert('Error', 'Missing adopter information');
    }
  };

  if (isLoading || !dog) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" color={colors.red} />
        <Text style={styles.loadingText}>Loading dog profile...</Text>
      </View>
    );
  }
  
  const initialRegion = adopterLocation && dogLocation ? {
    latitude: (adopterLocation.latitude + dogLocation.latitude) / 2,
    longitude: (adopterLocation.longitude + dogLocation.longitude) / 2,
    latitudeDelta: Math.abs(adopterLocation.latitude - dogLocation.latitude) * 2 || 0.0922,
    longitudeDelta: Math.abs(adopterLocation.longitude - dogLocation.longitude) * 2 || 0.0421,
  } : null;

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Back Button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={colors.red} />
        </TouchableOpacity>

        {/* Horizontal Image Gallery */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={true}
          style={styles.imageGallery}
        >
          {dog.photoURLs.map((url, index) => (
            <Image
              key={index}
              source={{ uri: url }}
              style={[styles.dogImage, { width: screenWidth }]}
            />
          ))}
        </ScrollView>

        {/* Dog Information Section */}
        <View style={styles.infoContainer}>
          <View style={styles.nameAgeGender}>
            <Text style={styles.dogName}>{dog.name}</Text>
            <Text style={styles.dogAge}>, {dog.age}</Text>
            <Text style={styles.dogGender}> ({dog.gender})</Text>
          </View>
          <Text style={styles.dogBreed}>{dog.breed}</Text>
          
          <Card style={styles.aboutCard}>
            <Text style={styles.sectionTitle}>About {dog.name}</Text>
            <Text style={styles.dogDescription}>{dog.description}</Text>
          </Card>
          
          <Card style={styles.shelterCard}>
              <View style={styles.shelterTitleContainer}>
                <Ionicons name="home" size={20} color={colors.red} />
                <Text style={styles.shelterTitle}>Shelter Information</Text>
              </View>
              <View style={styles.shelterDetailRow}>
                <Ionicons name="location" size={16} color={colors.grey} />
                <Text style={styles.shelterDetail}>{dog.shelterName}</Text>
              </View>
              <View style={styles.shelterDetailRow}>
                <Ionicons name="map" size={16} color={colors.grey} />
                <Text style={styles.shelterDetail}>{dog.shelterAddress} {dog.shelterPostcode}</Text>
              </View>
              <View style={styles.shelterDetailRow}>
                <Ionicons name="resize" size={16} color={colors.grey} />
                <Text style={styles.shelterDetail}>Distance: {distance} km</Text>
              </View>
              <View style={styles.shelterDetailRow}>
                <Ionicons name="mail" size={16} color={colors.grey} />
                <Text style={styles.shelterDetail}>{dog.shelterEmail}</Text>
              </View>
              <View style={styles.shelterDetailRow}>
                <Ionicons name="call" size={16} color={colors.grey} />
                <Text style={styles.shelterDetail}>{dog.shelterContact}</Text>
              </View>
            </Card>
          </View>
        

        <View style={styles.mapContainer}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="globe" size={22} color={colors.darkGrey} />
            <Text style={styles.sectionTitle}> Location</Text>
          </View>
          {initialRegion ? (
            <MapView
              style={styles.map}
              initialRegion={initialRegion}
              onMapReady={() => console.log('Map is ready')}
            >
              {/* Adopter Marker */}
              {adopterLocation && (
                <Marker
                  coordinate={{
                    latitude: adopterLocation.latitude,
                    longitude: adopterLocation.longitude,
                  }}
                  title="You"
                  description="Your Location"
                  pinColor="blue"
                />
              )}
              {/* Dog/Shelter Marker */}
              {dogLocation && (
                <Marker
                  coordinate={{
                    latitude: dogLocation.latitude,
                    longitude: dogLocation.longitude,
                  }}
                  title={dog.name}
                  description={`Location of ${dog.name}'s shelter`}
                  pinColor="red"
                />
              )}
            </MapView>
          ) : (
            <Text>Loading map...</Text>
          )}
        </View>

      </ScrollView>

      {/* Apply for Adoption Button at the bottom - only show if not from chat or if shelter */}
      {(!fromChat || role === 'shelter') && (
        <View style={styles.bottomButtonContainer}>
          <GradientButton
            title={role === 'shelter' ? 'Accept Adopter to Adopt' : `Request to Chat with ${dog.shelterName}`}
            onPress={role === 'shelter' ? handleAcceptAdopter : handleApplyForAdoption}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  loadingText: {
    fontSize: 18,
    color: colors.grey,
    marginTop: 16,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 50, // Add padding at the bottom for the main scroll view
  },
  backButton: {
    position: 'absolute',
    top: 20, // Adjusted top for SafeAreaView
    left: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: colors.white,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageGallery: {
    height: Dimensions.get('window').height * 0.5, // Use a percentage of the screen height
  },
  dogImage: {
    height: '100%',
    resizeMode: 'cover',
  },
  infoContainer: {
    padding: 20,
  },
  nameAgeGender: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 5,
  },
  dogName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.darkGrey,
  },
  dogAge: {
    fontSize: 24,
    color: colors.grey,
    marginLeft: 5,
  },
  dogGender: {
    fontSize: 20,
    color: colors.grey,
    marginLeft: 5,
  },
  dogBreed: {
    fontSize: 20,
    color: colors.grey,
    marginBottom: 20,
  },
  shelterCard: {
    marginTop: 20,
    padding: 15,
  },
  shelterTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shelterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.darkGrey,
    marginLeft: 8,
  },
  shelterDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  shelterDetail: {
    fontSize: 16,
    color: colors.grey,
    marginLeft: 8,
    flex: 1,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.darkGrey,
  },
  dogDescription: {
    fontSize: 16,
    color: colors.grey,
    lineHeight: 24,
  },
  aboutCard: {
    marginTop: 20,
    padding: 16,
  },
  bottomButtonContainer: {
    backgroundColor: colors.white,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.lightGrey,
  },
  mapContainer: {
    padding: 20,
    height: 300,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});

export default DogProfileDetailScreen;