import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { StatusBar } from 'expo-status-bar';

import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import Screens
import HomeScreen from './src/screens/HomeScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import InfoScreen from './src/screens/InfoScreen';

// Custom Tab Bar
import CustomTabBar from './src/components/CustomTabBar';

// Context & Modals
import { RecordPriceProvider } from './src/context/RecordPriceContext';
import RecordPriceModal from './src/components/RecordPriceModal';

const Tab = createMaterialTopTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <RecordPriceProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Tab.Navigator
            tabBar={props => <CustomTabBar {...props} />}
            tabBarPosition="bottom"
            screenOptions={{
              swipeEnabled: true,
            }}
          >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Market" component={InfoScreen} />
            <Tab.Screen name="Reports" component={ReportsScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
          </Tab.Navigator>
          
          {/* Global Modals */}
          <RecordPriceModal />
        </NavigationContainer>
      </RecordPriceProvider>
    </SafeAreaProvider>
  );
}
