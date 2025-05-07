import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const USER_SETTINGS_KEY = "userSettings";
const SURVEY_ANSWERS_KEY = "surveyAnswers";
const NOTIFICATION_REMINDERS_ENABLED_KEY = "notificationRemindersEnabled";
const DAILY_REMINDER_NOTIFICATION_ID = "dailyJapaneseReminder";

interface UserSettings {
  profileImageUri: string | null;
  username: string | null;
}

const defaultUserSettings: UserSettings = {
  profileImageUri: null,
  username: null,
};

export default function SettingsScreen() {
  const [userSettings, setUserSettings] =
    useState<UserSettings>(defaultUserSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [areRemindersEnabled, setAreRemindersEnabled] = useState(false);

  const [savedAnswers, setSavedAnswers] = useState<{
    [key: string]: any;
  } | null>(null);

  const characterSettingOptions = [
    "Level 1 romaji",
    "Level 2 also hiragana",
    "Level 3 also katakana",
    "Level 4 also kanji",
  ];

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedSettings = await AsyncStorage.getItem(USER_SETTINGS_KEY);
        let initialUserSettings: UserSettings = defaultUserSettings;

        if (storedSettings) {
          const parsedSettings: UserSettings = JSON.parse(storedSettings);
          initialUserSettings = {
            profileImageUri: parsedSettings.profileImageUri || null,
            username: parsedSettings.username || null,
          };
        }

        const storedSurveyAnswers = await AsyncStorage.getItem(
          SURVEY_ANSWERS_KEY
        );
        let surveyAnswers: { [key: string]: any } = {};

        if (storedSurveyAnswers) {
          surveyAnswers = JSON.parse(storedSurveyAnswers);
          setSavedAnswers(surveyAnswers);
        } else {
          surveyAnswers = { q3: characterSettingOptions[0] };
          setSavedAnswers(surveyAnswers);
        }

        setUserSettings({
          ...initialUserSettings,
          username:
            initialUserSettings.username ||
            surveyAnswers.username ||
            defaultUserSettings.username,
        });

        const remindersEnabled = await AsyncStorage.getItem(
          NOTIFICATION_REMINDERS_ENABLED_KEY
        );
        setAreRemindersEnabled(remindersEnabled === "true");
      } catch (error) {
        console.error("Failed to load settings:", error);
        Alert.alert("Error", "Failed to load settings.");
        setUserSettings(defaultUserSettings);
        setSavedAnswers({});
        setAreRemindersEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const saveSetting = async (key: keyof UserSettings, value: any) => {
    setIsSaving(true);
    try {
      const updatedSettings = {
        ...userSettings,
        [key]: value,
      };
      await AsyncStorage.setItem(
        USER_SETTINGS_KEY,
        JSON.stringify(updatedSettings)
      );
      setUserSettings(updatedSettings);
    } catch (error) {
      console.error(`Failed to save setting ${key}:`, error);
      Alert.alert("Error", `Failed to save ${key}.`);
    } finally {
      setIsSaving(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "This app allows you to select a photo from your photo library to register your profile picture."
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedImageUri = result.assets[0].uri;
      saveSetting("profileImageUri", selectedImageUri);
    }
  };

  const handleUsernameChange = (text: string) => {
    setUserSettings((prev) => ({ ...prev, username: text }));
  };

  const handleUsernameSubmit = () => {
    saveSetting("username", userSettings.username);
  };

  const handleCharacterSettingSelect = async (setting: string) => {
    if (savedAnswers?.q3 === setting) {
      return;
    }
    setIsSaving(true);
    try {
      const storedSurveyAnswers = await AsyncStorage.getItem(
        SURVEY_ANSWERS_KEY
      );
      let currentSurveyAnswers = storedSurveyAnswers
        ? JSON.parse(storedSurveyAnswers)
        : {};

      const updatedSurveyAnswers = {
        ...currentSurveyAnswers,
        q3: setting,
      };

      await AsyncStorage.setItem(
        SURVEY_ANSWERS_KEY,
        JSON.stringify(updatedSurveyAnswers)
      );
      setSavedAnswers(updatedSurveyAnswers);
    } catch (error) {
      console.error("Failed to save character setting:", error);
      Alert.alert("Error", "Failed to save character setting.");
    } finally {
      setIsSaving(false);
    }
  };

  async function requestNotificationPermissions() {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === "granted";
  }

  const handleReminderToggle = async () => {
    setIsSaving(true);
    if (areRemindersEnabled) {
      try {
        await Notifications.cancelScheduledNotificationAsync(
          DAILY_REMINDER_NOTIFICATION_ID
        );
        await AsyncStorage.setItem(NOTIFICATION_REMINDERS_ENABLED_KEY, "false");
        setAreRemindersEnabled(false);
        Alert.alert("Okay, Off!", "Your daily reminders are now off.");
      } catch (error) {
        console.error("Failed to disable reminders:", error);
        Alert.alert("Error", "Failed to disable reminders.");
      } finally {
        setIsSaving(false);
      }
    } else {
      const permissionsGranted = await requestNotificationPermissions();

      if (permissionsGranted) {
        try {
          await Notifications.cancelScheduledNotificationAsync(
            DAILY_REMINDER_NOTIFICATION_ID
          );

          const notificationContent = {
            title: "Hi there! Practice time 😊",
            body: "Let's have fun Japanese time!",
            sound: "default" as any,
          };

          // --- テスト用のトリガー (seconds) ---
          // const trigger = {
          //   seconds: 5,
          //   repeats: false,
          //   type: SchedulableTriggerInputTypes.TIME_INTERVAL, // 列挙体を使用
          // } as const;
          // ---------------------------------

          // --- 開発・運用時（毎日特定の時間） ---

          const trigger = {
            repeats: true,
            hour: 20,
            minute: 0,
            type: SchedulableTriggerInputTypes.CALENDAR,
          } as const;

          await Notifications.scheduleNotificationAsync({
            content: notificationContent,
            trigger: trigger,
            identifier: DAILY_REMINDER_NOTIFICATION_ID,
          });

          await AsyncStorage.setItem(
            NOTIFICATION_REMINDERS_ENABLED_KEY,
            "true"
          );
          setAreRemindersEnabled(true);
          Alert.alert(
            "All Set!",
            `You'll get a friendly reminder at 8:00 PM daily.`
          );
        } catch (error) {
          console.error("Failed to schedule reminders:", error);
          Alert.alert("Error", "Failed to schedule reminders.");
        } finally {
          setIsSaving(false);
        }
      } else {
        Alert.alert(
          "Permission Required",
          "Please enable notifications in your device settings to receive reminders."
        );
        setIsSaving(false);
      }
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a43a1" />
        <Text style={styles.loadingText}>Loading Settings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuIcon} onPress={() => {}}>
            <Ionicons name="heart" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>
          <View style={styles.headerRightPlaceholder}></View>
        </View>
        <View style={styles.content}>
          <TouchableOpacity
            onPress={pickImage}
            style={styles.profileImageContainer}
          >
            <Image
              source={
                userSettings.profileImageUri
                  ? { uri: userSettings.profileImageUri }
                  : require("../../assets/images/wakuwaku.png")
              }
              style={styles.profileImage}
            />
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={24} color="white" />
            </View>
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Username</Text>
            <TextInput
              style={styles.textInput}
              value={userSettings.username || ""}
              onChangeText={handleUsernameChange}
              onBlur={handleUsernameSubmit}
              placeholder="Enter your username"
              placeholderTextColor="#999"
              editable={!isSaving}
            />
          </View>

          <View style={[styles.settingItem]}>
            <Text style={styles.settingLabel}>Level</Text>
            {savedAnswers !== null ? (
              <View style={styles.radioButtonGroup}>
                {characterSettingOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.radioButtonItem}
                    onPress={() => handleCharacterSettingSelect(option)}
                    disabled={isSaving}
                  >
                    <View style={styles.radioButtonCircle}>
                      {savedAnswers.q3 === option && (
                        <View style={styles.radioButtonInnerCircle} />
                      )}
                    </View>
                    <Text style={styles.radioButtonLabel}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <ActivityIndicator color="#4a43a1" />
            )}
          </View>

          <View
            style={[
              styles.settingItem,
              styles.notificationSettingItem,
              styles.borderBottom,
            ]}
          >
            <Text style={styles.settingLabel}>Daily Practice Reminder</Text>
            <TouchableOpacity
              style={styles.reminderButton}
              onPress={handleReminderToggle}
              disabled={isSaving}
            >
              <Text style={styles.reminderButtonText}>
                {areRemindersEnabled
                  ? "Disable Reminders"
                  : "Enable Daily Reminders"}
              </Text>
            </TouchableOpacity>
            {areRemindersEnabled && (
              <Text style={styles.scheduledTimeText}>
                Reminders are scheduled for 8:00 PM daily.
              </Text>
            )}
          </View>

          <View style={styles.linksSection}>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL(
                  "https://docs.google.com/forms/d/e/1FAIpQLSdIiaBK_bxLC4ls5-nnp6CMLaz3-3dTNC62WohrQVHmdO9FMg/viewform?usp=dialog"
                )
              }
              style={styles.linkItemWithIcon}
            >
              <Ionicons
                name="mail-outline"
                size={24}
                color="#202020"
                style={styles.linkIcon}
              />
              <Text style={styles.linkText}>Contact</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL("https://www.youtube.com/@aituber_luna")
              }
              style={styles.linkItemWithIcon}
            >
              <Ionicons
                name="logo-youtube"
                size={24}
                color="#202020"
                style={styles.linkIcon}
              />
              <Text style={styles.linkText}>Youtube</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.linksSection}>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL(
                  "https://www.freeprivacypolicy.com/live/f90c33d9-5721-4d67-ad51-614a93f0127b"
                )
              }
              style={styles.linkItemWithIcon}
            >
              <Ionicons
                name="document-text-outline"
                size={24}
                color="#202020"
                style={styles.linkIcon}
              />
              <Text style={styles.linkText}>Terms and Conditions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL(
                  "https://www.freeprivacypolicy.com/live/5d8f70fa-81bc-4467-8899-14ec37bc190d"
                )
              }
              style={styles.linkItemWithIcon}
            >
              <Ionicons
                name="document-text-outline"
                size={24}
                color="#202020"
                style={styles.linkIcon}
              />
              <Text style={styles.linkText}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "white",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
  headerRightPlaceholder: {
    width: 28 + 5 * 2,
  },
  content: {
    paddingTop: 10,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  profileImageContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f0f0f0",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#4a43a1",
    borderRadius: 20,
    padding: 5,
  },
  settingItem: {
    width: "100%",
    marginBottom: 20,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 15,
    marginBottom: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#202020",
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: "#eee",
    color: "#000",
    paddingVertical: 12,
    paddingHorizontal: 13,
    marginHorizontal: 8,
    borderRadius: 10,
    fontSize: 16,
  },
  radioButtonGroup: {},
  radioButtonItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  radioButtonCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#aaa",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "#fff",
  },
  radioButtonInnerCircle: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: "#4a43a1",
  },
  radioButtonLabel: {
    fontSize: 16,
    color: "#000",
  },
  notificationSettingItem: {
    paddingBottom: 0,
  },
  reminderButton: {
    backgroundColor: "#4a43a1",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 10,
  },
  reminderButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  scheduledTimeText: {
    fontSize: 14,
    color: "#666",
    marginVertical: 10,
    paddingBottom: 10,
    textAlign: "center",
  },
  linksSection: {
    width: "100%",
    marginTop: 5,
    marginBottom: 10,
  },
  linksSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 10,
  },
  linkItemWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  linkIcon: {
    marginRight: 10,
  },
  linkText: {
    fontSize: 16,
    color: "#373737",
  },
});
