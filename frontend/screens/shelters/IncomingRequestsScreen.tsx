import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppHeader } from '../../components';
import { Dog, RootStackParamList } from '../../App';
import { BackButton } from '../../components/ui/Button';
import { colors } from '../../components/styles/GlobalStyles';

import { AdopterProfile } from '../../App';
import { AdoptionRequest, createChat, getAdoptionRequests, updateAdoptionRequestChatId, updateAdoptionRequestStatus } from '../../services/RequestService';
import { getDogsByIds, getAdoptersByIds } from '../../src/api'; // NEW: Import the function to get dog details
// This type combines the request with the fetched details
interface IncomingAdoptionRequest extends AdoptionRequest {
  dog_details: Dog;
  adopter_details: AdopterProfile;
}


type IncomingRequestsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'IncomingRequests'>;
type IncomingRequestsScreenRouteProp = RouteProp<RootStackParamList, 'IncomingRequests'>;

interface IncomingRequestsScreenProps {
  navigation: IncomingRequestsScreenNavigationProp;
  route: IncomingRequestsScreenRouteProp;
}

const IncomingRequestsScreen: React.FC<IncomingRequestsScreenProps> = ({ navigation }) => {
  const [requests, setRequests] = useState<IncomingAdoptionRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    fetchIncomingRequests();
  }, []);

  const fetchIncomingRequests = async () => {
    setLoading(true);
    setError(null);
    try {
        // Step 1: Fetch all requests for the CURRENT shelter.
        // This assumes getAdoptionRequests() is updated to take a role and userId.
        const requestsFromApi = await getAdoptionRequests();
        console.log("requestsFromApi: ", requestsFromApi);

        if (requestsFromApi.length === 0) {
            setRequests([]);
            return;
        }

        // Step 2: Get unique dog and adopter IDs from the requests.
        const uniqueAdopterIds = requestsFromApi.map(req => req.adopterId);

        // Step 3: Format dog IDs into required structure and fetch details in parallel
        const dogsInfo = requestsFromApi.map(req => ({
            dogId: req.dogId,
            dogCreatedAt: req.dogCreatedAt
        }));
        console.log("dogsInfo: ", dogsInfo);
        const fetchedDogs = await getDogsByIds(dogsInfo);
        console.log("fetchedDogs: ", fetchedDogs);
        
        // Step 4: Fetch adopter details in parallel
        console.log("uniqueAdopterIds: ", uniqueAdopterIds);
        const fetchedAdopters = await getAdoptersByIds(uniqueAdopterIds);
        console.log("fetchedAdopters: ", fetchedAdopters.map(adopter => adopter.address));

        // Step 4: Combine the requests with the fetched details.
        const combinedRequests: IncomingAdoptionRequest[] = requestsFromApi.map(req => {
            const dog_details = fetchedDogs.find(dog => dog.dog_id === req.dogId);
            const adopter_details = fetchedAdopters.find(adopter => adopter.adopterId === req.adopterId);

            if (!dog_details || !adopter_details) {
                // Skip requests where details are missing (e.g., deleted profiles).
                return null;
            }

            return { 
                ...req, 
                dog_details: dog_details, 
                adopter_details: adopter_details 
            };
        }).filter(Boolean) as IncomingAdoptionRequest[]; // Filter out any nulls

        setRequests(combinedRequests);

    } catch (err) {
        console.error("Failed to fetch incoming requests:", err);
        setError("Failed to load incoming requests. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  const handleApproveRequest = async (request: IncomingAdoptionRequest) => {
    Alert.alert(
      "Approve Request",
      `Are you sure you want to approve ${request.adopter_details.adopterName}'s application for ${request.dog_details.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              // Step 1: Update request status to 'approved'
              await updateAdoptionRequestStatus(request.requestId, request.createdAt, 'approved');
              console.log("Request approved:", request);

              // Step 2: Create a chat and get the chatId
              const chatId = await createChat(request.adopterId, request.dogId, request.dogCreatedAt);
              console.log("Chat created with ID:", chatId);

              // // Step 3: Update the request with the new chatId
              // await updateAdoptionRequestChatId(request.requestId, chatId);
              // console.log("Request updated with chatId:", chatId);

              
              Alert.alert("Success", "Request approved! A chat has been created with the adopter.");
              // Step 4: Re-fetch all data to update the UI
              await fetchIncomingRequests();
            } catch (error) {
              console.error("Failed to approve request:", error);
              Alert.alert("Error", "Failed to approve request. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleRejectRequest = async (request: IncomingAdoptionRequest) => {
    Alert.alert(
      "Reject Request",
      `Are you sure you want to reject ${request.adopter_details.adopterName}'s application for ${request.dog_details.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
        
              updateAdoptionRequestStatus(request.requestId, request.createdAt, 'rejected');              
              Alert.alert("Request rejected", "The adopter has been notified.");
              await fetchIncomingRequests();
            } catch (error) {
              console.error("Failed to reject request:", error);
              Alert.alert("Error", "Failed to reject request. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleViewAdopterProfile = (adopter: IncomingAdoptionRequest['adopter_details']) => {
    navigation.navigate('AdopterProfileTemplate', { adopter });
  };

  const handleOpenChat = (request: IncomingAdoptionRequest) => {
    if (request.status === 'approved' && request.chatid) {
      navigation.navigate('ChatScreen', {
        chatId: request.chatid,
        dogId: request.dogId,
        dogName: request.dog_details.name,
        dogCreatedAt: request.dogCreatedAt,
        senderId: request.shelterId,
        receipientId: request.adopterId,
        role: 'shelter',
        chatStatus: 'active',
      });
    }
  };

  const renderRequestCard = ({ item }: { item: IncomingAdoptionRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.cardHeader}>
        <View style={styles.dogInfo}>
          <Image source={{ uri: item.dog_details.photoURLs[0] }} style={styles.dogImage} />
          <View style={styles.dogDetails}>
            <Text style={styles.dogName}>{item.dog_details.name}</Text>
            <Text style={styles.dogBreed}>{item.dog_details.breed}</Text>
            <Text style={styles.requestDate}>
              Applied: {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, styles[`status${item.status}`]]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
      </View>

      <View style={styles.adopterInfo}>
        <Image source={{ uri: item.adopter_details.iconUrl }} style={styles.adopterImage} />
        <View style={styles.adopterDetails}>
          <Text style={styles.adopterName}>{item.adopter_details.adopterName}</Text>
          <Text style={styles.adopterEmail}>{item.adopter_details.email}</Text>
          <Text style={styles.adopterContact}>{item.adopter_details.contact}</Text>
        </View>
        <TouchableOpacity 
          style={styles.viewProfileButton}
          onPress={() => handleViewAdopterProfile(item.adopter_details)}
        >
          <Text style={styles.viewProfileText}>View Profile</Text>
        </TouchableOpacity>
      </View>

      {item.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.rejectButton}
            onPress={() => handleRejectRequest(item)}
          >
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.approveButtonWrapper}
            onPress={() => handleApproveRequest(item)}
          >
            <LinearGradient
              colors={['#4CAF50', '#45A049']}
              style={styles.approveButton}
            >
              <Text style={styles.approveButtonText}>Approve</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'approved' && item.chatid && (
        <TouchableOpacity 
          style={styles.chatButtonWrapper}
          onPress={() => handleOpenChat(item)}
        >
          <LinearGradient
            colors={['#2196F3', '#1976D2']}
            style={styles.chatButton}
          >
            <Text style={styles.chatButtonText}>Open Chat</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F48B7B" />
        <Text style={styles.loadingText}>Loading requests...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchIncomingRequests}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        ListHeaderComponent={
          <>
            <AppHeader
              leftComponent={<BackButton onPress={() => navigation.goBack()} />}
            />
            <Text style={styles.pageTitle}>Incoming Adoption Requests</Text>
          </>
        }
        data={requests}
        keyExtractor={(item) => item.requestId}
        renderItem={renderRequestCard}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No adoption requests yet.</Text>
          </View>
        }
        contentContainerStyle={requests.length === 0 ? styles.flatListEmptyContent : styles.flatListContent}
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
    backgroundColor: '#f0f2f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#F48B7B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  flatListContent: {
    paddingBottom: 20,
  },
  flatListEmptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#F7B781',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
  requestCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  dogInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  dogImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  dogDetails: {
    flex: 1,
  },
  dogName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dogBreed: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  requestDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statuspending: {
    backgroundColor: '#FFF3CD',
  },
  statusapproved: {
    backgroundColor: '#D4EDDA',
  },
  statusrejected: {
    backgroundColor: '#F8D7DA',
  },
  statuswithdrawn: {
    backgroundColor: '#E2E3E5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  adopterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  adopterImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  adopterDetails: {
    flex: 1,
  },
  adopterName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  adopterEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  adopterContact: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  viewProfileButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewProfileText: {
    color: '#1976D2',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  approveButtonWrapper: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  approveButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatButtonWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  chatButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default IncomingRequestsScreen;