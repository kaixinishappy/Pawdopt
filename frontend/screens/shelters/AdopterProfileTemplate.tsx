import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { RootStackParamList } from '../../App';
import { AppHeader, BackButton } from '../../components';

type AdopterProfileTemplateRouteProp = RouteProp<RootStackParamList, 'AdopterProfileTemplate'>;
type AdopterProfileTemplateNavigationProp = NavigationProp<RootStackParamList, 'AdopterProfileTemplate'>;

interface AdopterProfileTemplateProps {
  navigation: AdopterProfileTemplateNavigationProp;
  route: AdopterProfileTemplateRouteProp;
}

const AdopterProfileTemplate: React.FC<AdopterProfileTemplateProps> = ({ navigation, route }) => {
  const { adopter } = route.params;

  const calculateAge = (dateOfBirth?: string): string => {
    if (!dateOfBirth) return 'Not specified';
    const birth = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return `${age - 1} years old`;
    }
    return `${age} years old`;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        leftComponent={<BackButton onPress={() => navigation.goBack()} />}
      />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.pageTitle}>Adopter Profile</Text>
        
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image source={{ uri: adopter.iconUrl }} style={styles.profileImage} />
          <View style={styles.profileInfo}>
            <Text style={styles.adopterName}>{adopter.adopterName}</Text>
            {/* <Text style={styles.ageText}>{calculateAge(adopter.dateOfBirth)}</Text>
            {adopter.gender && (
              <Text style={styles.genderText}>{adopter.gender}</Text>
            )} */}
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color="#666" />
            <Text style={styles.infoText}>{adopter.email}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#666" />
            <Text style={styles.infoText}>{adopter.contact}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              {typeof adopter.address === 'object' ? adopter.address.formatted : adopter.address}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="map-outline" size={20} color="#666" />
            <Text style={styles.infoText}>Postcode: {adopter.postcode}</Text>
          </View>
        </View>

        {/* Personal Information */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          {adopter.dateOfBirth && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.infoText}>Born: {formatDate(adopter.dateOfBirth)}</Text>
            </View>
          )}
          
          {adopter.gender && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#666" />
              <Text style={styles.infoText}>Gender: {adopter.gender}</Text>
            </View>
          )}
        </View> */}

        {/* Experience with Pets */}
        {adopter.experience && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience with Pets</Text>
            <View style={styles.experienceContainer}>
              <Text style={styles.experienceText}>{adopter.experience}</Text>
            </View>
          </View>
        )}        
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 30,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#F7B781',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 20,
  },
  profileInfo: {
    flex: 1,
  },
  adopterName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  ageText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  genderText: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 5,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  experienceContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  experienceText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  actionButtons: {
    margin: 15,
    marginTop: 5,
  },
  contactButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default AdopterProfileTemplate;