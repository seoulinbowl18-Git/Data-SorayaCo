// Icon font loader for @react-native-vector-icons packages on Expo Go.
// Native dev/prod builds pick up fonts via autolinking from the config plugin
// in app.json; Expo Go still needs the .ttf loaded via expo-font. We register
// the family under the postScriptName the icon set uses ("Ionicons").
// Usage: const [loaded, error] = useIconFonts();

import { useFonts } from "expo-font";

// Static require so Metro bundles the .ttf as an asset (works on Expo Go & web).
// If you add more icon families, register them here with their postScriptName.
export const useIconFonts = (): readonly [boolean, Error | null] =>
  useFonts({
    Ionicons: require("@react-native-vector-icons/ionicons/fonts/Ionicons.ttf"),
  });
