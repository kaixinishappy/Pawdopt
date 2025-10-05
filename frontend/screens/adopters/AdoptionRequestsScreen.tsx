import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { Dog, RootStackParamList } from '../../App';
import { AdoptionRequest, getAdoptionRequests } from '../../services/RequestService';
import { getDogsByIds } from '../../src/api';
import { AppHeader } from '../../components/layout';
import { LoadingSpinner, Button } from '../../components/ui';
import { RequestCard } from '../../components/domain';
import { colors, globalStyles } from '../../components/styles/GlobalStyles';
import { BackButton } from '../../components/ui/Button';

// Define the new interface for a combined request and dog object
interface FullAdoptionRequest extends AdoptionRequest {
  dog_details: Dog;
}

type AdoptionRequestsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdoptionRequests'>;
type AdoptionRequestsScreenRouteProp = RouteProp<RootStackParamList, 'AdoptionRequests'>;

interface AdoptionRequestsScreenProps {
  navigation: AdoptionRequestsScreenNavigationProp;
  route: AdoptionRequestsScreenRouteProp;
}

const AdoptionRequestsScreen: React.FC<AdoptionRequestsScreenProps> = ({ navigation }) => {
  const [requests, setRequests] = useState<FullAdoptionRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Step 1: Fetch the basic adoption requests
      const requestsFromApi = await getAdoptionRequests();
      console.log("requestsFromApi: ", requestsFromApi);

      if (requestsFromApi.length === 0) {
        setRequests([]);
        return;
      }

      // Step 2: Get a list of all unique dog IDs from the requests
      const dogsInfo = requestsFromApi.map(req => ({
        dogId: req.dogId,
        dogCreatedAt: req.dogCreatedAt
      }));      
      console.log("dogsInfo: ", dogsInfo);
      // Step 3: Fetch the full dog details using those IDs
      const fetchedDogs = await getDogsByIds(dogsInfo);
      console.log("fetchedDogs: ", fetchedDogs);

      // Step 4: Combine the requests with the fetched dog details
      const combinedRequests: FullAdoptionRequest[] = requestsFromApi.map(req => {
        const dogDetails = fetchedDogs.find(dog => dog.dog_id === req.dogId);
        // It's possible a dog was deleted, so we'll check if dogDetails exists.
        if (!dogDetails) {
          console.log(`No dog details found for dogId: ${req.dogId}`);
          return null;
        }

        return { ...req, dog_details: dogDetails };
      }).filter(Boolean) as FullAdoptionRequest[]; // Filter out any nulls
      console.log("combinedRequests: ", combinedRequests);
      setRequests(combinedRequests);

    } catch (err) {
      console.error("Failed to load requests:", err);
      setError("Failed to load adoption requests. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleWithdrawRequest = async (requestId: string) => {
    Alert.alert(
      "Withdraw Request",
      "Are you sure you want to withdraw this adoption request? This will remove your interest in this dog.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: async () => {
            try {
              // Update the request status locally
              setRequests(prev =>
                prev.map(req => req.requestId === requestId ? { ...req, status: 'withdrawn' } : req)
              );
              Alert.alert("Success", "Request withdrawn successfully.");
            } catch (error) {
              Alert.alert("Error", "Failed to withdraw request. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleRemoveRequest = async (requestId: string) => {
    Alert.alert(
      "Remove from List",
      "Are you sure you want to remove this request from your list?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          onPress: async () => {
            try {
              setRequests(prev => prev.filter(req => req.requestId !== requestId));
              Alert.alert("Success", "Request removed from list.");
            } catch (error) {
              Alert.alert("Error", "Failed to remove request. Please try again.");
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LoadingSpinner size="large" color={colors.red} />
        <Text style={styles.loadingText}>Loading requests...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color={colors.red} />
        <Text style={styles.errorText}>{error}</Text>
        <Button
          title="Retry"
          onPress={fetchRequests}
          variant="primary"
          style={styles.retryButton}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        ListHeaderComponent={
          <>
            <AppHeader 
              leftComponent={
                <BackButton
                  onPress={() => navigation.goBack()}
                />
              } 
            />
            <Text style={styles.pageTitle}>My Adoption Requests</Text>
            <Text style={styles.subtitle}>Track your interest in dogs and see their status</Text>
          </>
        }
        data={requests}
        keyExtractor={(item) => item.requestId}
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            onWithdrawRequest={handleWithdrawRequest}
            onRemoveRequest={handleRemoveRequest}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={80} color={colors.grey} />
            <Text style={styles.emptyTitle}>No Adoption Requests Yet</Text>
            <Text style={styles.emptyText}>You haven't swiped right on any dogs yet. Start browsing to find your perfect companion!</Text>
            <Button
              title="Browse Dogs"
              onPress={() => navigation.navigate('AdopterDashboard')}
              variant="primary"
              style={styles.browseButton}
            />
          </View>
        }
        contentContainerStyle={requests.length === 0 ? styles.flatListEmptyContent : styles.flatListContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: colors.white, 
    padding: 20 
  },
  errorText: { 
    fontSize: 16, 
    color: colors.red, 
    textAlign: 'center', 
    marginVertical: 16 
  },
  retryButton: {
    marginTop: 10,
  },
  backButton: {
    padding: 8,
  },
  flatListContent: { 
    paddingBottom: 20,
    ...globalStyles.shadowStyle,
  },
  flatListEmptyContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  pageTitle: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: colors.darkGrey, 
    textAlign: 'center', 
    marginTop: 20, 
    marginBottom: 8 
  },
  subtitle: {
    fontSize: 16,
    color: colors.grey,
    textAlign: 'center',
    marginBottom: 20,
    marginHorizontal: 20,
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 40 
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.darkGrey,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  emptyText: { 
    fontSize: 16, 
    color: colors.grey, 
    textAlign: 'center', 
    lineHeight: 24,
    marginBottom: 30 
  },
  browseButton: {
    marginTop: 10,
  },
});

export default AdoptionRequestsScreen;