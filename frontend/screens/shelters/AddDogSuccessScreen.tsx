import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList} from '../../App';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';

type AddDogDescriptionRouteProp = RouteProp<RootStackParamList, 'AddDogSuccess'>;

const AddDogSuccessScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<AddDogDescriptionRouteProp>();
  return (
    <View style={styles.container}>
      {/* Back Arrow */}
      <View style={styles.centerContent}>
        {/* Heart Paw Icon */}
        <Image
          source={require('../../assets/pawdopt_logo.png')}
          style={styles.heartIcon}
          resizeMode="contain"
        />
        <Text style={styles.successText}>Dog has been added!</Text>
      </View>
      <TouchableOpacity style={styles.buttonWrapper} activeOpacity={0.8} onPress={() => navigation.navigate('ShelterDashboard', {})}> 
        <LinearGradient
          colors={["#F7C98B", "#F7B781"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.buttonGradient}
        >
          <Text style={styles.buttonText}>RETURN TO PROFILE</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingTop: 40,
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartIcon: {
    width: 60,
    height: 60,
    marginBottom: 18,
  },
  successText: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  buttonWrapper: {
    width: '100%',
    marginBottom: 40,
    borderRadius: 22,
    overflow: 'hidden',
  },
  buttonGradient: {
    width: '100%',
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
});

export default AddDogSuccessScreen;
