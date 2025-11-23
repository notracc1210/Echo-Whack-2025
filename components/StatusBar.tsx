import { View, Text, StyleSheet } from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";

export function StatusBar() {
  return (
    <View style={styles.container}>
      <ExpoStatusBar style="dark" />
      <View style={styles.rightSide}>
        <View style={styles.battery}>
          <View style={styles.batteryOuter} />
          <View style={styles.batteryTip} />
          <View style={styles.batteryFill} />
        </View>
        <View style={styles.wifi} />
        <View style={styles.signal} />
      </View>
      <Text style={styles.time}>9:41</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 44,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.8)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  rightSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  battery: {
    width: 24,
    height: 12,
    position: "relative",
  },
  batteryOuter: {
    width: 22,
    height: 11,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 2,
    opacity: 0.35,
  },
  batteryTip: {
    width: 1.5,
    height: 4,
    backgroundColor: "#1A1A1A",
    opacity: 0.4,
    position: "absolute",
    right: -1.5,
    top: 3.5,
  },
  batteryFill: {
    width: 18,
    height: 7,
    backgroundColor: "#1A1A1A",
    position: "absolute",
    left: 2,
    top: 2,
    borderRadius: 1,
  },
  wifi: {
    width: 15,
    height: 11,
    backgroundColor: "#1A1A1A",
    borderRadius: 2,
  },
  signal: {
    width: 17,
    height: 11,
    backgroundColor: "#1A1A1A",
    borderRadius: 2,
  },
  time: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    letterSpacing: -0.5,
  },
});
