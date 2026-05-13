import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import {
  Marker,
  Yamap,
  YamapInstance,
  YamapRef,
} from "react-native-yamap-plus";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

const IS_IOS = Platform.OS === "ios";

const ASTANA_CENTER = {
  lat: 51.128207,
  lon: 71.43042,
};

YamapInstance.init("ce7ae9bc-6304-4a13-ab0b-371eb259d222");

export default function HomeScreen() {
  const theme = useColorScheme();

  const mapRef = useRef<YamapRef>(null);

  const [isMapVisible, setIsMapVisible] = useState(!IS_IOS);

  useEffect(() => {
    if (!IS_IOS) return;

    const timeout = setTimeout(() => {
      setIsMapVisible(true);
    }, 1000);

    return () => clearTimeout(timeout);
  }, []);

  const handleZoom = (zoom: number) => {
    mapRef.current?.getCameraPosition((position) => {
      mapRef.current?.setZoom(position.zoom + zoom, 0);
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />

      {isMapVisible && (
        <Yamap
          ref={mapRef}
          nightMode={theme === "dark"}
          initialRegion={{
            lat: ASTANA_CENTER.lat,
            lon: ASTANA_CENTER.lon,
            zoom: 12,
          }}
          style={styles.map}
          rotateGesturesDisabled
          followUser={false}
          showUserPosition={false}
        >
          <Marker point={ASTANA_CENTER} />
        </Yamap>
      )}

      <View style={styles.controls}>
        <Pressable style={styles.button} onPress={() => handleZoom(1)}>
          <Text style={styles.text}>+</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={() => handleZoom(-1)}>
          <Text style={styles.text}>-</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: screenWidth,
    height: IS_IOS ? 850 : screenHeight,
  },
  controls: {
    position: "absolute",
    right: 20,
    bottom: 120,
    gap: 12,
  },
  button: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 28,
    fontWeight: "600",
  },
});
