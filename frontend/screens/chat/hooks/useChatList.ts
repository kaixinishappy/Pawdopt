// hooks/useChatList.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import { LIST_ALL_MESSAGES, ON_CREATE_MESSAGE, ON_UPDATE_MESSAGE } from '../graphql/queries';
import { EnrichedChatData } from '../../../src/api';

interface Message {
  chat_id: string;
  sent_at: string;
  message_id: string;
  sender_id: string;
  text: string;
  read_status?: boolean;
}

interface ChatListHookProps {
  userRole: 'adopter' | 'shelter';
  userId: string;
  chatIds: string[]; // Array of chat IDs the user participates in
}

export const useChatList = ({ userRole, userId, chatIds }: ChatListHookProps) => {
  const [chats, setChats] = useState<EnrichedChatData[]>([]);
  const [loading, setLoading] = useState(true);
  const subscriptionsRef = useRef<{ [chatId: string]: any }>({});

  // Query all messages for the user's chats
  const { data: messagesData, loading: messagesLoading, refetch } = useQuery(LIST_ALL_MESSAGES, {
    variables: {
      limit: 1000, // Adjust based on your needs
    },
    fetchPolicy: 'cache-and-network',
    onCompleted: (data) => {
      if (data?.listMessages?.items) {
        processMessages(data.listMessages.items);
      }
    },
  });

  // Process messages to create chat list
  const processMessages = useCallback((messages: Message[]) => {
    const chatMap = new Map<string, {
      latestMessage: Message;
      unreadCount: number;
      messages: Message[];
    }>();

    // Filter messages for user's chats only
    const userMessages = messages.filter(msg => chatIds.includes(msg.chat_id));

    // Group messages by chat_id
    userMessages.forEach(message => {
      const chatId = message.chat_id;
      
      if (!chatMap.has(chatId)) {
        chatMap.set(chatId, {
          latestMessage: message,
          unreadCount: 0,
          messages: [message]
        });
      } else {
        const chatData = chatMap.get(chatId)!;
        chatData.messages.push(message);
        
        // Update latest message if this one is newer
        if (new Date(message.sent_at) > new Date(chatData.latestMessage.sent_at)) {
          chatData.latestMessage = message;
        }
      }
    });

    // Calculate unread counts and create enriched chat data
    const enrichedChats: EnrichedChatData[] = [];
    
    chatMap.forEach((chatData, chatId) => {
      // Calculate unread count (messages not sent by user and not read)
      const unreadCount = chatData.messages.filter(
        msg => msg.sender_id !== userId && msg.read_status === false
      ).length;

      // You'll need to enrich this with additional chat metadata
      // This is a simplified version - you'll want to fetch chat details from your API
      const enrichedChat: EnrichedChatData = {
        chatId,
        lastMessageAt: chatData.latestMessage.sent_at,
        lastMessagePreview: chatData.latestMessage.text,
        unreadCount,
        // These would come from your chat metadata API
        dogId: '',
        dogName: '',
        dogCreatedAt: '',
        adopterId: '',
        adopterName: '',
        shelterId: '',
        shelterName: '',
        status: 'active',
        otherParticipantPhotoUrl: '',
      };

      enrichedChats.push(enrichedChat);
    });

    // Sort by latest message time
    enrichedChats.sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    setChats(enrichedChats);
    setLoading(false);
  }, [chatIds, userId]);

  // Subscribe to new messages for all user's chats
  useEffect(() => {
    chatIds.forEach(chatId => {
      if (!subscriptionsRef.current[chatId]) {
        // This would be handled differently in your actual implementation
        // You might want to create individual subscriptions or use a single subscription
      }
    });

    return () => {
      // Cleanup subscriptions
      Object.values(subscriptionsRef.current).forEach(subscription => {
        if (subscription?.unsubscribe) {
          subscription.unsubscribe();
        }
      });
    };
  }, [chatIds]);

  // Handle new message updates
  const handleNewMessage = useCallback((newMessage: Message) => {
    setChats(prevChats => {
      const updatedChats = [...prevChats];
      const chatIndex = updatedChats.findIndex(chat => chat.chatId === newMessage.chat_id);
      
      if (chatIndex >= 0) {
        // Update existing chat
        const chat = { ...updatedChats[chatIndex] };
        chat.lastMessageAt = newMessage.sent_at;
        chat.lastMessagePreview = newMessage.text;
        
        // Update unread count if message is not from current user
        if (newMessage.sender_id !== userId && !newMessage.read_status) {
          chat.unreadCount = (chat.unreadCount || 0) + 1;
        }
        
        updatedChats[chatIndex] = chat;
      }
      
      // Re-sort by latest message time
      return updatedChats.sort((a, b) => 
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );
    });
  }, [userId]);

  const refreshChats = useCallback(async () => {
    setLoading(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Failed to refresh chats:', error);
    } finally {
      setLoading(false);
    }
  }, [refetch]);

  return {
    chats,
    loading: loading || messagesLoading,
    refreshChats,
    handleNewMessage,
  };
};

// Hook for subscribing to a specific chat's messages
export const useChatSubscription = (chatId: string, onNewMessage: (message: Message) => void) => {
  // Subscribe to new messages
  useSubscription(ON_CREATE_MESSAGE, {
    variables: { chatId },
    onData: ({ data }) => {
      if (data?.data?.onCreateMessage) {
        onNewMessage(data.data.onCreateMessage);
      }
    },
  });

  // Subscribe to message updates (read status changes)
  useSubscription(ON_UPDATE_MESSAGE, {
    variables: { chatId },
    onData: ({ data }) => {
      if (data?.data?.onUpdateMessage) {
        // Handle message updates (like read status changes)
        onNewMessage(data.data.onUpdateMessage);
      }
    },
  });
};