import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const AI_CHARACTER_IMAGE = require("../assets/images/good.png");

const SURVEY_COMPLETED_KEY = "hasCompletedSurvey";
const SURVEY_ANSWERS_KEY = "surveyAnswers";
const USER_SETTINGS_KEY = "userSettings";

interface UserSettings {
  profileImageUri: string | null;
  username: string | null;
}

const questions = [
  {
    id: "q1",
    text: "How old are you?",
    type: "single-select",
    options: ["14-24", "25-34", "35-44", "45-54", "55+"],
  },
  {
    id: "q2",
    text: "Which features would you like to use?",
    type: "multi-select",
    options: ["Chat", "Vocabulary Registration"],
  },
  {
    id: "q3",
    text: "Display character settings",
    type: "single-select",
    options: [
      "Level 1 romaji",
      "Level 2 also hiragana",
      "Level 3 also katakana",
      "Level 4 also kanji",
    ],
  },
  {
    id: "username",
    text: "What is your username?",
    type: "text-input",
    placeholder: "Enter your username",
  },
];

export default function SurveyScreen() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: any }>({});
  const [isLoading, setIsLoading] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const isAnswerSelected = useMemo(() => {
    const answer = answers[currentQuestion.id];
    switch (currentQuestion.type) {
      case "single-select":
        return answer !== undefined && answer !== null && answer !== "";
      case "multi-select":
        return Array.isArray(answer) && answer.length > 0;
      case "text-input":
        return typeof answer === "string" && answer.trim().length > 0;
      default:
        return false;
    }
  }, [answers, currentQuestion.id, currentQuestion.type]);

  const handleOptionSelect = (option: string) => {
    if (currentQuestion.type === "single-select") {
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: option,
      }));
    } else if (currentQuestion.type === "multi-select") {
      setAnswers((prev) => {
        const currentAnswers = (prev[currentQuestion.id] || []) as string[];
        if (currentAnswers.includes(option)) {
          return {
            ...prev,
            [currentQuestion.id]: currentAnswers.filter(
              (item) => item !== option
            ),
          };
        } else {
          return {
            ...prev,
            [currentQuestion.id]: [...currentAnswers, option],
          };
        }
      });
    }
  };

  const handleTextInputChange = (text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: text,
    }));
  };

  const completeSurvey = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.setItem(SURVEY_ANSWERS_KEY, JSON.stringify(answers));

      const username = answers.username || null;
      const userSettingsForChat: UserSettings = {
        profileImageUri: null,
        username: username,
      };
      await AsyncStorage.setItem(
        USER_SETTINGS_KEY,
        JSON.stringify(userSettingsForChat)
      );

      await AsyncStorage.setItem(SURVEY_COMPLETED_KEY, "true");
      router.replace("/");
    } catch (e) {
      console.error("Failed to save survey data or status:", e);
      router.replace("/");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (!isAnswerSelected) {
      return;
    }

    if (!isLastQuestion) {
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
    } else {
      completeSurvey();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prevIndex) => prevIndex - 1);
    }
  };

  const renderQuestion = () => {
    if (
      currentQuestion &&
      (currentQuestion.type === "single-select" ||
        currentQuestion.type === "multi-select")
    ) {
      const selectedAnswer = answers[currentQuestion.id];
      const isMultiSelect = currentQuestion.type === "multi-select";

      return (
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{currentQuestion.text}</Text>
          <View style={styles.optionsContainer}>
            {currentQuestion.options &&
              currentQuestion.options.map((option) => {
                const isSelected = isMultiSelect
                  ? ((selectedAnswer as string[]) || []).includes(option)
                  : selectedAnswer === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton,
                      isSelected && styles.selectedOption,
                    ]}
                    onPress={() => handleOptionSelect(option)}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
          </View>
        </View>
      );
    } else if (currentQuestion && currentQuestion.type === "text-input") {
      const inputText = answers[currentQuestion.id] || "";
      return (
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{currentQuestion.text}</Text>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={handleTextInputChange}
            placeholder={currentQuestion.placeholder}
            placeholderTextColor="#999"
          />
        </View>
      );
    } else {
      return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContentArea}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollableContent,
            isLastQuestion && styles.scrollableContentForLastQuestion,
          ]}
        >
          {currentQuestionIndex === 0 && (
            <>
              <Text style={styles.title}>Welcome!</Text>
              <Text style={styles.description}>
                Please tell us a little about yourself to help us personalize
                your learning experience.
              </Text>
            </>
          )}

          {/* 進捗表示 (最後の質問画面では非表示) */}
          {!isLastQuestion && (
            <Text style={styles.progressText}>
              Question {currentQuestionIndex + 1} / {questions.length}
            </Text>
          )}

          {renderQuestion()}

          {/* アンケート完了時のメッセージ表示部分 */}
          {isLastQuestion && (
            <View style={styles.surveyCompletionMessageSectionCentered}>
              <View style={styles.surveyCompletionMessageBubbleCentered}>
                {/* ★ ここが修正された英語メッセージ */}
                <Text style={styles.surveyCompletionMessageTextBubble}>
                  Thank you for your responses. {"\n"}
                  Since Luna is currently busy studying Japanese, chat messages
                  are limited to 10 per day.{"\n"}
                  We’ll do our best to increase this limit in the future!{"\n"}
                  If you’d like to report one of Luna’s messages while chatting,
                  just long-press it.{"\n"}
                  {"\n"}
                  Let’s chat!
                </Text>
              </View>
              <Image
                source={AI_CHARACTER_IMAGE}
                style={styles.surveyCompletionAvatarCentered}
              />
            </View>
          )}
        </ScrollView>

        {/* ナビゲーションボタン */}
        <View style={styles.navigationButtonsContainer}>
          {currentQuestionIndex > 0 && (
            <TouchableOpacity onPress={handlePrevious} style={styles.navButton}>
              <Text style={styles.navButtonText}>Previous</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleNext}
            disabled={!isAnswerSelected || isLoading}
            style={[
              styles.navButton,
              isLastQuestion && styles.submitButton,
              (!isAnswerSelected || isLoading) && styles.navButtonDisabled,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.navButtonText}>
                {isLastQuestion ? "Submit" : "Next"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  mainContentArea: {
    flex: 1,
    position: "relative",
  },
  scrollableContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 30,
    alignItems: "flex-start",
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    paddingBottom: 100, // ボタン領域のための余白
  },
  scrollableContentForLastQuestion: {
    paddingBottom: 350, // 完了メッセージとボタンのための余白
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 20,
    textAlign: "left",
    width: "100%",
  },
  description: {
    fontSize: 16,
    color: "#DDDDDD",
    textAlign: "left",
    marginBottom: 30,
    lineHeight: 24,
    width: "100%",
  },
  progressText: {
    fontSize: 14,
    color: "#AAAAAA",
    textAlign: "center",
    marginBottom: 20,
    width: "100%",
  },
  questionContainer: {
    width: "100%",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  questionText: {
    fontSize: 23,
    fontWeight: "bold",
    color: "white",
    marginBottom: 15,
    textAlign: "left",
  },
  optionsContainer: {
    width: "100%",
    alignItems: "flex-start",
  },
  optionButton: {
    backgroundColor: "#333333",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 5,
    width: "100%",
    alignItems: "flex-start",
  },
  selectedOption: {
    backgroundColor: "#4a43a1",
  },
  optionText: {
    fontSize: 16,
    color: "white",
  },
  textInput: {
    backgroundColor: "#333333",
    color: "white",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    fontSize: 16,
    width: "100%",
  },
  navigationButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    backgroundColor: "#121212",
    paddingTop: 10,
    paddingBottom: Math.max(
      20,
      Platform.OS === "ios" ? Constants.statusBarHeight : 20
    ),
    alignItems: "center",
  },
  navButton: {
    backgroundColor: "#4a43a1",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
    marginHorizontal: 5,
  },
  navButtonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  submitButton: {
    backgroundColor: "#1ac7af",
  },
  navButtonDisabled: {
    backgroundColor: "#555555",
    opacity: 0.6,
  },
  surveyCompletionMessageSectionCentered: {
    position: "absolute",
    bottom: 90 + (Platform.OS === "ios" ? Constants.statusBarHeight : 0),
    left: 0,
    right: 0,
    alignItems: "center",
    flexDirection: "column",
    paddingHorizontal: 10,
  },
  surveyCompletionMessageBubbleCentered: {
    maxWidth: "90%",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#333333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 8,
  },
  surveyCompletionAvatarCentered: {
    width: 100,
    height: 100,
    borderRadius: 35,
    marginTop: 8,
  },
  surveyCompletionMessageTextBubble: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "left",
  },
});
