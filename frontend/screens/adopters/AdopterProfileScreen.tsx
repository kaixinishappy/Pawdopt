import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect, NavigationProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { signOut, getCurrentUserAttributes, getAccessToken } from '../../services/CognitoService';
import { AppHeader, AppFooter } from '../../components/layout';
import { LoadingSpinner, Button, Card } from '../../components/ui';
import { colors } from '../../components/styles/GlobalStyles';

// ===== CONSTANTS =====
const INITIAL_PROFILE_STATE = {
  adopterId: '',
  adopterName: '',
  email: '',
  contact: '',
  address: { formatted: '' },
  postcode: '',
  iconUrl: 'default-avatar-icon.jpg',
};

const INITIAL_PREFERENCES_STATE = {
  minAge: null,
  maxAge: null,
  size: [],
  color: [],
  preferredBreeds: [],
};

const PUBLIC_DEFAULT_IMAGE =
  'https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg';

const API_SIGNED_URL = 'https://1g53nof6f8.execute-api.eu-west-2.amazonaws.com/getSignedImageUrl';
const API_PREFERENCES = 'https://y2wy5m6frb.execute-api.eu-west-2.amazonaws.com/default/preferences';
const ICON_BUCKET = 'icon-images-uploads-2';

type AdopterProfile = typeof INITIAL_PROFILE_STATE;
type Preferences = typeof INITIAL_PREFERENCES_STATE;

type AdopterProfileScreenNavigationProp = NavigationProp<RootStackParamList, 'AdopterProfile'>;

const AdopterProfileScreen: React.FC = () => {
  const navigation = useNavigation<AdopterProfileScreenNavigationProp>();
  const [profile, setProfile] = useState<AdopterProfile>(INITIAL_PROFILE_STATE);
  const [preferences, setPreferences] = useState<Preferences>(INITIAL_PREFERENCES_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [signedIconUrl, setSignedIconUrl] = useState(PUBLIC_DEFAULT_IMAGE);

  // Fetch signed S3 URL
  const fetchSignedUrl = async (s3key: string) => {
    if (!s3key || s3key === 'default-avatar-icon.jpg') {
      setSignedIconUrl(PUBLIC_DEFAULT_IMAGE);
      return PUBLIC_DEFAULT_IMAGE;
    }
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('No access token found');

      const response = await fetch(API_SIGNED_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key: s3key, bucket: ICON_BUCKET }),
      });

      if (!response.ok) throw new Error(`Failed to fetch signed URL: ${response.status}`);

      const data = await response.json();
      return data.signedUrl;
    } catch (error) {
      console.error('Error fetching signed URL:', error);
      Alert.alert('Error', 'Failed to load profile image. Using default image.');
      return PUBLIC_DEFAULT_IMAGE;
    }
  };

  // Fetch adopter preferences
  const fetchPreferences = async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        console.error('No access token found for fetching preferences.');
        return;
      }
      const response = await fetch(API_PREFERENCES, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch preferences');

      const data = await response.json();
      setPreferences({
        minAge: data.minAge || 'Any',
        maxAge: data.maxAge || 'Any',
        size: Array.isArray(data.size) ? data.size : ['Any'],
        color: Array.isArray(data.color) ? data.color : ['Any'],
        preferredBreeds: Array.isArray(data.preferredBreeds) ? data.preferredBreeds : ['Any'],
      });
    } catch (error) {
      console.error('Error fetching preferences:', error);
      Alert.alert('Error', 'Failed to load preferences.');
    }
  };

  // Fetch all profile data
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const attributes = await getCurrentUserAttributes();
      if (!attributes) {
        console.log('No authenticated user found.');
        return;
      }
      const fetchedProfile: AdopterProfile = {
        adopterId: attributes.sub,
        adopterName: attributes.name,
        email: attributes.email,
        contact: attributes.phone_number,
        address: attributes.address,
        postcode: attributes['custom:postcode'],
        iconUrl: attributes['custom:iconURL'] || 'default-avatar-icon.jpg',
      };
      setProfile(fetchedProfile);

      const url = await fetchSignedUrl(fetchedProfile.iconUrl);
      setSignedIconUrl(url);

      await fetchPreferences();
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load profile data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAllData();
    }, [fetchAllData])
  );

  // Navigation handlers
  const handleEditProfile = () => navigation.navigate('EditAdopterProfile', { profile });
  const handleEditPreferences = () => navigation.navigate('EditAdopterPreference');
  const handleMyRequests = () => navigation.navigate('AdoptionRequests');

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: () => {
          signOut();
          navigation.navigate('Login');
        },
      },
    ]);
  };

  const goToProfile = () => {};
  const goToHome = () => navigation.navigate('AdopterDashboard');
  const goToChat = () => {
    if (profile.adopterId) {
      navigation.navigate('ChatListScreen', { role: 'adopter', userId: profile.adopterId });
    } else {
      Alert.alert('Error', 'User ID not found. Please log in again.');
    }
  };

  // UI States
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader />
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" color={colors.red} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile.adopterId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader />
        <View style={styles.loadingContainer}>
          <Text style={styles.noAuthText}>You are not logged in.</Text>
          <Button
            title="Go to Login"
            onPress={() => navigation.navigate('Login')}
            variant="primary"
          />
        </View>
      </SafeAreaView>
    );
  }

  // Main UI
  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile picture */}
        <View style={styles.profilePicContainer}>
          <View style={styles.profilePicWrapper}>
            <Image
              key={signedIconUrl}
              source={{ uri: signedIconUrl }}
              style={styles.profilePic}
              resizeMode="cover"
              onError={(e) => console.error('Image load failed:', e.nativeEvent.error)}
            />
          </View>
          <Text style={styles.name}>{profile.adopterName}</Text>
        </View>

        {/* Contact info */}
        <Card style={styles.infoSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="person" size={20} color={colors.red} />
              <Text style={styles.sectionTitle}>Contact Information</Text>
            </View>
            <TouchableOpacity onPress={handleEditProfile} style={styles.editIcon}>
              <Ionicons name="create-outline" size={24} color={colors.grey} />
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={16} color={colors.grey} />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Email:</Text> {profile.email}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={16} color={colors.grey} />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Contact:</Text> {profile.contact}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color={colors.grey} />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Address:</Text> {profile.address.formatted}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="map" size={16} color={colors.grey} />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Postcode:</Text> {profile.postcode}
            </Text>
          </View>
        </Card>

        {/* Preferences */}
        <Card style={styles.infoSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="heart" size={20} color={colors.red} />
              <Text style={styles.sectionTitle}>My Preferences</Text>
            </View>
            <TouchableOpacity onPress={handleEditPreferences} style={styles.editIcon}>
              <Ionicons name="create-outline" size={24} color={colors.grey} />
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time" size={16} color={colors.grey} />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Age Range:</Text> {preferences.minAge || 'Any'} -{' '}
              {preferences.maxAge || 'Any'} years
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="resize" size={16} color={colors.grey} />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Size:</Text> {preferences.size.join(', ') || 'Any'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="color-palette" size={16} color={colors.grey} />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Color:</Text> {preferences.color.join(', ') || 'Any'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="paw" size={16} color={colors.grey} />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Breeds:</Text> {preferences.preferredBreeds.join(', ') || 'Any'}
            </Text>
          </View>
        </Card>

        {/* Actions */}
        <Card style={styles.actionCard}>
          <TouchableOpacity style={styles.actionButton} onPress={handleMyRequests}>
            <Ionicons name="list-circle-outline" size={20} color={colors.darkGrey} />
            <Text style={styles.actionButtonText}>My Adoption Requests</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.actionCard} backgroundColor={colors.red}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.white} />
            <Text style={[styles.actionButtonText, { color: colors.white }]}>Logout</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>

      <AppFooter
        onPressProfile={goToProfile}
        onPressHome={goToHome}
        onPressChat={goToChat}
        activeScreen="profile"
      />
    </SafeAreaView>
  );
};

// ===== STYLES =====
const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: colors.white 
  },
  container: { 
    flexGrow: 1, 
    padding: 20, 
    alignItems: 'center', 
    paddingBottom: 80 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    fontSize: 18, 
    color: colors.grey, 
    marginTop: 16 
  },
  noAuthText: { 
    fontSize: 18, 
    color: colors.red, 
    textAlign: 'center', 
    marginBottom: 20 
  },
  profilePicContainer: { 
    alignItems: 'center', 
    marginBottom: 30, 
    marginTop: 20 
  },
  profilePicWrapper: {
    width: 150,
    height: 150,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.lightGrey,
  },
  profilePic: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 100 
  },
  name: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: colors.darkGrey, 
    textAlign: 'center', 
    marginTop: 10 
  },
  infoSection: {
    width: '100%',
    marginBottom: 20,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGrey,
    paddingBottom: 8,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: colors.darkGrey,
    marginLeft: 8,
  },
  editIcon: { 
    padding: 5 
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: { 
    fontSize: 16, 
    color: colors.grey, 
    marginLeft: 8,
    flex: 1,
  },
  infoLabel: { 
    fontWeight: 'bold', 
    color: colors.darkGrey 
  },
  actionCard: {
    width: '100%',
    marginBottom: 15,
    padding: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    width: '100%',
  },
  actionButtonText: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: colors.darkGrey, 
    marginLeft: 10 
  },
  logoutButtonStyle: {
    width: '100%',
    marginTop: 10,
  },
});

export default AdopterProfileScreen;