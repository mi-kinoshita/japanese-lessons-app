import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Constants from "expo-constants";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  MakePurchaseResult,
  PURCHASES_ERROR_CODE,
  PurchasesPackage,
} from "react-native-purchases";
import { SafeAreaView } from "react-native-safe-area-context";

interface PackageItemProps {
  item: PurchasesPackage;
  isSelected: boolean;
  onPress: (item: PurchasesPackage) => void;
  isPopular?: boolean;
}

const PackageItem: React.FC<PackageItemProps> = ({
  item,
  isSelected,
  onPress,
  isPopular,
}) => (
  <TouchableOpacity
    style={[styles.packageItem, isSelected && styles.selectedPackageItem]}
    onPress={() => onPress(item)}
  >
    {isPopular && (
      <View style={styles.popularBadge}>
        <Text style={styles.popularBadgeText}>Popular</Text>
      </View>
    )}
    <Text style={styles.packageTitle}>
      {item.product.title || item.product.description}
    </Text>
    <Text style={styles.packagePrice}>{item.product.priceString}</Text>
    {item.product.description && (
      <Text style={styles.packageDescription}>{item.product.description}</Text>
    )}
  </TouchableOpacity>
);

const expoExtra = Constants.expoConfig?.extra;

const ENTITLEMENT_ID = expoExtra?.EXPO_PUBLIC_ENTITLEMENT_ID;

const PaymentScreen = () => {
  const navigation = useNavigation();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [selectedPackage, setSelectedPackage] =
    useState<PurchasesPackage | null>(null);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // RevenueCat の設定と購入情報の取得を統合した単一の useEffect
  useEffect(() => {
    const setupRevenueCatAndFetchData = async () => {
      try {
        setLoading(true);

        // RevenueCatの設定
        Purchases.setLogLevel(LOG_LEVEL.DEBUG); // デバッグログ有効化

        if (!Purchases.isConfigured) {
          if (!expoExtra) {
            throw new Error(
              ".env variables are not loaded correctly. Ensure app.config.js is set up and .env exists."
            );
          }

          if (Platform.OS === "android") {
            if (!expoExtra.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY) {
              throw new Error("Android API key is not defined in .env");
            }
            await Purchases.configure({
              apiKey: expoExtra.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
            });
          } else if (Platform.OS === "ios") {
            if (!expoExtra.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY) {
              throw new Error("iOS API key is not defined in .env");
            }
            await Purchases.configure({
              apiKey: expoExtra.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
            });
          } else {
            throw new Error("Unsupported platform");
          }
        }

        // RevenueCat が設定されたので、購入情報を取得する
        const customerInfo: CustomerInfo = await Purchases.getCustomerInfo();
        if (ENTITLEMENT_ID) {
          setIsSubscribed(
            customerInfo.entitlements.all[ENTITLEMENT_ID]?.isActive === true
          );
        } else {
          console.warn(
            "ENTITLEMENT_ID is not defined, cannot check subscription status."
          );
          setIsSubscribed(false); // ENTITLEMENT_ID がなければ購読状態は確認できない
        }

        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages) {
          const availablePackages = offerings.current.availablePackages;
          setPackages(availablePackages);
        } else {
          setPurchaseError(
            "利用可能なプランが見つかりませんでした。RevenueCatダッシュボードとApp Store Connect/Google Play Consoleの設定を確認してください。"
          );
        }

        // カスタマー情報のリスナーを設定 (アプリ実行中に購読状態が変わった場合)
        Purchases.addCustomerInfoUpdateListener(
          (customerInfo: CustomerInfo) => {
            if (ENTITLEMENT_ID) {
              setIsSubscribed(
                customerInfo.entitlements.all[ENTITLEMENT_ID]?.isActive === true
              );
            } else {
              console.warn("ENTITLEMENT_ID is not defined.");
              setIsSubscribed(false);
            }
          }
        );
      } catch (error: any) {
        console.error("RevenueCat setup or data fetch error:", error);
        setPurchaseError(
          `課金情報の初期設定に失敗しました: ${error.message || error}`
        );
        Alert.alert(
          "エラー",
          `課金情報の初期設定または取得に失敗しました: ${
            error.message || error
          }`,
          [{ text: "OK" }]
        );
      } finally {
        setLoading(false);
      }
    };

    setupRevenueCatAndFetchData();

    // クリーンアップ関数: コンポーネントアンマウント時にリスナーを削除
    return () => {
      try {
        Purchases.removeCustomerInfoUpdateListener(() => {});
      } catch (e) {
        console.warn("Error removing customer info update listener:", e);
      }
    };
  }, []); // 初回マウント時のみ実行

  useEffect(() => {
    navigation.setOptions({
      headerTitle: isSubscribed ? "Premium Activated" : "Upgrade to Premium",
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
    });
  }, [navigation, isSubscribed]);

  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert("エラー", "プランを選択してください。");
      return;
    }
    try {
      setPurchaseError(null);
      setLoading(true);

      // 実際の購入処理を開始
      const purchaseResult: MakePurchaseResult =
        await Purchases.purchasePackage(selectedPackage);

      // 購入結果の確認 (RevenueCat のエンタイトルメントをチェック)
      if (
        ENTITLEMENT_ID &&
        purchaseResult?.customerInfo?.entitlements?.all[ENTITLEMENT_ID]
          ?.isActive
      ) {
        setIsSubscribed(true);
        Alert.alert(
          "購入完了",
          "サブスクリプションの購入が完了しました。ありがとうございます！",
          [
            {
              text: "OK",
              onPress: () => {
                router.back(); // 購入成功後、前の画面に戻るなど
              },
            },
          ]
        );
      } else {
        // エンタイトルメントが付与されなかった場合 (購入キャンセル、エラーなど)
        // 購入キャンセル時はエラーハンドリングで捕捉されるため、ここは主にストア側での予期しない挙動や設定ミスの場合
        console.warn("Purchase did not result in active entitlement.");
        // 必要に応じてユーザーに通知
      }
    } catch (error: any) {
      // 購入がキャンセルされた場合、ストア側で問題があった場合などのエラーハンドリング
      if (error.userCancelled) {
        console.log("Purchase was cancelled:", error);
        setPurchaseError("購入がキャンセルされました。");
      } else if (error.code === PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR) {
        console.error("Store problem during purchase:", error);
        setPurchaseError(
          "ストア側で問題が発生しました。後でもう一度お試しください。"
        );
      } else {
        console.error("Error purchasing package:", error);
        setPurchaseError(error.message || "購入処理中にエラーが発生しました。");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestorePurchase = async () => {
    try {
      setLoading(true);
      // 購入情報の復元処理を開始
      const restoredPurchases: CustomerInfo =
        await Purchases.restorePurchases();

      // 復元後のエンタイトルメントを確認
      if (
        ENTITLEMENT_ID &&
        restoredPurchases?.entitlements?.all[ENTITLEMENT_ID]?.isActive
      ) {
        setIsSubscribed(true);
        Alert.alert("復元成功", "購入情報を復元しました。");
        // 復元成功後、前の画面に戻るなど
        router.back();
      } else {
        Alert.alert("復元失敗", "復元できる購入情報が見つかりませんでした。");
      }
    } catch (error: any) {
      console.error("Error restoring purchases:", error);
      Alert.alert("エラー", "購入情報の復元中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = handlePurchase; // 続行ボタンは購入処理に紐付け

  // ロード中の表示
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>課金情報を読み込み中...</Text>
      </View>
    );
  }

  // すでに購読中の場合の表示
  if (isSubscribed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              router.back(); // 戻るボタン
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitleText}>Premium Activated</Text>
          </View>
          <View style={styles.headerRightPlaceholder}></View>
        </View>
        <View style={styles.subscribedContainer}>
          <Text style={styles.subscribedText}>
            すでにサブスクリプションに加入しています。
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.goBackButton}
          >
            <Text style={styles.goBackButtonText}>アプリに戻る</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // プラン選択画面の表示
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            router.back(); // 戻るボタン
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitleText}>LunaTalk PRO</Text>
        </View>
        <View style={styles.headerRightPlaceholder}></View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentContainer}>
          <View style={styles.imageContainer}>
            {/* assets のパスは新しいプロジェクトに合わせて調整してください */}
            <Image
              source={require("../assets/images/4coma.png")}
              resizeMode="contain"
              style={styles.mainImage}
              defaultSource={require("../assets/images/4coma.png")} // fallback image
            />
          </View>
          <View style={styles.section}>
            <View style={styles.infoContainer}>
              <Text style={styles.title}>Unlimited Chat Practice</Text>
            </View>
            <View style={styles.plansContainer}>
              {packages.length > 0 ? (
                packages.map((item) => (
                  <PackageItem
                    key={item.identifier}
                    item={item}
                    isSelected={selectedPackage?.identifier === item.identifier}
                    onPress={setSelectedPackage}
                    // RevenueCatダッシュボードでPopularなどのタグを設定している場合は、
                    // item.offeringIdentifier などで判定することも検討できます。
                    isPopular={item.packageType === "MONTHLY"} // 例として月額をPopularに設定
                  />
                ))
              ) : (
                // プランが見つからない場合の表示
                <Text style={styles.loadingText}>
                  利用可能なプランがありません。
                </Text>
              )}
            </View>
            {/* 購入処理中にエラーが発生した場合に表示 */}
            {purchaseError && <Text style={styles.error}>{purchaseError}</Text>}
            <TouchableOpacity
              style={[
                styles.continueButton,
                // プランが選択されていないか、処理中の場合はボタンを無効化
                !selectedPackage || loading
                  ? styles.continueButtonDisabled
                  : null,
              ]}
              onPress={handleContinue}
              disabled={!selectedPackage || loading} // ボタンの無効/有効状態
            >
              {/* 処理中はテキストを変更 */}
              <Text style={styles.continueText}>
                {loading ? "処理中..." : "続行"}
              </Text>
            </TouchableOpacity>
            {/* 購入復元ボタン */}
            <TouchableOpacity onPress={handleRestorePurchase}>
              <Text style={styles.restoreText}>購入情報を復元</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
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
    paddingBottom: 10,
    paddingTop: 10,
    backgroundColor: "#fff",
  },
  backButton: {
    padding: 5,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
  },
  headerRightPlaceholder: {
    width: 38, // 戻るボタンと同じくらいの幅でplaceholderを置いて中央寄せを保つ
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  contentContainer: {
    flexDirection: "column",
  },
  imageContainer: {
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  mainImage: {
    width: "100%",
    height: 300, // 画像の高さは適宜調整
    borderRadius: 0,
    alignSelf: "center",
  },
  section: {
    backgroundColor: "white",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingVertical: 30,
    paddingHorizontal: 30,
    // minHeight: "100%", // ScrollView内で使う場合は minHeight 100% は避ける
    flex: 1, // スクロール可能な領域でコンテンツが下部に詰まらないように
  },
  infoContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  featuresList: {
    width: "100%",
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  featureCheck: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 10,
  },
  featureText: {
    fontSize: 16,
    color: "#333",
  },
  plansContainer: {
    width: "100%",
    flexDirection: "column",
    marginBottom: 20,
  },
  packageItem: {
    flexDirection: "column", // レイアウトを縦に変更
    justifyContent: "center",
    alignItems: "flex-start", // テキストを左寄せ
    padding: 15,
    borderRadius: 25,
    backgroundColor: "white",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    position: "relative",
    width: "100%",
  },
  selectedPackageItem: {
    borderColor: "#FFD700", // 選択時の枠線色
    borderWidth: 2,
  },
  popularBadge: {
    position: "absolute",
    top: -10, // item の少し上
    right: 10, // item の右
    backgroundColor: "#FFD700",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 15,
    elevation: 3, // Android の影
    zIndex: 1, // 他の要素より手前に表示
  },
  popularBadgeText: {
    color: "#333", // テキスト色
    fontWeight: "bold",
    fontSize: 10, // 小さめのフォントサイズ
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5, // 下に少しスペース
    textAlign: "left",
    flex: 1, // 残りのスペースを埋めるように (flexDirection: 'row' 時の名残かも)
  },
  packagePrice: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
    // textAlign: "right", // flexDirection: 'column' なので不要
    alignSelf: "flex-end", // 右端に配置
  },
  packageDescription: {
    fontSize: 14,
    color: "#888",
    marginTop: 5,
    textAlign: "left",
    width: "100%", // 全幅を使う
  },
  continueButton: {
    width: "100%",
    padding: 15,
    marginTop: 20,
    borderRadius: 25,
    backgroundColor: "#4a43a1", // ボタンの背景色
    alignItems: "center", // テキストを中央寄せ
    marginBottom: 10,
  },
  continueButtonDisabled: {
    backgroundColor: "#cccccc", // 無効時の背景色
  },
  continueText: {
    color: "white", // テキスト色
    fontSize: 18,
    fontWeight: "bold",
  },
  restoreText: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
    textDecorationLine: "underline", // 下線
  },
  error: {
    color: "red",
    marginBottom: 10,
    textAlign: "center",
    padding: 10,
    backgroundColor: "rgba(255, 0, 0, 0.05)", // 薄い赤の背景
    borderRadius: 5,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
    textAlign: "center", // 中央寄せ
    width: "100%", // 全幅を使う
  },
  subscribedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  subscribedText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  goBackButton: {
    backgroundColor: "#4a43a1",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
  },
  goBackButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default PaymentScreen;
