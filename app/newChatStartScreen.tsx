import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { scenarios, Scenario } from "../constants/scenarios";

const ScenarioItem: React.FC<{ scenario: Scenario }> = ({ scenario }) => {
  const handlePress = () => {
    router.push({
      pathname: "/chatScreen",
      params: { initialPrompt: scenario.prompt },
    });
  };

  return (
    <TouchableOpacity
      style={styles.scenarioItemContainer}
      onPress={handlePress}
    >
      <Ionicons
        name={scenario.icon as any}
        size={24}
        color="#202020"
        style={styles.scenarioIcon}
      />
      <Text style={styles.scenarioText}>{scenario.text}</Text>
    </TouchableOpacity>
  );
};

export default function NewChatStartScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            router.back();
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#202020" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Chat scenario</Text>
        </View>
        <View style={styles.headerRightPlaceholder}></View>
      </View>
      {/* <Text style={styles.screenTitle}>Select a chat scenario</Text> */}
      <FlatList
        data={scenarios}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ScenarioItem scenario={item} />}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContentContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.select({
      ios: 20,
      android: 30,
      default: 0, // iOS, Android 以外のプラットフォームの場合のデフォルト値
    }),
    paddingBottom: 10,
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
    width: 24 + 10, // 戻るボタンのサイズ(24) + paddingRight(10) に合わせる
  },
  screenTitle: {
    // 元のtitleスタイルを名称変更
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
    paddingHorizontal: 20,
    marginTop: 0, // ヘッダーとの間の不要なスペースをなくす
  },
  listContentContainer: {
    paddingHorizontal: 10,
  },
  row: {
    flex: 1,
    justifyContent: "space-around",
    marginBottom: 15,
  },
  scenarioItemContainer: {
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    paddingVertical: 25,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "30%",
    aspectRatio: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 5,
  },
  scenarioIcon: {
    marginBottom: 8,
  },
  scenarioText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
});
