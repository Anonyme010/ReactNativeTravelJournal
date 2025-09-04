import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import GalleryScreen from "./features/photos/GalleryScreen";
import CameraScreen from "./features/camera/CameraScreen";
import { PhotoProvider } from "./context/PhotoContext"; // ✅ Contexte global

const Tab = createBottomTabNavigator();

export default function App() {
  // 🔎 Debug logs
  console.log("✅ GalleryScreen:", GalleryScreen);
  console.log("✅ CameraScreen:", CameraScreen);

  return (
    <PhotoProvider> {/* ✅ Fournit le contexte aux 3 onglets */}
      <NavigationContainer>
        <Tab.Navigator>
          <Tab.Screen name="Galerie" component={GalleryScreen} />
          <Tab.Screen name="Caméra" component={CameraScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </PhotoProvider>
  );
}
