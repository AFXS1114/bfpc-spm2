import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../theme/theme';

export default function SettingsScreen({ navigation }) {
  const [notifications, setNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Push Notifications</Text>
              <Text style={styles.rowDesc}>Receive alerts for transactions</Text>
            </View>
            <Switch
              trackColor={{ false: THEME.colors.bgCard, true: THEME.colors.accentSoft }}
              thumbColor={notifications ? THEME.colors.accent : THEME.colors.textSecondary}
              onValueChange={() => setNotifications(!notifications)}
              value={notifications}
            />
          </View>

          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Dark Mode</Text>
              <Text style={styles.rowDesc}>Experimental theme</Text>
            </View>
            <Switch
              trackColor={{ false: THEME.colors.bgCard, true: THEME.colors.accentSoft }}
              thumbColor={darkMode ? THEME.colors.accent : THEME.colors.textSecondary}
              onValueChange={() => setDarkMode(!darkMode)}
              value={darkMode}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Application info</Text>
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Market')}>
            <Text style={styles.rowLabel}>About This App</Text>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgMain,
  },
  content: {
    padding: 24,
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.bgCardAlt,
    padding: 16,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 10,
  },
  rowLabel: {
    fontSize: 16,
    color: THEME.colors.textPrimary,
    fontWeight: '500',
  },
  rowDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: THEME.colors.accent,
  },
});
