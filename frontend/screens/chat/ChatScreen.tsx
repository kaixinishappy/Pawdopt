import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, ActivityIndicator, Alert, Image, TouchableOpacity, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useNavigation, NavigationProp, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../App';
import { AppHeader, BackButton } from '../../components';
import { Ionicons } from '@expo/vector-icons';
import { client } from '../../apolloClient';
import { CREATE_MESSAGE, UPDATE_MESSAGE, LIST_MESSAGES, ON_NEW_MESSAGE, getDogProfileById } from '../../src/api'
import { useMutation,  useSubscription } from '@apollo/client';
import { Dog } from '../../App';
import { getIdToken } from '../../services/CognitoService';

const { width } = Dimensions.get('window');

// Define Message interface based on your DynamoDB Messages table
interface Message {
  messageId: string;
  chatId: string;
  senderId: string;
  receiverId?: string;
  text: string;
  sentAt: string;
  readStatus: boolean;
}

// Mock Data for Messages (for chat-2, the pending request)
// const mockMessages: Message[] = [
//   {
//     messageId: 'msg-1',
//     chatId: 'chat-1',
//     senderId: 'mock-adopter-id-1',
//     receiverId: 'mock-shelter-id-1',
//     content: 'Hi Happy Paws, I\'m very interested in Bella!',
//     sentAt: '2025-07-29T09:58:00Z',
//     read: true,
//   },
//   {
//     messageId: 'msg-2',
//     chatId: 'chat-1',
//     senderId: 'mock-shelter-id-1',
//     receiverId: 'mock-adopter-id-1',
//     content: 'Hi Jane! Great to hear. Bella is a lovely dog.',
//     sentAt: '2025-07-29T10:00:00Z',
//     read: false,
//   },
//   {
//     messageId: 'msg-3', // This would be the "system" message for a new request
//     chatId: 'chat-2',
//     senderId: 'system', // Special senderId for system messages
//     receiverId: 'mock-shelter-id-1', // Or the shelterId
//     content: 'John Smith has sent a new adoption request for Buddy. Review their profile to proceed.',
//     sentAt: '2025-07-30T11:30:00Z',
//     read: false,
//   },
// ];


type ChatScreenRouteProp = RouteProp<RootStackParamList, 'ChatScreen'>;
type ChatScreenNavigationProp = NavigationProp<RootStackParamList, 'ChatScreen'>;

const ChatScreen: React.FC = () => {
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const route = useRoute<ChatScreenRouteProp>();
  const { chatId, dogId, dogName, dogCreatedAt, senderId, receipientId, role, chatStatus: initialChatStatus } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatStatus, setChatStatus] = useState(initialChatStatus); // Mutable chat status
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [dogDetails, setDogDetails] = useState<Dog | null>(null);
  const [dogLoading, setDogLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { data: subData, error: subError } = useSubscription(ON_NEW_MESSAGE, {
    variables: { chat_id: chatId },
  });
  const [updateMessage] = useMutation(UPDATE_MESSAGE);

  function readMessage(msg: Message) {
    console.log("is reading messages")
    try {
      if (msg.senderId !== currentUserId && !(msg.readStatus)) {
        updateMessage({
          variables: {
            input: {
              chat_id: msg.chatId,
              message_id: msg.messageId,
              sent_at: msg.sentAt,
              read_status: true
            }
          }
        })
        console.log("Should have read messages")
      }
    } catch (error) {
        console.log("Read status update failed error:", error)
    };
  }


  // Whenever a new message arrives via subscription, push it into state
  useEffect(() => {
    if (subData?.onCreateMessage) {
      console.log("Subscription message arrived")
      setMessages(prev => {
        const incoming = subData.onCreateMessage;
        
        // Create a new object to avoid read-only property issues
        const newMessage: Message = {
          messageId: incoming.message_id,
          chatId: incoming.chat_id,
          senderId: incoming.sender_id,
          // receiverId: incoming.receiver_Id,
          text: incoming.text,
          sentAt: incoming.sent_at,
          readStatus: incoming.read_status
        };

        console.log("New message: ", newMessage)
        console.log("Current user ID: ", currentUserId)
        
        readMessage(newMessage);
        
        const exists = prev.some(msg => msg.messageId === newMessage.messageId);
        return exists ? prev : [...prev, newMessage];
      });
    }
  }, [subData]);

  // Mock current user ID (replace with actual Cognito user ID)
  // const currentUserId = role === 'adopter' ? 'mock-adopter-id-1' : 'mock-shelter-id-1';
  const currentUserId = senderId

  // Simulate fetching messages for the current chat
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
    // const filteredMessages = mockMessages.filter(msg => msg.chatId === chatId);

    try {
      const { data } = await client.query({
        query: LIST_MESSAGES,
        variables: {
          filter: { chat_id: {eq: chatId} },
          limit: 50,
          nextToken: nextToken || null,
        },
        fetchPolicy: 'network-only',
      })

      const filteredMessages = data.listMessages.items;
      console.log("filteredMessages: ", filteredMessages);
      console.log("messages:", messages)
      
      // Create new objects to avoid read-only property issues
      const mappedMessages = filteredMessages.map((msg: any) => ({
        messageId: msg.messageId,
        chatId: msg.chatId,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        text: msg.text,
        sentAt: msg.sentAt,
        readStatus: msg.readStatus
      }));

      console.log("Current user id:", currentUserId)
      mappedMessages.filter((msg: Message) => msg.senderId !== currentUserId && !msg.readStatus)
                    .map((msg: Message) => readMessage(msg))

      // Sort messages chronologically
      mappedMessages.sort((a: any, b: any) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
      
      setMessages(prev => {
        const newMessages = mappedMessages.filter(
          (fm: Message) => !prev.some(pm => pm.messageId === fm.messageId)
        );
        return [...prev, ...newMessages];
      });

    } catch (error) {
      console.error('Error fetching message:', error);
    } finally {
      setLoading(false);
      // Scroll to bottom after messages load
      // setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }

  }, [chatId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Fetch dog details
  useEffect(() => {
    const fetchDogDetails = async () => {
      if (!dogId || !dogCreatedAt) return;
      
      setDogLoading(true);
      try {
        const token = await getIdToken();
        if (token) {
          const dog = await getDogProfileById(dogId, dogCreatedAt, token);
          setDogDetails(dog);
        }
      } catch (error) {
        console.error('Failed to fetch dog details:', error);
      } finally {
        setDogLoading(false);
      }
    };

    fetchDogDetails();
  }, [dogId, dogCreatedAt]);

  const [createMessage] = useMutation(CREATE_MESSAGE);


  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageToSend = {
      messageId: `msg-${Date.now()}`,
      chatId: chatId,
      senderId: currentUserId,
      // receiverId: role === 'adopter' ? receipientId : senderId,
      text: newMessage.trim(),
      sentAt: new Date().toISOString(),
      readStatus: false, // Will be true when other party reads
    };

    setMessages(prevMessages => [...prevMessages, messageToSend]);
    setNewMessage('');
    // Send message to backend (Messages table)
      try {
        const { data } = await createMessage({
          variables: {
            input: {
              message_id: messageToSend.messageId,
              chat_id: messageToSend.chatId,
              sender_id: messageToSend.senderId,
              text: messageToSend.text,
              sent_at: messageToSend.sentAt,
              read_status: messageToSend.readStatus
            }
          },
        });

        setTimeout(
          () => flatListRef.current?.scrollToEnd({ animated: true }),
          100
        );
      } catch (error) {
        console.error("Error sending message:", error);
      }

    // TODO: Update Chats table (lastMessageAt, lastMessagePreview)
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleReviewProfile = () => {
    // Navigate to the adopter's profile screen
    // TODO: Make sure 'AdopterProfileDetail' exists in RootStackParamList
    Alert.alert('Review Profile', `Navigating to ${role === 'adopter' ? senderId : receipientId}'s profile (ID: ${role === 'adopter' ? senderId : receipientId})`);
    // navigation.navigate('AdopterProfileDetail', { adopterId: role === 'adopter' ? senderId : receipientId });
  };

  const handleConfirmRequest = () => {
    Alert.alert(
      "Confirm Adoption",
      `Are you sure you want to confirm the adoption request for ${dogName} with ${role === 'adopter' ? senderId : receipientId}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: () => {
            setChatStatus('active'); // Update local state
            // TODO: Call backend API to update Request status to 'approved' and Chat status to 'active'
            // Backend should also send a system message like "Your request has been approved!"
            Alert.alert('Success', 'Request confirmed! You can now chat.');
            // Optionally, send an initial message from shelter
            const confirmationMessage: Message = {
              messageId: `msg-${Date.now()}-confirm`,
              chatId: chatId,
              senderId: currentUserId, // Shelter sending
              receiverId: role === 'adopter' ? receipientId : senderId, // Adopter receiving
              text: `Great news! Your adoption request for ${dogName} has been approved. Let's chat!`,
              sentAt: new Date().toISOString(),
              readStatus: false,
            };
            setMessages(prevMessages => [...prevMessages, confirmationMessage]);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          }
        }
      ]
    );
  };

  const handleIgnoreRequest = () => {
    Alert.alert(
      "Ignore Request",
      `Are you sure you want to ignore the request for ${dogName} from ${role === 'adopter' ? senderId : receipientId}? This will close the chat.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Ignore", onPress: () => {
            setChatStatus('inactive'); // Update local state
            // TODO: Call backend API to update Request status to 'rejected' and Chat status to 'rejected'/'closed'
            Alert.alert('Request Ignored', 'This chat has been closed.');
            // Optionally, send a system message or navigate back
            const rejectionMessage: Message = {
              messageId: `msg-${Date.now()}-reject`,
              chatId: chatId,
              senderId: currentUserId, // Shelter sending
              receiverId: role === 'adopter' ? receipientId : senderId, // Adopter receiving
              text: `Your request for ${dogName} has been declined.`,
              sentAt: new Date().toISOString(),
              readStatus: false,
            };
            setMessages(prevMessages => [...prevMessages, rejectionMessage]);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          }
        }
      ]
    );
  };

  const handleDogProfilePress = () => {
    if (dogDetails) {
      // Navigate to dog profile detail screen
      navigation.navigate('DogProfileDetail', {
        dogId: dogId,
        dogCreatedAt: dogCreatedAt,
        distance: 0, // Default distance since it's not relevant in chat context
        role: role,
        fromChat: true,
        adopterId: role === 'adopter' ? senderId : receipientId 
      });
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.senderId === currentUserId;
    const isSystemMessage = item.senderId === 'system';
    // console.log('messages: ', messages)

    if (isSystemMessage) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.text}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.otherMessage]}>
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.messageTimeSmall}>{new Date(item.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        leftComponent={
          // Use the BackButton here
          <BackButton
            onPress={() => navigation.goBack()}
          />
        }
      />

      {/* Dog Info Block */}
      {dogLoading ? (
        <View style={styles.dogInfoBlock}>
          <View style={styles.dogInfoContainer}>
            <View style={[styles.dogInfoImage, styles.dogInfoImagePlaceholder]} />
            <View style={styles.dogInfoTextContainer}>
              <View style={[styles.dogInfoNamePlaceholder, styles.placeholder]} />
              <View style={[styles.dogInfoBreedPlaceholder, styles.placeholder]} />
              <View style={[styles.dogInfoAgePlaceholder, styles.placeholder]} />
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ddd" />
          </View>
        </View>
      ) : dogDetails ? (
        <TouchableOpacity style={styles.dogInfoBlock} onPress={handleDogProfilePress}>
          <View style={styles.dogInfoContainer}>
            <Image 
              source={
                dogDetails.photoURLs && dogDetails.photoURLs.length > 0 
                  ? { uri: dogDetails.photoURLs[0] } 
                  : require('../../assets/pawdopt_logo.png')
              }
              style={styles.dogInfoImage}
            />
            <View style={styles.dogInfoTextContainer}>
              <Text style={styles.dogInfoName}>{dogDetails.name}</Text>
              <Text style={styles.dogInfoBreed}>{dogDetails.breed}</Text>
              <Text style={styles.dogInfoAge}>{dogDetails.age} years old • {dogDetails.gender}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </View>
        </TouchableOpacity>
      ) : null}

      {/* Dog Adopted Banner - Show when chat is inactive */}
      {(chatStatus === 'inactive') && (
        <View style={styles.adoptedBanner}>
          <View style={styles.adoptedBannerContent}>
            <Ionicons name="heart" size={24} color="#FF6B6B" style={styles.adoptedIcon} />
            <Text style={styles.adoptedBannerTitle}>Dog Adopted! 🎉</Text>
            <Text style={styles.adoptedBannerText}>
              {dogName} has found a loving home. This chat is now disabled.
            </Text>
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F7B781" />
          </View>
        ) : (
          <>
            {/* Conditional "New Adoption Request" Banner for Shelters */}
            {role === 'shelter' && initialChatStatus === 'pending_request' && (
              <View style={styles.requestBanner}>
                <Text style={styles.requestBannerTitle}>New Adoption Request!</Text>
                <Text style={styles.requestBannerText}>
                  {(role === 'shelter' ? senderId : receipientId)} is interested in {dogName}.
                </Text>
                <View style={styles.requestBannerButtons}>
                  <TouchableOpacity style={styles.reviewProfileButton} onPress={handleReviewProfile}>
                    <Text style={styles.reviewProfileButtonText}>Review Profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmRequest}>
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.ignoreButton} onPress={handleIgnoreRequest}>
                    <Text style={styles.ignoreButtonText}>Ignore</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.messageId}
              renderItem={renderMessage}
              contentContainerStyle={styles.messageListContent}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {/* Message Input Area - Only show if chat is active */}
            {chatStatus === 'active' ? (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Type a message..."
                  placeholderTextColor="#999"
                  value={newMessage}
                  onChangeText={setNewMessage}
                  multiline
                />
                <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
                  <Ionicons name="send" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.chatClosedMessageContainer}>
                <Text style={styles.chatClosedMessageText}>
                  {chatStatus === 'pending_request' 
                    ? 'Waiting for shelter to respond to your request.'
                    : chatStatus === 'inactive'
                    ? 'This chat is disabled because the dog has been adopted.'
                    : 'This chat is no longer active.'}
                </Text>
              </View>
            )}
          </>
        )}
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  dogInfoBlock: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dogInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  dogInfoImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  dogInfoTextContainer: {
    flex: 1,
  },
  dogInfoName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  dogInfoBreed: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  dogInfoAge: {
    fontSize: 12,
    color: '#888',
  },
  dogInfoImagePlaceholder: {
    backgroundColor: '#e0e0e0',
  },
  placeholder: {
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 4,
  },
  dogInfoNamePlaceholder: {
    height: 20,
    width: '60%',
  },
  dogInfoBreedPlaceholder: {
    height: 16,
    width: '40%',
  },
  dogInfoAgePlaceholder: {
    height: 14,
    width: '50%',
  },
  adoptedBanner: {
    backgroundColor: '#FFF0F5', // Light pink background
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB6C1',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  adoptedBannerContent: {
    padding: 16,
    alignItems: 'center',
  },
  adoptedIcon: {
    marginBottom: 8,
  },
  adoptedBannerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 4,
    textAlign: 'center',
  },
  adoptedBannerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  backButton: {
    padding: 8,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  messageListContent: {
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'flex-end', // Stick messages to the bottom
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 15,
    marginBottom: 8,
    flexDirection: 'column', // To stack text and time
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6', // Light green for sender
    borderBottomRightRadius: 2,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff', // White for receiver
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  messageTimeSmall: {
    fontSize: 10,
    color: '#888',
    alignSelf: 'flex-end',
    marginTop: 3,
  },
  systemMessageContainer: {
    alignSelf: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginVertical: 10,
    maxWidth: '80%',
  },
  systemMessageText: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8, // Adjust for iOS keyboard safe area
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100, // Prevent input from growing too large
  },
  sendButton: {
    backgroundColor: '#F7B781',
    borderRadius: 25,
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  // Request Banner Styles (for shelters)
  requestBanner: {
    backgroundColor: '#FFDDC1', // Light orange background
    padding: 15,
    marginHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  requestBannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6F61',
    marginBottom: 5,
  },
  requestBannerText: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginBottom: 10,
  },
  requestBannerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
  },
  reviewProfileButton: {
    backgroundColor: '#eee',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  reviewProfileButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: '#4CAF50', // Green for confirm
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  ignoreButton: {
    backgroundColor: '#F44336', // Red for ignore
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  ignoreButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  chatClosedMessageContainer: {
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0e0e0',
    marginHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  chatClosedMessageText: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
  },
});

export default ChatScreen;