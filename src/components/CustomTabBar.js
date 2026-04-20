import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme/theme';
import { useRecordPrice } from '../context/RecordPriceContext';

const { width } = Dimensions.get('window');

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { showModal } = useRecordPrice();
  
  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // Get icon name based on route
          let iconName;
          if (route.name === 'Home') {
            iconName = isFocused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Market') {
            iconName = isFocused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Reports') {
            iconName = isFocused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Settings') {
            iconName = isFocused ? 'settings' : 'settings-outline';
          }

          // If it's the middle element (we have 4 tabs + 1 center FAB)
          // We'll insert the FAB in the middle (index 2)
          const isSecondHalf = index >= 2;

          return (
            <React.Fragment key={route.key}>
              {index === 2 && <View style={styles.fabPlaceholder} />}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tabItem}
              >
                <Ionicons 
                  name={iconName} 
                  size={20} 
                  color={isFocused ? THEME.colors.accent : THEME.colors.textSecondary} 
                />
                <Text style={[
                  styles.tabLabel, 
                  { color: isFocused ? THEME.colors.accent : THEME.colors.textSecondary }
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={showModal}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color={THEME.colors.bgMain} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    width: '100%',
    height: 70,
    backgroundColor: '#08171d',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  fabPlaceholder: {
    width: 60,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    width: 64,
    height: 64,
    backgroundColor: THEME.colors.accent,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...THEME.shadow.glow,
  },
});

export default CustomTabBar;
