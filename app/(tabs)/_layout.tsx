import { Tabs } from "expo-router";
import React from "react";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          justifyContent: "center",
          alignItems: "center",
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={"#202020"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chatListScreen"
        options={{
          title: "",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              size={24}
              color={"#202020"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="vocabulary"
        options={{
          title: "",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "bookmarks" : "bookmarks-outline"}
              size={24}
              color={"#202020"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "settings" : "settings-outline"}
              size={24}
              color={"#202020"}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
