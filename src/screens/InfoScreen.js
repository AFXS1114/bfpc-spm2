import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

export default function InfoScreen({ navigation }) {
  // Chart 1: Price vs Volume
  const data1 = {
    labels: ["01 AM", "03 AM", "01 AM", "01 AM", "08 AM"],
    datasets: [{
      data: [6700, 7200, 8400, 7300, 9100],
      color: (opacity = 1) => `rgba(47, 212, 198, ${opacity})`,
      strokeWidth: 2
    }]
  };

  // Chart 2: Bangus Volume (Sparrow/Complex)
  const data2 = {
    labels: ["01 AM", "05 AM", "01 AM", "01 AM", "00 AM"],
    datasets: [{
      data: [5200, 5800, 6100, 5500, 7800, 6500, 7200, 5400, 8900],
      color: (opacity = 1) => `rgba(47, 212, 198, ${opacity})`,
      strokeWidth: 1.5
    }]
  };

  const chartConfig = {
    backgroundGradientFrom: THEME.colors.bgCard,
    backgroundGradientTo: THEME.colors.bgCard,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(47, 212, 198, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(155, 179, 189, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: THEME.colors.accent
    },
    propsForBackgroundLines: {
      stroke: "rgba(255, 255, 255, 0.05)"
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>Market Data</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.mainTitle}>Bulan Market Analytics</Text>

        {/* Section: Price vs Volume */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartHeaderText}>Price Species</Text>
            <TouchableOpacity style={styles.dropdown}>
              <Text style={styles.dropdownText}>7 days</Text>
              <Ionicons name="chevron-forward" size={14} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.chartSubtitle}>Price vs Volume (Last 24h)</Text>
          <LineChart
            data={data1}
            width={width - 48}
            height={140}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
          />
        </View>

        {/* Section: Bangus Volume */}
        <View style={styles.chartCard}>
          <Text style={styles.chartSubtitle}>Bangus Volume (Last 24h)</Text>
          <LineChart
            data={data2}
            width={width - 48}
            height={140}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Gainer/Loser Cards Row */}
        <View style={styles.row}>
          <View style={[styles.miniCard, styles.borderLeftPositive]}>
            <Text style={styles.miniCardTitle}>Top Gainer/Loser</Text>
            <MiniCardRow label="Lawlaw" val="₱2,000" />
            <MiniCardRow label="Volume" val="₱1,900" />
            <MiniCardRow label="Loser" val="-0.65%" isNeg />
          </View>
          <View style={[styles.miniCard, styles.borderLeftNegative]}>
            <Text style={[styles.miniCardTitle, { color: THEME.colors.negative }]}>Top Gainer</Text>
            <MiniCardRow label="Lawlaw" val="₱2,600" isGold />
            <MiniCardRow label="Volume" val="₱3,600" isGold />
            <MiniCardRow label="Loser" val="-1.25%" isNeg />
          </View>
        </View>

        {/* Table Section: Supply/Demand */}
        <View style={styles.tableCard}>
          <Text style={styles.tableTitle}>Supply/Demand Index</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.colHeader}>Specie</Text>
            <Text style={styles.colHeader}>Price</Text>
            <Text style={styles.colHeader}>Volume</Text>
            <Text style={styles.colHeader}>Price</Text>
          </View>
          <TableRow name="Tulingan" p1="1.60" v="1.60" p2="1.60" pos />
          <TableRow name="Bangus" p1="1.50" v="2,450" p2="3,500" neg />
          <TableRow name="Galungv" p1="2.10" v="3,100" p2="3,300" neg />
          <TableRow name="Oth" p1="1.20" v="1,200" p2="1,300" pos />
        </View>

      </ScrollView>

    </SafeAreaView>
  );
}

const MiniCardRow = ({ label, val, isNeg, isGold }) => (
  <View style={styles.miniRow}>
    <Text style={styles.miniLabel}>{label}</Text>
    <Text style={[
      styles.miniVal, 
      isNeg && { color: THEME.colors.negative },
      isGold && { color: THEME.colors.gold },
      !isNeg && !isGold && { color: THEME.colors.positive }
    ]}>
      {val}
    </Text>
  </View>
);

const TableRow = ({ name, p1, v, p2, pos, neg }) => (
  <View style={styles.tableRow}>
    <Text style={styles.colText}>{name}</Text>
    <Text style={[styles.colText, pos && {color: THEME.colors.positive}, neg && {color: THEME.colors.negative}]}>{p1}</Text>
    <Text style={[styles.colText, {color: THEME.colors.gold}]}>{v}</Text>
    <Text style={[styles.colText, {color: THEME.colors.gold}]}>{p2}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgMain,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  mainTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 20,
  },
  chartCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  chartHeaderText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownText: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    marginRight: 4,
  },
  chartSubtitle: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    marginBottom: 15,
  },
  chart: {
    marginLeft: -24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  miniCard: {
    flex: 1,
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  borderLeftPositive: {
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.positive,
  },
  borderLeftNegative: {
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.negative,
  },
  miniCardTitle: {
    color: THEME.colors.positive,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  miniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  miniLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
  },
  miniVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  tableCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  tableTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 8,
    marginBottom: 8,
  },
  colHeader: {
    flex: 1,
    color: THEME.colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.02)',
  },
  colText: {
    flex: 1,
    color: THEME.colors.textPrimary,
    fontSize: 13,
    textAlign: 'center',
  },
});
