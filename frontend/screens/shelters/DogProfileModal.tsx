import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, ScrollView, Alert, Dimensions } from 'react-native';
import { Dog } from '../../App';

interface DogProfileModalProps {
  visible: boolean;
  dog: Dog | null;  
  onClose: () => void;
  onEdit?: (dog: Dog) => void;
  onDelete?: (dog: Dog) => void;
}

const DogProfileModal: React.FC<DogProfileModalProps> = ({ 
  visible, 
  dog, 
  onClose, 
  onEdit, 
  onDelete 
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const screenWidth = Dimensions.get('window').width;
  const handleEdit = () => {
    if (dog && onEdit) {
      onClose();
      onEdit(dog);
    } else {
      onClose();
      Alert.alert('Edit Dog', 'Edit functionality coming soon!');
    }
  };

  const handleDelete = () => {
    if (!dog) return;
    
    Alert.alert(
      'Delete Dog',
      `Are you sure you want to remove ${dog.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            if (onDelete) {
              onDelete(dog);
            } else {
              Alert.alert('Deleted', `${dog.name} has been removed.`);
            }
            onClose();
          }
        }
      ]
    );
  };

  if (!dog) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            {/* Dog image gallery */}
            {dog.photoURLs && dog.photoURLs.length > 0 && (
              <View style={styles.imageGalleryContainer}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / (screenWidth * 0.9 - 40));
                    setCurrentImageIndex(index);
                  }}
                  style={styles.imageScrollView}
                >
                  {dog.photoURLs.map((url, index) => (
                    <Image 
                      key={index}
                      source={{ uri: url }} 
                      style={[styles.modalDogImage, { width: screenWidth * 0.9 - 40 }]} 
                    />
                  ))}
                </ScrollView>
                
                {/* Image indicators */}
                {dog.photoURLs.length > 1 && (
                  <View style={styles.imageIndicators}>
                    {dog.photoURLs.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.indicator,
                          index === currentImageIndex ? styles.activeIndicator : styles.inactiveIndicator
                        ]}
                      />
                    ))}
                  </View>
                )}
                
                {/* Image counter */}
                {dog.photoURLs.length > 1 && (
                  <View style={styles.imageCounter}>
                    <Text style={styles.imageCounterText}>
                      {currentImageIndex + 1} / {dog.photoURLs.length}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Dog details */}
            <Text style={styles.modalDogName}>{dog.name}</Text>
            <Text style={styles.modalDogBreedAge}>{dog.breed}, {dog.age} years old</Text>
            <Text style={styles.modalDogGender}>Gender: {dog.gender}</Text>
            <Text style={styles.modalDogStatus}>Status: {dog.status}</Text>
            
            {dog.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionTitle}>Description:</Text>
                <Text style={styles.modalDogDescription}>{dog.description}</Text>
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <Text style={styles.editButtonText}>Edit Dog</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteButtonText}>Delete Dog</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  modalDogImage: {
    height: 250,
    borderRadius: 15,
    marginBottom: 20,
    resizeMode: 'cover',
  },
  imageGalleryContainer: {
    marginBottom: 20,
  },
  imageScrollView: {
    borderRadius: 15,
  },
  imageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#F7B781',
  },
  inactiveIndicator: {
    backgroundColor: '#ccc',
  },
  imageCounter: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalDogName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalDogBreedAge: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDogGender: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDogStatus: {
    fontSize: 16,
    color: '#888',
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  descriptionContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalDogDescription: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
    textAlign: 'justify',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  editButton: {
    backgroundColor: '#F7B781',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 0.45,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 0.45,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default DogProfileModal;
