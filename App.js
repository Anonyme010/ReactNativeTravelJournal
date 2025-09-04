import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import CalendarScreen from "./features/calendar/CalendarScreen";
import GalleryScreen from "./features/photos/GalleryScreen";

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Calendrier" component={CalendarScreen} />
        <Tab.Screen name="Galerie" component={GalleryScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
