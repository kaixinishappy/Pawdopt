import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import types from your actual interfaces
import { Dog } from '../../App';
import { AdoptionRequest } from '../../services/RequestService';
import { Button, Card } from '../ui';
import { colors, globalStyles } from '../styles/GlobalStyles';

// Use the AdoptionRequest type from RequestService
interface FullAdoptionRequest extends AdoptionRequest {
  dog_details: Dog;
}

interface RequestCardProps {
  request: FullAdoptionRequest;
  onWithdrawRequest: (requestId: string) => void;
  onRemoveRequest: (requestId: string) => void;
}

const RequestCard: React.FC<RequestCardProps> = ({ request, onWithdrawRequest, onRemoveRequest }) => {
  const { dog_details, status, requestId } = request;

  const getStatusColor = (currentStatus: string) => {
    switch (currentStatus) {
      case 'approved':
        return colors.brightGreen;
      case 'rejected':
        return colors.red;
      case 'withdrawn':
        return colors.grey;
      case 'pending':
      default:
        return colors.orange;
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.imageContainer}>
        {dog_details.photoURLs && dog_details.photoURLs.length > 0 ? (
          <Image source={{ uri: dog_details.photoURLs[0] }} style={styles.dogImage} />
        ) : (
          <View style={styles.noImageIcon}>
            <Ionicons name="image-outline" size={50} color={colors.grey} />
            <Text style={styles.noImageText}>No Image</Text>
          </View>
        )}
      </View>
      <View style={styles.detailsContainer}>
        <Text style={styles.dogName}>{dog_details.name}</Text>
        <Text style={styles.dogInfo}>{dog_details.breed} | {dog_details.gender}</Text>
        <Text style={styles.dogInfo}>Age: {dog_details.age} years</Text>
        <Text style={styles.dogInfo}>Size: {dog_details.size}</Text>
        <Text style={styles.dogInfo}>Color: {dog_details.color}</Text>
        <Text style={styles.dogInfo}>Description: {dog_details.description}</Text>
        <Text style={[styles.statusText, { color: getStatusColor(status) }]}>Status: {status}</Text>
        
        <View style={styles.actionsContainer}>
          {status === 'approved' && (
            <View style={styles.approvedContainer}>
              <Ionicons name="checkmark-circle" size={20} color={colors.brightGreen} />
              <Text style={styles.approvedText}>Adoption Approved!</Text>
            </View>
          )}
          {status === 'pending' && (
            <Button
              title="Withdraw"
              variant="outline"
              onPress={() => onWithdrawRequest(requestId)}
              style={styles.actionButton}
            />
          )}
          {(status === 'rejected' || status === 'withdrawn') && ( 
            <Button
              title="Remove"
              variant="secondary"
              onPress={() => onRemoveRequest(requestId)}
              style={styles.actionButton}
            />
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { 
    flexDirection: 'row', 
    borderRadius: 15, 
    marginVertical: 10, 
    marginHorizontal: 20, 
    overflow: 'hidden', 
    alignItems: 'center',
  },
  imageContainer: { 
    width: 120, 
    height: 170, 
    borderRadius: 15, 
    overflow: 'hidden', 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: colors.lightGrey 
  },
  dogImage: { 
    width: '100%', 
    height: '100%', 
    resizeMode: 'cover' 
  },
  noImageIcon: { 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  noImageText: {
    color: colors.grey,
    fontSize: 12,
  },
  detailsContainer: { 
    flex: 1, 
    padding: 15, 
    justifyContent: 'space-between' 
  },
  dogName: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: colors.darkGrey, 
    marginBottom: 5 
  },
  dogInfo: { 
    fontSize: 14, 
    color: colors.grey, 
    marginBottom: 3 
  },
  statusText: { 
    fontSize: 15, 
    fontWeight: 'bold', 
    marginTop: 8 
  },
  actionsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    marginTop: 10,
    alignItems: 'center',
  },
  approvedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGrey,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  approvedText: {
    color: colors.brightGreen,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  actionButton: {
    paddingHorizontal: 15,
  },
  buttonWrapper: { 
    borderRadius: 20, 
    overflow: 'hidden', 
    marginLeft: 10 
  },
  buttonText: { 
    color: colors.white, 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
});

export default RequestCard;
