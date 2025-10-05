import { gql } from '@apollo/client';

// Query to get all messages for a specific chat (for getting latest message)
export const LIST_MESSAGES_BY_CHAT = gql`
  query ListMessagesByChat($chatId: ID!, $limit: Int, $nextToken: String) {
    listMessages(
      filter: { chat_id: { eq: $chatId } }
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        chat_id
        sent_at
        message_id
        sender_id
        text
        read_status
      }
      nextToken
    }
  }
`;

// Query to get latest message for multiple chats (if supported by your backend)
export const LIST_ALL_MESSAGES = gql`
  query ListAllMessages($filter: TableMessageFilterInput, $limit: Int, $nextToken: String) {
    listMessages(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        chat_id
        sent_at
        message_id
        sender_id
        text
        read_status
      }
      nextToken
    }
  }
`;

// Subscription for real-time message updates
export const ON_CREATE_MESSAGE = gql`
  subscription OnCreateMessage($chatId: ID) {
    onCreateMessage(chat_id: $chatId) {
      chat_id
      sent_at
      message_id
      sender_id
      text
      read_status
    }
  }
`;

// Subscription for message updates (read status changes)
export const ON_UPDATE_MESSAGE = gql`
  subscription OnUpdateMessage($chatId: ID) {
    onUpdateMessage(chat_id: $chatId) {
      chat_id
      sent_at
      message_id
      sender_id
      text
      read_status
    }
  }
`;

// Mutation to mark messages as read
export const UPDATE_MESSAGE = gql`
  mutation UpdateMessage($input: UpdateMessageInput!) {
    updateMessage(input: $input) {
      chat_id
      sent_at
      message_id
      sender_id
      text
      read_status
    }
  }
`;

// Mutation to create a new message
export const CREATE_MESSAGE = gql`
  mutation CreateMessage($input: CreateMessageInput!) {
    createMessage(input: $input) {
      chat_id
      sent_at
      message_id
      sender_id
      text
      read_status
    }
  }
`;