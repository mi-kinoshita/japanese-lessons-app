import { useEffect, useState } from "react";
import { Stack, SplashScreen, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";

SplashScreen.preventAutoHideAsync();

const SURVEY_COMPLETED_KEY = "hasCompletedSurvey";

export default function RootLayout() {
  const [isSurveyCompleted, setIsSurveyCompleted] = useState<boolean | null>(
    null
  );
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function checkSurveyStatus() {
      try {
        const surveyCompleted = await AsyncStorage.getItem(
          SURVEY_COMPLETED_KEY
        );
        const completed = surveyCompleted === "true";
        setIsSurveyCompleted(completed);
      } catch (e) {
        console.error("Failed to load survey status:", e);
        setIsSurveyCompleted(false);
      } finally {
        setAppIsReady(true);
      }
    }

    checkSurveyStatus();
  }, []);

  useEffect(() => {
    if (appIsReady && isSurveyCompleted !== null) {
      SplashScreen.hideAsync();

      if (!isSurveyCompleted) {
        router.replace("/survey");
      } else {
        router.replace("/(tabs)");
      }
    }
  }, [appIsReady, isSurveyCompleted]);

  if (!appIsReady || isSurveyCompleted === null) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="survey" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="paymentScreen" options={{ headerShown: false }} />

        <Stack.Screen
          name="chatScreen"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="newChatStartScreen"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}
