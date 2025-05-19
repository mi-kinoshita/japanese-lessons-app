// ChatScreen.tsx - チャットメッセージ送信数制限追加

import "react-native-get-random-values";

import { Ionicons } from "@expo/vector-icons";
import Octicons from "@expo/vector-icons/Octicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { v4 as uuidv4 } from "uuid";
import { callGeminiAPI } from "../api/gemini";
import { reportInappropriateMessage } from "../api/reports";
import { BASE_LUNA_PROMPT_TEMPLATE } from "../constants/prompts";
import { scenarios } from "../constants/scenarios";
import { useProgressData } from "../hooks/useProgressData";
import { Message } from "../types/message";

const CONVERSATION_STORAGE_KEY_PREFIX = "chatConversation_";
const CONVERSATION_SUMMARIES_KEY = "_conversationSummaries_";
const USER_SETTINGS_KEY = "userSettings";
const SURVEY_ANSWERS_KEY = "surveyAnswers";

const DEVICE_ID_STORAGE_KEY = "appDeviceId";
const DAILY_REPORT_COUNT_PREFIX = "dailyReportsCount_";
const MAX_DAILY_REPORTS = 10;

// ★ メッセージ数制限用の定数を追加
const DAILY_MESSAGE_COUNT_PREFIX = "dailyMessagesCount_";
const MAX_DAILY_MESSAGES = 10; // 1日のメッセージ上限数

const characterSettingOptions = [
  "Level 1 romaji",
  "Level 2 also hiragana",
  "Level 3 also katakana",
  "Level 4 also kanji",
];

interface ConversationSummary {
  id: string;
  participantName: string;
  lastMessage: string;
  timestamp: string;
  initialPrompt?: string | undefined;
  icon?: string;
  text?: string;
}

interface UserSettings {
  profileImageUri: string | null;
  username: string | null;
}

interface SurveyAnswers {
  q1?: string;
  q2?: string[];
  q3?: string;
  username?: string;
  [key: string]: any;
}

const ChatScreen = () => {
  // State and Refs
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const { progress } = useProgressData();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState("Chat");

  const params = useLocalSearchParams();
  const rawInitialPromptFromParams = params.initialPrompt;
  const initialPrompt: string | undefined =
    typeof rawInitialPromptFromParams === "string"
      ? rawInitialPromptFromParams
      : Array.isArray(rawInitialPromptFromParams) &&
        rawInitialPromptFromParams.length > 0
      ? rawInitialPromptFromParams[0]
      : undefined;

  const routeConversationId = params.conversationId as string | undefined;

  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [dailyReportCount, setDailyReportCount] = useState(0);
  // ★ メッセージ数制限用の state を追加
  const [dailyMessageCount, setDailyMessageCount] = useState(0);

  const currentReportDayRef = useRef<string | null>(null);
  // ★ メッセージ数制限用の ref を追加 (レポート用と共有も可能だが、明示的に分ける)
  const currentMessageDayRef = useRef<string | null>(null);

  // Helper Functions
  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const getTodayDateString = useCallback(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    const day = today.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const getOrCreateDeviceId = useCallback(async () => {
    try {
      let id = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
      if (!id) {
        id = uuidv4();
        await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
      }
      setDeviceId(id);
      console.log("Device ID:", id);
    } catch (error) {
      console.error("Failed to get or create device ID:", error);
      setDeviceId(null);
    }
  }, [setDeviceId]);

  const saveDailyReportCount = useCallback(
    async (count: number) => {
      const today = currentReportDayRef.current || getTodayDateString();
      try {
        await AsyncStorage.setItem(
          `${DAILY_REPORT_COUNT_PREFIX}${today}`,
          count.toString()
        );
        console.log(`Saved daily report count for ${today}: ${count}`);
      } catch (error) {
        console.error("Failed to save daily report count:", error);
      }
    },
    [currentReportDayRef, getTodayDateString]
  );

  // ★ メッセージ数制限用の保存関数を追加
  const saveDailyMessageCount = useCallback(
    async (count: number) => {
      const today = currentMessageDayRef.current || getTodayDateString();
      try {
        await AsyncStorage.setItem(
          `${DAILY_MESSAGE_COUNT_PREFIX}${today}`,
          count.toString()
        );
        console.log(`Saved daily message count for ${today}: ${count}`);
      } catch (error) {
        console.error("Failed to save daily message count:", error);
      }
    },
    [currentMessageDayRef, getTodayDateString]
  );

  const getConversationSummary = useCallback(
    async (id: string): Promise<ConversationSummary | undefined> => {
      try {
        const storedSummaries = await AsyncStorage.getItem(
          CONVERSATION_SUMMARIES_KEY
        );
        const summaries: ConversationSummary[] = storedSummaries
          ? JSON.parse(storedSummaries)
          : [];
        return summaries.find((s) => s.id === id);
      } catch (error) {
        console.error(
          `Failed to get conversation summary for ID: ${id}`,
          error
        );
        return undefined;
      }
    },
    []
  );

  const loadMessages = useCallback(
    async (id: string) => {
      setIsLoading(true);
      try {
        const storedConversation = await AsyncStorage.getItem(
          `${CONVERSATION_STORAGE_KEY_PREFIX}${id}`
        );
        if (storedConversation) {
          const parsedConversation = JSON.parse(
            storedConversation
          ) as Message[];
          setMessages(parsedConversation);
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error(
          `Failed to load messages for conversation ID: ${id}`,
          error
        );
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    },
    [setIsLoading, setMessages]
  );

  const saveMessages = useCallback(async (id: string, msgs: Message[]) => {
    try {
      const jsonValue = JSON.stringify(msgs);
      await AsyncStorage.setItem(
        `${CONVERSATION_STORAGE_KEY_PREFIX}${id}`,
        jsonValue
      );
    } catch (error) {
      console.error(
        `Failed to save messages for conversation ID: ${id}`,
        error
      );
    }
  }, []);

  const saveConversationSummary = useCallback(
    async (summary: ConversationSummary) => {
      try {
        const storedSummaries = await AsyncStorage.getItem(
          CONVERSATION_SUMMARIES_KEY
        );
        let summaries: ConversationSummary[] = storedSummaries
          ? JSON.parse(storedSummaries)
          : [];

        const existingIndex = summaries.findIndex((s) => s.id === summary.id);
        if (existingIndex > -1) {
          summaries[existingIndex] = summary;
        } else {
          summaries.unshift(summary);
        }

        await AsyncStorage.setItem(
          CONVERSATION_SUMMARIES_KEY,
          JSON.stringify(summaries)
        );
      } catch (error) {
        console.error(
          `Failed to save conversation summary for ID: ${summary.id}`,
          error
        );
      }
    },
    []
  );

  // API Interaction Functions

  const fetchInitialMessage = useCallback(
    async (promptToSend: string, id: string) => {
      setIsLoading(true);
      try {
        const storedUserSettings = await AsyncStorage.getItem(
          USER_SETTINGS_KEY
        );
        let currentUsername: string | null = null;
        if (storedUserSettings) {
          const parsedSettings: UserSettings = JSON.parse(storedUserSettings);
          currentUsername = parsedSettings.username || null;
        }
        const storedSurveyAnswers = await AsyncStorage.getItem(
          SURVEY_ANSWERS_KEY
        );
        let currentCharacterLevel: string | null = null;
        if (storedSurveyAnswers) {
          const parsedAnswers: SurveyAnswers = JSON.parse(storedSurveyAnswers);
          currentCharacterLevel =
            parsedAnswers.q3 || characterSettingOptions[0];
        } else {
          currentCharacterLevel = characterSettingOptions[0];
        }

        let characterLevelInstruction = "";
        const selectedLevel =
          currentCharacterLevel || characterSettingOptions[0];

        switch (selectedLevel) {
          case "Level 1 romaji":
            characterLevelInstruction =
              "Output must use ONLY romaji. Do not use hiragana, katakana, or kanji.";
            break;
          case "Level 2 also hiragana":
            characterLevelInstruction =
              "Output must use hiragana and romaji. DO NOT use katakana or kanji.";
            break;
          case "Level 3 also katakana":
            characterLevelInstruction =
              "Output must use hiragana, katakana, and romaji. DO NOT use kanji.";
            break;
          case "Level 4 also kanji":
            characterLevelInstruction =
              "Output can use kanji, hiragana, katakana, and romaji as appropriate for a native speaker.";
            break;
          default:
            characterLevelInstruction =
              "Output must use ONLY romaji. Do not use hiragana, katakana, or kanji.";
            console.warn(
              "[DEBUG] Unexpected character level value:",
              selectedLevel,
              "Defaulting to Romaji only."
            );
        }

        let finalSystemInstruction = BASE_LUNA_PROMPT_TEMPLATE.replace(
          "{CHARACTER_LEVEL_INSTRUCTION_PLACEHOLDER}",
          characterLevelInstruction.trim()
        );

        if (currentUsername) {
          finalSystemInstruction = finalSystemInstruction.replace(
            characterLevelInstruction.trim(),
            currentUsername
              ? `The user's name is ${currentUsername}. ${characterLevelInstruction.trim()}`
              : characterLevelInstruction.trim()
          );
        }

        console.log("[DEBUG] Loaded Character Level:", selectedLevel);
        console.log(
          "[DEBUG] Constructed Character Level Instruction:",
          characterLevelInstruction
        );
        console.log(
          "[DEBUG] Final System Instruction sent to API (initial message):",
          finalSystemInstruction
        );

        const messagesForApi: Message[] = [];

        messagesForApi.push({
          sender: "user",
          text: finalSystemInstruction,
          timestamp: "",
        });
        messagesForApi.push({
          sender: "user",
          text: promptToSend,
          timestamp: "",
        });

        const responseText = await callGeminiAPI(messagesForApi);

        const timestamp = new Date().toISOString();

        const initialAiMessage: Message = {
          text: responseText,
          sender: "ai",
          timestamp,
        };

        const uiMessages: Message[] = [initialAiMessage];

        setMessages(uiMessages);

        if (id) {
          await saveMessages(id, uiMessages);
          const existingSummary = await getConversationSummary(id);
          if (existingSummary) {
            const updatedSummary: ConversationSummary = {
              ...existingSummary,
              lastMessage: initialAiMessage.text,
              timestamp: new Date(timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            };
            await saveConversationSummary(updatedSummary);
          } else {
          }
        }
      } catch (error) {
        console.error("Error fetching initial message:", error);
        const timestamp = new Date().toISOString();
        const errorMessage: Message = {
          text: `An error occurred: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          sender: "ai",
          timestamp,
          isError: true,
        };
        const uiMessagesWithError: Message[] = [errorMessage];
        setMessages(uiMessagesWithError);

        if (id) {
          await saveMessages(id, uiMessagesWithError);
          const existingSummary = await getConversationSummary(id);
          if (existingSummary) {
            const updatedSummary: ConversationSummary = {
              ...existingSummary,
              lastMessage: errorMessage.text,
              timestamp: new Date(timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            };
            await saveConversationSummary(updatedSummary);
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      setIsLoading,
      setMessages,
      saveMessages,
      getConversationSummary,
      saveConversationSummary,
      setChatTitle,
      setConversationId,
      setIsLoading,
    ]
  );

  // Event Handlers and Render Functions

  const handleReportMessage = useCallback(
    async (message: Message) => {
      if (!conversationId || !deviceId) {
        Alert.alert(
          "Error",
          "Cannot report message. Missing required information."
        );
        return;
      }

      if (dailyReportCount >= MAX_DAILY_REPORTS) {
        Alert.alert(
          "Daily Limit Reached",
          `You have reached the maximum of ${MAX_DAILY_REPORTS} reports per day. Please try again tomorrow.`
        );
        return;
      }

      Alert.prompt(
        "Report Message",
        "Please provide a reason for reporting this message:",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Report",
            onPress: async (reason) => {
              if (!reason || reason.trim() === "") {
                Alert.alert("Error", "Please enter a reason for the report.");
                return;
              }

              setIsLoading(true);
              try {
                const reportData = {
                  device_id: deviceId,
                  conversation_id: conversationId,
                  message_text: message.text,
                  message_timestamp: message.timestamp,
                  reason: reason.trim(),
                };

                const successMessage = await reportInappropriateMessage(
                  reportData
                );

                const newReportCount = dailyReportCount + 1;
                setDailyReportCount(newReportCount);
                await saveDailyReportCount(newReportCount);

                Alert.alert(
                  "Success",
                  `${successMessage}\nReports today: ${newReportCount}/${MAX_DAILY_REPORTS}`
                );
              } catch (error) {
                console.error("Report failed:", error);
                Alert.alert(
                  "Report failed",
                  `Failed to submit report: ${
                    error instanceof Error ? error.message : "Unknown error"
                  }`
                );
              } finally {
                setIsLoading(false);
              }
            },
          },
        ],
        "plain-text"
      );
    },
    [
      conversationId,
      deviceId,
      dailyReportCount,
      saveDailyReportCount,
      setIsLoading,
      setDailyReportCount,
    ]
  );

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isUser = item.sender === "user";
      const isAi = item.sender === "ai";

      return (
        <View
          style={[
            styles.messageContainer,
            isUser ? styles.userMessageContainer : styles.aiMessageContainer,
          ]}
        >
          {isAi && (
            <Image
              source={require("../assets/images/80sgirl.jpeg")}
              style={styles.avatar}
            />
          )}
          <TouchableOpacity
            onLongPress={isAi ? () => handleReportMessage(item) : undefined}
            disabled={!isAi || isLoading}
            style={[
              styles.messageBubble,
              isUser ? styles.userMessageBubble : styles.aiMessageBubble,
              item.isError ? styles.errorMessageBubble : null,
            ]}
            activeOpacity={isAi ? 0.6 : 1}
          >
            <Text
              style={[
                isUser ? styles.userMessageText : styles.aiMessageText,
                item.isError ? styles.errorMessageText : null,
              ]}
            >
              {item.text}
            </Text>
          </TouchableOpacity>
        </View>
      );
    },
    [handleReportMessage, isLoading]
  );

  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading || !conversationId) return;

    // ★ メッセージ数制限を確認
    if (dailyMessageCount >= MAX_DAILY_MESSAGES) {
      Alert.alert(
        "Daily Message Limit Reached",
        `You have sent ${MAX_DAILY_MESSAGES} messages today. Please purchase unlimited chat to send more.`
      );
      return; // 制限に達したら処理を中断
    }

    setIsLoading(true);
    const timestamp = new Date().toISOString();

    const userMessage: Message = {
      text: inputText,
      sender: "user",
      timestamp,
    };

    // UIにメッセージを即時反映 (Optimistic Update)
    const messagesWithUserMessage = [...messages, userMessage];
    setMessages(messagesWithUserMessage);
    setInputText("");
    Keyboard.dismiss();

    // ★ メッセージ数制限をカウントアップして保存
    const newDailyMessageCount = dailyMessageCount + 1;
    setDailyMessageCount(newDailyMessageCount);
    await saveDailyMessageCount(newDailyMessageCount);

    try {
      // 設定とアンケート回答をリロードして最新のレベル設定を取得
      const storedUserSettings = await AsyncStorage.getItem(USER_SETTINGS_KEY);
      let currentUsername: string | null = null;
      if (storedUserSettings) {
        const parsedSettings: UserSettings = JSON.parse(storedUserSettings);
        currentUsername = parsedSettings.username || null;
      }
      const storedSurveyAnswers = await AsyncStorage.getItem(
        SURVEY_ANSWERS_KEY
      );
      let currentCharacterLevel: string | null = null;
      if (storedSurveyAnswers) {
        const parsedAnswers: SurveyAnswers = JSON.parse(storedSurveyAnswers);
        currentCharacterLevel = parsedAnswers.q3 || characterSettingOptions[0];
      } else {
        currentCharacterLevel = characterSettingOptions[0];
      }

      // 読み込んだレベルを元に、AI向けにより具体的な指示文字列を生成
      let characterLevelInstruction = "";
      const selectedLevel = currentCharacterLevel || characterSettingOptions[0]; // string であることを保証

      switch (selectedLevel) {
        case "Level 1 romaji":
          characterLevelInstruction =
            "Output must use ONLY romaji. Do not use hiragana, katakana, or kanji.";
          break;
        case "Level 2 also hiragana":
          characterLevelInstruction =
            "Output must use hiragana and romaji. DO NOT use katakana or kanji.";
          break;
        case "Level 3 also katakana":
          characterLevelInstruction =
            "Output must use hiragana, katakana, and romaji. DO NOT use kanji.";
          break;
        case "Level 4 also kanji":
          characterLevelInstruction =
            "Output can use kanji, hiragana, katakana, and romaji as appropriate for a native speaker.";
          break;
        default: // 予期しない値の場合のフォールバック
          characterLevelInstruction =
            "Output must use ONLY romaji. Do not use hiragana, katakana, or kanji.";
          console.warn(
            "[DEBUG] Unexpected character level value:",
            selectedLevel,
            "Defaulting to Romaji only."
          );
      }

      // プレースホルダーを置き換えて最終的なシステムプロンプトを構築
      let finalSystemInstruction = BASE_LUNA_PROMPT_TEMPLATE.replace(
        "{CHARACTER_LEVEL_INSTRUCTION_PLACEHOLDER}",
        characterLevelInstruction.trim() // 前後の空白を除去
      );

      // ユーザー名に関する指示を追加
      if (currentUsername) {
        // キャラクターレベルの指示文字列を探して、その前にユーザー名指示を挿入
        finalSystemInstruction = finalSystemInstruction.replace(
          characterLevelInstruction.trim(), // 挿入したばかりの指示文字列を探す
          currentUsername
            ? `The user's name is ${currentUsername}. ${characterLevelInstruction.trim()}`
            : characterLevelInstruction.trim()
        );
      }

      // ★ DEBUG: 読み込んだレベルと、構築された指示、最終プロンプトをログ出力
      console.log("[DEBUG] Loaded Character Level:", selectedLevel);
      console.log(
        "[DEBUG] Constructed Character Level Instruction:",
        characterLevelInstruction
      );
      console.log(
        "[DEBUG] Final System Instruction sent to API (send message):",
        finalSystemInstruction
      );
      console.log(
        `[DEBUG] Sent message. Daily count is now: ${newDailyMessageCount}/${MAX_DAILY_MESSAGES}`
      );

      const messagesForApi: Message[] = [];
      messagesForApi.push({
        sender: "user",
        text: finalSystemInstruction,
        timestamp: "",
      });

      // 会話コンテキストのための初期ユーザー入力をロード
      const summary = await getConversationSummary(conversationId);
      const initialUserInputForApi = summary?.initialPrompt || "Hello!";

      messagesForApi.push({
        sender: "user",
        text: initialUserInputForApi,
        timestamp: "",
      });

      // UIの状態にあるすべてのメッセージをその後に続く履歴として追加
      messagesForApi.push(...messagesWithUserMessage); // 以前のUIメッセージ + 新しいユーザーメッセージを含む

      const responseText = await callGeminiAPI(messagesForApi);

      const aiTimestamp = new Date().toISOString();

      const aiMessage: Message = {
        text: responseText,
        sender: "ai",
        timestamp: aiTimestamp,
      };

      const finalMessages = [...messagesWithUserMessage, aiMessage];
      setMessages(finalMessages);

      if (conversationId) {
        await saveMessages(conversationId, finalMessages);
        const existingSummary = await getConversationSummary(conversationId);
        if (existingSummary) {
          const updatedSummary: ConversationSummary = {
            ...existingSummary,
            lastMessage: aiMessage.text,
            timestamp: new Date(aiTimestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
          await saveConversationSummary(updatedSummary);
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);

      const timestamp = new Date().toISOString();
      const errorMessage: Message = {
        text: `An error occurred: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        sender: "ai",
        timestamp,
        isError: true,
      };

      const messagesWithError = [...messagesWithUserMessage, errorMessage];
      setMessages(messagesWithError);

      if (conversationId) {
        await saveMessages(conversationId, messagesWithError);
        const existingSummary = await getConversationSummary(conversationId);
        if (existingSummary) {
          const updatedSummary: ConversationSummary = {
            ...existingSummary,
            lastMessage: errorMessage.text,
            timestamp: new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
          await saveConversationSummary(updatedSummary);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    inputText,
    isLoading,
    messages,
    conversationId,
    setIsLoading,
    setMessages,
    saveMessages,
    getConversationSummary,
    saveConversationSummary,
    dailyMessageCount,
    saveDailyMessageCount,
  ]); // dailyMessageCount と saveDailyMessageCount を依存配列に追加

  // Effects

  useEffect(() => {
    getOrCreateDeviceId();
  }, [getOrCreateDeviceId]);

  // レポート数とメッセージ数の日ごとのカウントをロードする Effect
  useEffect(() => {
    const today = getTodayDateString();
    currentReportDayRef.current = today;
    currentMessageDayRef.current = today; // 同じ日付 Ref を使用

    const loadDailyCounts = async () => {
      try {
        // レポート数をロード
        const storedReportCount = await AsyncStorage.getItem(
          `${DAILY_REPORT_COUNT_PREFIX}${today}`
        );
        if (storedReportCount !== null) {
          setDailyReportCount(parseInt(storedReportCount, 10));
        } else {
          setDailyReportCount(0);
        }

        // メッセージ数をロード
        const storedMessageCount = await AsyncStorage.getItem(
          `${DAILY_MESSAGE_COUNT_PREFIX}${today}`
        );
        if (storedMessageCount !== null) {
          setDailyMessageCount(parseInt(storedMessageCount, 10));
        } else {
          setDailyMessageCount(0); // その日のデータがなければ0から開始
        }
      } catch (error) {
        console.error("Failed to load daily counts:", error);
        setDailyReportCount(0);
        setDailyMessageCount(0);
      }
    };

    loadDailyCounts();
  }, [getTodayDateString, setDailyReportCount, setDailyMessageCount]);

  useEffect(() => {
    const loadOrCreateConversation = async () => {
      try {
        let conversationInitialPrompt = initialPrompt || "Hello!";

        if (initialPrompt) {
          // シナリオから開始の場合
          const newId = uuidv4();
          setConversationId(newId);

          const selectedScenario = scenarios.find(
            (s) => s.prompt === initialPrompt
          );
          const participantName = selectedScenario?.text || "Language AI";
          setChatTitle(participantName);

          const newSummary: ConversationSummary = {
            id: newId,
            participantName: participantName,
            lastMessage: "New conversation started...",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            initialPrompt: initialPrompt,
            icon: selectedScenario?.icon,
            text: selectedScenario?.text,
          };
          await saveConversationSummary(newSummary);

          setMessages([]);

          fetchInitialMessage(conversationInitialPrompt, newId);
        } else if (routeConversationId) {
          // 既存の会話をロードする場合
          setConversationId(routeConversationId);
          loadMessages(routeConversationId);
          const summary = await getConversationSummary(routeConversationId);
          if (summary) {
            setChatTitle(summary.participantName);
          } else {
            setChatTitle("Language AI");
          }
        } else {
          // デフォルトの新規会話の場合
          const defaultNewId = uuidv4();
          setConversationId(defaultNewId);
          const participantName = "Language AI";
          setChatTitle(participantName);

          const newSummary: ConversationSummary = {
            id: defaultNewId,
            participantName: participantName,
            lastMessage: "Welcome!",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            // avatarUrl: undefined
            initialPrompt: "Hello!",
          };
          await saveConversationSummary(newSummary);

          setMessages([]);

          fetchInitialMessage(conversationInitialPrompt, defaultNewId);
        }
      } catch (error) {
        console.error("Error within loadOrCreateConversation:", error);
        Alert.alert("Error", "Failed to load or start conversation.");
        setIsLoading(false);
        setConversationId(null);
        setMessages([]);
        setChatTitle("Error");
      }
    };

    loadOrCreateConversation();
  }, [
    initialPrompt,
    params.conversationId,
    fetchInitialMessage,
    loadMessages,
    getConversationSummary,
    saveConversationSummary,
    setChatTitle,
    setConversationId,
    setMessages,
    setIsLoading,
  ]);

  useEffect(() => {
    if (conversationId && messages.length > 0) {
      saveMessages(conversationId, messages);
      const lastMessage = messages[messages.length - 1];
      const updateSummary = async () => {
        const existingSummary = await getConversationSummary(conversationId);
        if (existingSummary) {
          const updatedSummary: ConversationSummary = {
            ...existingSummary,
            lastMessage: lastMessage.text,
            timestamp: new Date(lastMessage.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
          await saveConversationSummary(updatedSummary);
        }
      };
      updateSummary();
    }
  }, [
    messages,
    conversationId,
    saveMessages,
    getConversationSummary,
    saveConversationSummary,
  ]);

  useEffect(() => {
    if (!isLoading && messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isLoading]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        if (flatListRef.current) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 40}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              router.replace("/(tabs)/chatListScreen");
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {chatTitle}
            </Text>
          </View>
          <View style={styles.headerRightPlaceholder}></View>
        </View>

        <View style={styles.mainContentArea}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item, index) => index.toString()}
            style={styles.chatList}
            contentContainerStyle={styles.chatListContent}
            onContentSizeChange={() => {
              if (!isLoading) {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }
            }}
            onLayout={() => {
              if (!isLoading) {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }
            }}
            showsVerticalScrollIndicator={true}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={21}
          />

          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder={isLoading ? "Processing..." : "Enter a message"}
              placeholderTextColor="#ccc"
              multiline
              returnKeyType="default"
              editable={!isLoading && !!conversationId}
              onFocus={() => {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                isLoading || !inputText.trim() || !conversationId
                  ? styles.sendButtonDisabled
                  : styles.sendButtonEnabled,
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading || !conversationId}
            >
              {isLoading ? (
                <ActivityIndicator color="#ccc" size="small" />
              ) : (
                <Octicons
                  name="paper-airplane"
                  size={20}
                  color={
                    inputText.trim() && !!conversationId && !isLoading
                      ? "#4a43a1"
                      : "#ccc"
                  }
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mainContentArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    ...(Platform.OS === "android" && { paddingTop: 40 }),
  },
  backButton: {
    paddingRight: 10,
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
  headerRightPlaceholder: {
    width: 24 + 10,
  },
  chatList: {
    flex: 1,
    backgroundColor: "#fff",
  },
  chatListContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 8,
  },
  userMessageContainer: {
    justifyContent: "flex-end",
    alignSelf: "flex-end",
  },
  aiMessageContainer: {
    justifyContent: "flex-start",
    alignSelf: "flex-start",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  messageBubble: {
    maxWidth: "70%",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  userMessageBubble: {
    backgroundColor: "#007AFF",
    borderTopRightRadius: 5,
  },
  aiMessageBubble: {
    backgroundColor: "#f2f2f7",
    borderTopLeftRadius: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  userMessageText: {
    color: "#fff",
  },
  aiMessageText: {
    color: "#000",
  },
  errorMessageBubble: {
    backgroundColor: "#ffebee",
    borderColor: "#e57373",
    borderWidth: 1,
  },
  errorMessageText: {
    color: "#c62828",
    fontWeight: "bold",
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  input: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    textAlignVertical: "center",
    marginRight: 10,
    fontSize: 16,
    lineHeight: 20,
    maxHeight: 120,
  },
  sendButton: {
    borderRadius: 25,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Platform.select({
      ios: 0,
      android: 8,
    }),
  },
  sendButtonEnabled: {
    backgroundColor: "#fff",
  },
  sendButtonDisabled: {
    backgroundColor: "#fff",
  },
});

export default ChatScreen;
