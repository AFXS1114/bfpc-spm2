import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions,
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';

const { width } = Dimensions.get('window');

export default function MarketScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [speciesList, setSpeciesList] = useState([]);
  const [marketStats, setMarketStats] = useState({
    topGainer: { name: '-', change: '0%', price: '0', isNeg: false },
    topVolume: { name: '-', volume: '0', price: '0' },
    supplyIndex: []
  });
  const [chartData, setChartData] = useState({
    labels: ["00:00"],
    datasets: [{ data: [0] }]
  });

  const fetchMarketData = useCallback(async () => {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

      // 1. Fetch species and all recent transactions
      const [speciesRes, todayTransRes, yesterdayTransRes] = await Promise.all([
        supabase.from('species').select('*').order('local_name'),
        supabase.from('transactions').select('*').eq('manual_date', today),
        supabase.from('transactions').select('*').eq('manual_date', yesterday)
      ]);

      if (speciesRes.error) throw speciesRes.error;
      const species = speciesRes.data || [];
      const todayTrans = todayTransRes.data || [];
      const yesterdayTrans = yesterdayTransRes.data || [];

      // 2. Calculate Stats Per Species
      const stats = species.map(s => {
        const sToday = todayTrans.filter(t => t.species_name.toLowerCase() === s.local_name.toLowerCase());
        const sYest = yesterdayTrans.filter(t => t.species_name.toLowerCase() === s.local_name.toLowerCase());

        const avgToday = sToday.length > 0 
          ? sToday.reduce((acc, curr) => acc + curr.price_per_unit, 0) / sToday.length 
          : 0;
        
        const avgYest = sYest.length > 0 
          ? sYest.reduce((acc, curr) => acc + curr.price_per_unit, 0) / sYest.length 
          : 0;

        const totalVol = sToday.reduce((acc, curr) => acc + curr.volume, 0);

        let changePct = 0;
        if (avgYest > 0 && avgToday > 0) {
          changePct = ((avgToday - avgYest) / avgYest) * 100;
        }

        return {
          id: s.id,
          name: s.local_name,
          price: avgToday,
          volume: totalVol,
          change: changePct.toFixed(1) + '%',
          isNeg: changePct < 0,
          rawChange: changePct
        };
      });

      // 3. Find Top Gainer/Loser and Top Volume
      const sortedByChange = [...stats].sort((a, b) => Math.abs(b.rawChange) - Math.abs(a.rawChange));
      const sortedByVolume = [...stats].sort((a, b) => b.volume - a.volume);

      setMarketStats({
        topGainer: sortedByChange[0] || marketStats.topGainer,
        topVolume: sortedByVolume[0] || marketStats.topVolume,
        supplyIndex: stats
      });

      // 4. Prepare Chart Data (Correlation for top volume fish)
      if (sortedByVolume[0] && sortedByVolume[0].volume > 0) {
        const topFish = sortedByVolume[0].name;
        const fishTrans = todayTrans
          .filter(t => t.species_name.toLowerCase() === topFish.toLowerCase())
          .sort((a, b) => a.manual_time.localeCompare(b.manual_time));

        if (fishTrans.length > 0) {
          setChartData({
            labels: fishTrans.map(t => t.manual_time.slice(0, 5)),
            datasets: [{ 
              data: fishTrans.map(t => t.price_per_unit),
              color: (opacity = 1) => `rgba(47, 212, 198, ${opacity})`,
              strokeWidth: 2
            }]
          });
        }
      }

    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketData();

    const channel = supabase
      .channel('market-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchMarketData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMarketData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMarketData();
  };
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

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.accent} />}
      >
        <Text style={styles.mainTitle}>Market Analytics</Text>

        {/* Section: Price vs Volume Correlation */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartHeaderText}>Price Pulse: {marketStats.topVolume.name}</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <Text style={styles.chartSubtitle}>Real-time price trend based on arrivals</Text>
          {loading ? (
             <ActivityIndicator color={THEME.colors.accent} style={{ height: 140 }} />
          ) : (
            <LineChart
              data={chartData}
              width={width - 48}
              height={160}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={false}
            />
          )}
        </View>

        {/* Gainer/Loser Cards Row */}
        <View style={styles.row}>
          <View style={[styles.miniCard, marketStats.topGainer.isNeg ? styles.borderLeftNegative : styles.borderLeftPositive]}>
            <Text style={[styles.miniCardTitle, marketStats.topGainer.isNeg && { color: THEME.colors.negative }]}>
              {marketStats.topGainer.isNeg ? "Top Loser" : "Top Gainer"}
            </Text>
            <MiniCardRow label={marketStats.topGainer.name} val={marketStats.topGainer.change} isNeg={marketStats.topGainer.isNeg} />
            <MiniCardRow label="Avg Price" val={`₱${marketStats.topGainer.price}`} />
          </View>
          
          <View style={[styles.miniCard, { borderLeftColor: THEME.colors.gold, borderLeftWidth: 3 }]}>
            <Text style={[styles.miniCardTitle, { color: THEME.colors.gold }]}>Market Leader</Text>
            <MiniCardRow label={marketStats.topVolume.name} val={`${marketStats.topVolume.volume} Tubs`} isGold />
            <MiniCardRow label="Avg Price" val={`₱${marketStats.topVolume.price}`} isGold />
          </View>
        </View>

        {/* Table Section: Supply/Demand Index */}
        <View style={styles.tableCard}>
          <Text style={styles.tableTitle}>Supply/Demand Index</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.colHeader}>Specie</Text>
            <Text style={styles.colHeader}>Avg Price</Text>
            <Text style={[styles.colHeader, { flex: 0.8 }]}>Volume</Text>
            <Text style={styles.colHeader}>Trend</Text>
          </View>
          {loading ? (
            <ActivityIndicator color={THEME.colors.accent} style={{ padding: 20 }} />
          ) : marketStats.supplyIndex.length > 0 ? (
            marketStats.supplyIndex.map((item) => (
              <TableRow 
                key={item.id}
                name={item.name} 
                p1={`₱${Math.round(item.price)}`} 
                v={item.volume} 
                p2={item.change} 
                pos={!item.isNeg && item.price > 0} 
                neg={item.isNeg} 
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No market activity recorded today</Text>
          )}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.02)',
  },
  colText: {
    flex: 1,
    color: THEME.colors.textPrimary,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyText: {
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
    fontStyle: 'italic',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.negative,
    marginRight: 6,
  },
  liveText: {
    color: THEME.colors.negative,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
