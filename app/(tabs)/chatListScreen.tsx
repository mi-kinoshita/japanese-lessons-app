import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Swipeable } from "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";

interface ConversationSummary {
  id: string;
  participantName: string;
  lastMessage: string;
  timestamp: string;
  avatarUrl?: string;
  initialPrompt?: string;
  icon?: string;
  text?: string;
}

const CONVERSATION_SUMMARIES_KEY = "_conversationSummaries_";
const CONVERSATION_STORAGE_KEY_PREFIX = "chatConversation_";

const ChatListItem: React.FC<{
  conversation: ConversationSummary;
  onDelete: (id: string) => void;
}> = ({ conversation, onDelete }) => {
  const handlePress = () => {
    router.push({
      pathname: "/chatScreen",
      params: { conversationId: conversation.id },
    });
  };

  const renderRightActions = () => {
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => {
          Alert.alert(
            "Delete Chat",
            "Are you sure you want to delete this chat?",
            [
              {
                text: "Cancel",
                style: "cancel",
              },
              {
                text: "Delete",
                onPress: () => onDelete(conversation.id),
                style: "destructive",
              },
            ]
          );
        }}
      >
        <Ionicons name="trash-outline" size={25} color="white" />
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <TouchableOpacity style={styles.chatItemContainer} onPress={handlePress}>
        {conversation.icon ? (
          <View style={styles.scenarioIconContainer}>
            <Ionicons
              name={conversation.icon as any}
              size={30}
              color="#202020"
            />
          </View>
        ) : conversation.avatarUrl ? (
          <Image
            source={{ uri: conversation.avatarUrl }}
            style={styles.avatar}
          />
        ) : (
          <Image
            source={require("../../assets/images/80sgirl.jpeg")}
            style={styles.avatar}
          />
        )}

        <View style={styles.chatItemContent}>
          <View style={styles.chatItemHeader}>
            <Text style={styles.participantName}>
              {conversation.text || conversation.participantName}
            </Text>
            <Text style={styles.timestamp}>{conversation.timestamp}</Text>
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {conversation.lastMessage}
          </Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

export default function ChatListScreen() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadConversationSummaries = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedSummaries = await AsyncStorage.getItem(
        CONVERSATION_SUMMARIES_KEY
      );
      if (storedSummaries) {
        const parsedSummaries: ConversationSummary[] =
          JSON.parse(storedSummaries);
        setConversations(parsedSummaries);
        console.log("Loaded conversation summaries:", parsedSummaries.length);
      } else {
        setConversations([]);
        console.log("No conversation summaries found.");
      }
    } catch (error) {
      console.error("Failed to load conversation summaries:", error);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDelete = useCallback(async (conversationId: string) => {
    console.log("Attempting to delete conversation:", conversationId);
    try {
      await AsyncStorage.removeItem(
        `${CONVERSATION_STORAGE_KEY_PREFIX}${conversationId}`
      );
      console.log(
        `Messages for conversation ID ${conversationId} removed from AsyncStorage.`
      );

      const storedSummaries = await AsyncStorage.getItem(
        CONVERSATION_SUMMARIES_KEY
      );
      let summaries: ConversationSummary[] = storedSummaries
        ? JSON.parse(storedSummaries)
        : [];
      const updatedSummaries = summaries.filter(
        (summary) => summary.id !== conversationId
      );
      await AsyncStorage.setItem(
        CONVERSATION_SUMMARIES_KEY,
        JSON.stringify(updatedSummaries)
      );
      console.log(
        `Summary for conversation ID ${conversationId} removed from list in AsyncStorage.`
      );

      setConversations(updatedSummaries);
      console.log("Conversation deleted successfully:", conversationId);
    } catch (error) {
      console.error(
        `Failed to delete conversation ID: ${conversationId}`,
        error
      );
      Alert.alert("Error", "Failed to delete chat.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log("ChatListScreen focused, loading summaries.");
      loadConversationSummaries();
      return () => {
        console.log("ChatListScreen blurred.");
      };
    }, [loadConversationSummaries])
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a43a1" />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuIcon} onPress={() => {}}>
          <Ionicons name="heart" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Chat</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            router.push("/newChatStartScreen");
            console.log("新しいチャットを作成 ボタンが押されました");
          }}
          style={styles.menuIcon}
        >
          <AntDesign name="form" size={25} color="#202020" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatListItem conversation={item} onDelete={handleDelete} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyListContainer}>
            <Text style={styles.emptyListText}>
              No chats yet. Start a new conversation!
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    // paddingTop: 10,
    paddingBottom: 10,
    paddingTop: Platform.OS === "android" ? Constants.statusBarHeight : 0,
  },
  menuIcon: {
    padding: 5,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
  },
  chatItemContainer: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  scenarioIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: "#f8f8f8",
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: "#eee",
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  chatItemContent: {
    flex: 1,
  },
  chatItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  participantName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    flexShrink: 1,
    marginRight: 10,
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
  },
  lastMessage: {
    fontSize: 14,
    color: "#444",
  },
  separator: {
    height: 1,
    backgroundColor: "#eee",
    marginLeft: 80,
    marginRight: 0,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyListText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  deleteButton: {
    backgroundColor: "red",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
  },
});
