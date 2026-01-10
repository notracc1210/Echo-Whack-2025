module.exports = {
  expo: {
    name: "Whack 2025",
    slug: "whack-2025",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    splash: {
      backgroundColor: "#ffffff",
      resizeMode: "contain"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.whack2025.app",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "This app needs access to your location to match you with nearby volunteers/events and show your position on the map."
      }
    },
    android: {
      package: "com.whack2025.app",
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION"
      ]
    },
    plugins: [
      "expo-font",
      [
        "expo-notifications",
        {
          color: "#ffffff"
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow Whack 2025 to use your location."
        }
      ]
    ],
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.0.18:3001"
    }
  }
};

