import React, { useContext } from "react";
import { Platform, StyleSheet, View, Text } from "react-native";
import { Tabs } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { colors } from "@/src/theme";
import { useCart } from "@/src/context/CartContext";

function CartTabIcon({ color, size }: { color: string; size: number }) {
  const { count } = useCart();
  return (
    <View style={{ width: size + 12, height: size, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name="bag-outline" size={size} color={color} />
      {count > 0 ? (
        <View style={styles.badge} testID="cart-tab-badge">
          <Text style={styles.badgeText}>{count > 9 ? "9+" : String(count)}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", letterSpacing: 0.3 },
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: colors.divider,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Shop",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color, size }) => <CartTabIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <Ionicons name="menu-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
});
