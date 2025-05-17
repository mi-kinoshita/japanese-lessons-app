// app.config.js
import "dotenv/config";

export default ({ config }) => {
  return {
    name: "lunaTalk",
    slug: "lunaTalk",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "lunatalksecound",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.miadesign.lunaTalk",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription:
          "This app allows you to select a photo from your photo library to register your profile picture.",
        NSUserNotificationUsageDescription:
          "This app uses notifications to send you daily practice reminders.",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#000",
      },
      package: "com.miadesign.lunaTalk",
      edgeToEdgeEnabled: true,
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#000",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: "9c8dcdea-3866-4389-b920-2a6ed7b26395",
      },
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      // EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY:
      //   process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
      EXPO_PUBLIC_REVENUECAT_IOS_API_KEY:
        process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
      EXPO_PUBLIC_ENTITLEMENT_ID: process.env.EXPO_PUBLIC_ENTITLEMENT_ID,
    },
    owner: "miadesign",
  };
};
