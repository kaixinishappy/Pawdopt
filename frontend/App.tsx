import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ApolloProvider } from '@apollo/client';
import { client } from './apolloClient';

// Import all your screen components
import OnboardingScreen from "./screens/login/OnboardingScreen";
import LoginScreen from './screens/login/LoginScreen';
import UniversalCreateAccountScreen from './screens/login/UniversalCreateAccountScreen';
import SignupAdopterDetailsScreen from './screens/login/SignupAdopterDetailsScreen';
import SignupShelterDetailsScreen from './screens/login/SignupShelterDetailsScreen';
import SignupAdopterExperienceScreen from './screens/login/SignupAdopterExperienceScreen';
import DogSwipeScreen from './screens/adopters/DogSwipeScreen';
import DogProfileDetailScreen from './screens/adopters/DogProfileDetailScreen';
import ShelterDashboardScreen from './screens/shelters/ShelterDashboardScreen';
import AddDogScreen from './screens/shelters/AddDogScreen'; 
import AddDogPicScreen from './screens/shelters/AddDogPicScreen';
import AddDogDescriptionScreen from './screens/shelters/AddDogDescriptionScreen';
import AddDogSuccessScreen from './screens/shelters/AddDogSuccessScreen';
import ShelterProfileScreen from './screens/shelters/ShelterProfileScreen';
import EditShelterProfileScreen from './screens/shelters/EditShelterProfileScreen';
import EditAdopterPreferencesScreen from './screens/adopters/EditAdopterPreferencesScreen';
import AdopterProfileScreen from './screens/adopters/AdopterProfileScreen';
import ChatListScreen from './screens/chat/ChatListScreen';
import ChatScreen from './screens/chat/ChatScreen';
import EditAdopterProfileScreen from './screens/adopters/EditAdopterProfileScreen';
import AdoptionRequestsScreen from './screens/adopters/AdoptionRequestsScreen';
import IncomingRequestsScreen from './screens/shelters/IncomingRequestsScreen';
import AdopterProfileTemplate from './screens/shelters/AdopterProfileTemplate';
export interface Dog {
  id: string;
  name: string;
  breed: string;
  dob: string; // Original DOB string (YYYY/MM)
  age: number;
  gender: string;
  color: string;
  size: string;
  description: string;
  photoURLs: string[];
  shelterId: string;
  status: string; // e.g., "Available", "Adopted", "Pending"
  createdAt: string; // Using string for simplicity with mock data
}

export interface ShelterProfile {
  shelterId: string;
  shelterName: string;
  email: string;
  contact: string;
  address: { formatted: string }; 
  postcode: string;
  iconUrl: string;
}

export interface AdopterProfile {
  adopterId: string;
  adopterName: string;
  email: string;
  contact: string;
  address: { formatted: string }; 
  postcode: string;
  iconUrl: string;
  // Preferences
}
// --- Define the type for your navigation stack parameters ---
export type RootStackParamList = {
  Onboarding: undefined; // No parameters expected for the Onboarding screen
  Login: undefined; // No parameters expected for the Login screen
  UniversalCreateAccount: { role: 'adopter' | 'shelter' }; // Expects a 'role' parameter
  SignupAdopterDetails: { email: string; password: string }; // Expects email and password
  SignupShelterDetails: { email: string; password: string }; // Expects email and password
  SignupAdopterExperience: { // Expects all previously collected adopter details
    email: string;
    password: string;
    name: string;
    dob: string;
    gender: string;
    address: string;
    postcode: string;
    phoneNo: string;
    latitude: string;
    longitude: string;
  };
  DogProfileDetail: {dogId: string, dogCreatedAt: string, distance: number, role?: 'adopter' | 'shelter', adopterId?: string, fromChat?: boolean};
  AdopterDashboard: undefined; // No parameters expected for the dashboard (for now)
  ShelterDashboard: {
    // When navigating to ShelterDashboard, we might pass a newDog if coming from AddDogScreen
    newDog?: Dog;
  };
  AddDog: {
    // Pass a callback function to AddDogScreen to update the list on the dashboard
    onAddDog: (newDog: Dog) => void;
    // You might also pass shelter details here if needed for pre-filling
    shelterId?: string;
    shelterPostcode?: string;
    // Edit mode parameters
    editMode?: boolean;
    existingDog?: Dog;
  };
  AddDogPic:{
    onAddDog: (newDog: Dog) => void;
    shelterId?: string;
    shelterPostcode?: string;
    name: string;
    breed: string;
    dob: string; // Original DOB string (YYYY/MM)
    age: number | null; // Calculated age number
    gender: string;
    color: string;
    size: string;
    // Edit mode parameters
    editMode?: boolean;
    existingDog?: Dog;
  }
  AddDogDescription:{
    onAddDog: (newDog: Dog) => void;
    shelterId?: string;
    shelterPostcode?: string;
    name: string;
    breed: string;
    dob: string; // Original DOB string (YYYY/MM)
    age: number | null; // Calculated age number
    gender: string;
    color: string;
    size: string;
    photos: string[]; // Array of photo URLs
    photoKeys: string[]; // Array of S3 object keys for uploaded photos
    editMode?: boolean;
    existingDog?: Dog;
  }
  AddDogSuccess: undefined; // No parameters expected for success screen
  ShelterProfile: undefined; 
  EditShelterProfile: {profile: ShelterProfile };
  IncomingRequests: undefined; 
  AdopterProfileTemplate: { 
    adopter: {
      adopterId: string;
      adopterName: string;
      email: string;
      contact: string;
      address: string | { formatted: string };
      postcode: string;
      iconUrl: string;
      experience?: string;
      dateOfBirth?: string;
      gender?: string;
    };
  };
  EditAdopterPreference: undefined;
  AdopterProfile: undefined; 
  AdoptionRequests: undefined;
  EditAdopterProfile: { profile: AdopterProfile };
  ChatListScreen: {
    role: 'adopter' | 'shelter';
    userId: string; // The ID of the logged-in user
  }
  ChatScreen: {
    chatId: string;
    dogId: string; // ID of the dog the chat is about
    dogName: string;
    dogCreatedAt: string;
    senderId: string; // The ID of the person you're chatting with
    receipientId: string;
    role: 'adopter' | 'shelter'; // Role of the current logged-in user
    chatStatus: 'pending_request' | 'active' | 'inactive'; // Status of the chat thread
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <ApolloProvider client={client}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Onboarding">
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ headerShown: false }} 
          />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }} 
          />
          <Stack.Screen
            name="UniversalCreateAccount"
            component={UniversalCreateAccountScreen}
            options={{ headerShown: false }} 
          />
          <Stack.Screen
            name="SignupAdopterDetails"
            component={SignupAdopterDetailsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SignupAdopterExperience"
            component={SignupAdopterExperienceScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SignupShelterDetails"
            component={SignupShelterDetailsScreen}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="DogProfileDetail" 
            component={DogProfileDetailScreen}
            options={{ headerShown: false }} // Hide header for full control
          />

          <Stack.Screen
            name="AdopterDashboard"
            component={DogSwipeScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ShelterDashboard"
            component={ShelterDashboardScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="AddDog" 
            component={AddDogScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen
            name="AddDogPic"
            component={AddDogPicScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen
            name="AddDogDescription"
            component={AddDogDescriptionScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen
            name="AddDogSuccess"
            component={AddDogSuccessScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen
            name="ShelterProfile"
            component={ShelterProfileScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen
            name="EditShelterProfile"
            component={EditShelterProfileScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen
            name="IncomingRequests"
            component={IncomingRequestsScreen}
            options={{ headerShown: false }} 
          />
          <Stack.Screen
            name="AdopterProfileTemplate"
            component={AdopterProfileTemplate}
            options={{ headerShown: false }} 
          />
          <Stack.Screen
            name="AdopterProfile"
            component={AdopterProfileScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="EditAdopterProfile"
            component={EditAdopterProfileScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen
            name="EditAdopterPreference"
            component={EditAdopterPreferencesScreen}
            options={{ headerShown: false}}
          />
          <Stack.Screen
            name="AdoptionRequests"
            component={AdoptionRequestsScreen}
            options={{ headerShown: false }} 
          />
          <Stack.Screen
            name="ChatListScreen"
            component={ChatListScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen
            name="ChatScreen"
            component={ChatScreen} 
            options={{ headerShown: false }} 
          />
          {/* Add more Stack.Screen components here as you develop new pages */}

        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
    </ApolloProvider>
  );
}