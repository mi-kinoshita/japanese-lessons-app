import { AntDesign, FontAwesome, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { encouragingMessages } from "../../constants/encouragingMessages";
import { Scenario, scenarios } from "../../constants/scenarios";
import { useProgressData } from "../../hooks/useProgressData";

interface IngredientProps {
  name: string;
  value: string;
  percentage: string;
  color: string;
}

const IngredientPill = ({
  name,
  value,
  percentage,
  color,
}: IngredientProps) => {
  let icon;
  switch (name) {
    case "Point":
      icon = (
        <FontAwesome name="star" size={20} color={color} style={styles.icon} />
      );
      break;
    case "Streak":
      icon = (
        <Ionicons
          name="flame-outline"
          size={20}
          color={color}
          style={styles.icon}
        />
      );
      break;
    case "Word":
      icon = (
        <AntDesign name="bulb1" size={20} color={color} style={styles.icon} />
      );
      break;
    default:
      icon = null;
      break;
  }

  const numericValue = value.replace(/[^0-9]/g, "");
  const numericPercentage = Number(percentage);
  let backgroundColor = color;

  if (numericPercentage > 75) {
    backgroundColor = color;
  } else if (numericPercentage > 50) {
    backgroundColor = lightenColor(color, 0.2);
  } else {
    backgroundColor = lightenColor(color, 0.5);
  }

  function lightenColor(col: string, amt: number) {
    let usePound = false;
    if (col[0] === "#") {
      col = col.slice(1);
      usePound = true;
    }
    const num = parseInt(col, 16);
    let r = (num >> 16) + amt;
    if (r > 255) r = 255;
    else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00ff) + amt;
    if (b > 255) b = 255;
    else if (b < 0) b = 0;
    let g = (num & 0x0000ff) + amt;
    if (g > 255) g = 255;
    else if (g < 0) g = 0;
    return (
      (usePound ? "#" : " ") +
      (g | (b << 8) | (r << 16)).toString(16).padStart(6, "0")
    );
  }

  return (
    <View style={styles.ingredientPill}>
      {icon}
      <View style={styles.percentageContainer}>
        <View
          style={[
            styles.percentageFill,
            {
              backgroundColor: backgroundColor,
              width: `${numericPercentage}%`,
            },
          ]}
        />
      </View>
      <Text style={styles.ingredientValue}>{numericValue}</Text>
      <Text style={styles.ingredientName}>{name}</Text>
    </View>
  );
};

const DAILY_SCENARIO_DATE_KEY = "dailyScenarioDate";
const DAILY_SCENARIO_DATA_KEY = "dailyScenarioData";
const DAILY_ENCOURAGING_MESSAGE_KEY = "dailyEncouragingMessage";

const DAILY_MESSAGE_COUNT_PREFIX = "dailyMessagesCount_";
const MAX_DAILY_MESSAGES = 10;

export default function IndexScreen() {
  const router = useRouter();
  const { progress, loadProgress } = useProgressData();

  const [dailyScenario, setDailyScenario] = useState<Scenario | null>(null);
  const [dailyEncouragingMessage, setDailyEncouragingMessage] = useState<
    string | null
  >(null);
  const [dailyMessageCount, setDailyMessageCount] = useState(0);

  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    const day = today.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const selectRandomScenario = (scenarioList: Scenario[]) => {
    if (!scenarioList || scenarioList.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * scenarioList.length);
    return scenarioList[randomIndex];
  };

  const selectRandomMessage = (messages: string[]) => {
    if (!messages || messages.length === 0) {
      return "今日も一日頑張ろう！";
    }
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  };

  const loadDailyMessageCount = useCallback(async () => {
    try {
      const today = getTodayDateString();
      const storedMessageCount = await AsyncStorage.getItem(
        `${DAILY_MESSAGE_COUNT_PREFIX}${today}`
      );
      if (storedMessageCount !== null) {
        setDailyMessageCount(parseInt(storedMessageCount, 10));
      } else {
        setDailyMessageCount(0);
      }
    } catch (error) {
      console.error("Failed to load daily message count:", error);
      setDailyMessageCount(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProgress();

      const loadDailyScenario = async () => {
        const todayDateString = getTodayDateString();

        try {
          const savedDate = await AsyncStorage.getItem(DAILY_SCENARIO_DATE_KEY);
          const savedScenarioData = await AsyncStorage.getItem(
            DAILY_SCENARIO_DATA_KEY
          );

          if (savedDate === todayDateString && savedScenarioData) {
            const scenario = JSON.parse(savedScenarioData) as Scenario;
            setDailyScenario(scenario);
          } else {
            const newScenario = selectRandomScenario(scenarios);
            if (newScenario) {
              await AsyncStorage.setItem(
                DAILY_SCENARIO_DATE_KEY,
                todayDateString
              );
              await AsyncStorage.setItem(
                DAILY_SCENARIO_DATA_KEY,
                JSON.stringify(newScenario)
              );
              setDailyScenario(newScenario);
            } else {
              console.warn(
                "Scenarios list is empty, cannot select a daily scenario."
              );
              setDailyScenario(null);
            }
          }
        } catch (error) {
          console.error("Error loading or saving daily scenario:", error);
          const fallbackScenario = selectRandomScenario(scenarios);
          setDailyScenario(fallbackScenario);
        }
      };

      const loadDailyEncouragingMessage = async () => {
        const todayDateString = getTodayDateString();

        try {
          const savedMessageData = await AsyncStorage.getItem(
            DAILY_ENCOURAGING_MESSAGE_KEY
          );

          if (savedMessageData) {
            const parsedData = JSON.parse(savedMessageData);
            if (parsedData.date === todayDateString && parsedData.message) {
              setDailyEncouragingMessage(parsedData.message);
              return;
            }
          }

          const newMessage = selectRandomMessage(encouragingMessages);
          const dataToSave = {
            date: todayDateString,
            message: newMessage,
          };

          await AsyncStorage.setItem(
            DAILY_ENCOURAGING_MESSAGE_KEY,
            JSON.stringify(dataToSave)
          );
          setDailyEncouragingMessage(newMessage);
        } catch (error) {
          console.error(
            "Error loading or saving daily encouraging message:",
            error
          );
          setDailyEncouragingMessage("今日も一日頑張ろう！");
        }
      };

      loadDailyScenario();
      loadDailyEncouragingMessage();
      loadDailyMessageCount();

      return () => {};
    }, [loadProgress, loadDailyMessageCount])
  );

  const handleLessonStart = () => {
    router.push("/chatScreen");
  };

  const handleScenarioTap = () => {
    if (dailyMessageCount >= MAX_DAILY_MESSAGES) {
      Alert.alert(
        "Daily Message Limit Reached",
        `You have sent ${MAX_DAILY_MESSAGES} messages today. You cannot start a new chat.`
      );
    } else if (dailyScenario) {
      router.push({
        pathname: "/chatScreen",
        params: { initialPrompt: dailyScenario.prompt },
      });
    } else {
      console.warn("Daily scenario not loaded yet.");
    }
  };

  const calculatePercentage = (
    currentValue: number,
    maxValue: number
  ): string => {
    if (maxValue === 0) return "0";
    const percentage = (currentValue / maxValue) * 100;
    return Math.min(100, percentage).toFixed(0);
  };

  const targetStreak = 30;
  const targetWordCount = 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.headerLeftPlaceholder}>
            <Ionicons name="heart" size={28} color="#4a43a1" />
          </View>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>LunaTalk</Text>
            {/* TODO: Add payment button or icon */}
          </View>
          <View style={styles.headerRightPlaceholder}></View>
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.imageContainer}>
            <Image
              source={require("../../assets/images/80sgirl.jpeg")}
              resizeMode="contain"
              style={styles.mainImage}
              defaultSource={require("../../assets/images/80sgirl.jpeg")}
            />
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Progress</Text>
            <View style={styles.ingredientsRow}>
              <IngredientPill
                name="Point"
                value={progress.points.toString()}
                percentage={calculatePercentage(progress.streak, targetStreak)}
                color="#FFD700"
              />
              <IngredientPill
                name="Streak"
                value={progress.streak.toString()}
                percentage={calculatePercentage(progress.streak, targetStreak)}
                color="#f55862"
              />
              <IngredientPill
                name="Word"
                value={progress.wordCount.toString()}
                percentage={calculatePercentage(
                  progress.wordCount,
                  targetWordCount
                )}
                color="#1ac7af"
              />
            </View>

            <View style={styles.scenarioSectionInner}>
              <Text style={styles.scenarioSectionTitle}>
                Today's Chat Scenario
              </Text>
              <TouchableOpacity
                onPress={handleScenarioTap}
                style={[
                  styles.scenarioItemContainer,
                  dailyMessageCount >= MAX_DAILY_MESSAGES
                    ? styles.disabledScenarioItemContainer
                    : null,
                ]}
                disabled={
                  !dailyScenario || dailyMessageCount >= MAX_DAILY_MESSAGES
                }
              >
                {dailyScenario?.icon ? (
                  <View style={styles.scenarioItemIconContainer}>
                    <Ionicons
                      name={dailyScenario.icon as any}
                      size={30}
                      color={
                        dailyMessageCount >= MAX_DAILY_MESSAGES
                          ? "#ccc"
                          : "#202020"
                      }
                      style={styles.scenarioIcon}
                    />
                  </View>
                ) : (
                  <View style={styles.scenarioItemIconContainer}>
                    <Ionicons
                      name="sync-outline"
                      size={30}
                      color={
                        dailyMessageCount >= MAX_DAILY_MESSAGES
                          ? "#ccc"
                          : "#ccc"
                      }
                      style={styles.scenarioIcon}
                    />
                  </View>
                )}

                <View style={styles.scenarioItemTextContent}>
                  <Text
                    style={[
                      styles.scenarioItemText,
                      dailyMessageCount >= MAX_DAILY_MESSAGES
                        ? styles.disabledScenarioItemText
                        : null,
                    ]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {dailyScenario
                      ? dailyScenario.text
                      : "Loading today's scenario..."}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {dailyEncouragingMessage && (
              <View style={styles.encouragingMessageSection}>
                <Text style={styles.encouragingMessageSectionTitle}>
                  Luna says
                </Text>
                <View style={styles.encouragingMessageContainer}>
                  <View style={styles.encouragingMessageBubble}>
                    <Text style={styles.encouragingMessageTextBubble}>
                      {dailyEncouragingMessage}
                    </Text>
                  </View>
                  <Image
                    source={require("../../assets/images/wakuwaku.png")}
                    style={styles.encouragingAvatar}
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#4a43a1",
  },

  scrollContainer: {
    paddingBottom: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: Platform.OS === "android" ? Constants.statusBarHeight : 0,
  },
  headerLeftPlaceholder: {
    width: 38,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  headerRightPlaceholder: {
    width: 38,
  },
  backButton: {
    padding: 5,
  },
  contentContainer: {
    flexDirection: "column",
  },

  imageContainer: {
    backgroundColor: "#4a43a1",
    justifyContent: "center",
    paddingTop: 20,
  },
  mainImage: {
    width: "100%",
    height: 300,
    borderRadius: 20,
    alignSelf: "center",
  },

  section: {
    backgroundColor: "white",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingVertical: 30,
    paddingHorizontal: 30,
    marginBottom: 0,
    marginTop: 0,
    minHeight: "100%",
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 35,
    paddingTop: 5,
  },
  sectionDetail: {
    marginTop: 70,
  },
  ingredientsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ingredientPill: {
    alignItems: "center",
    width: 80,
  },
  icon: {
    marginBottom: 10,
  },
  ingredientName: {
    fontSize: 12,
    textAlign: "center",
  },
  ingredientValue: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 2,
  },
  percentageContainer: {
    width: 45,
    height: 5,
    borderRadius: 5,
    backgroundColor: "#ddd",
    overflow: "hidden",
    marginBottom: 5,
  },
  percentageFill: {
    width: "100%",
    borderRadius: 5,
    height: "100%",
    minHeight: 2,
  },
  percentageText: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },
  addButton: {
    backgroundColor: "#4a43a1",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addButtonText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  menuIcon: {
    padding: 3,
  },
  paymentIcon: {
    padding: 10,
  },
  scenarioSectionInner: {
    marginTop: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#fff",
  },
  scenarioSectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
    alignSelf: "flex-start",
  },
  scenarioItemContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 25,
    paddingHorizontal: 10,
    minHeight: 60,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignSelf: "center",
    width: "90%",
  },
  scenarioItemIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  scenarioIcon: {},
  scenarioItemTextContent: {
    alignItems: "center",
  },
  scenarioItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  encouragingMessageSection: {
    marginTop: 30,
    alignItems: "center",
  },
  encouragingMessageSectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
    alignSelf: "flex-start",
  },
  encouragingMessageContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
    marginHorizontal: 0,
  },
  encouragingAvatar: {
    width: 70,
    height: 70,
    borderRadius: 20,
    marginTop: 8,
  },
  encouragingMessageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f2f2f7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 4,
  },
  encouragingMessageTextBubble: {
    fontSize: 16,
    color: "#000",
    textAlign: "center",
  },
  disabledScenarioItemContainer: {
    opacity: 0.6,
  },
  disabledScenarioItemText: {
    color: "#666",
  },
});
