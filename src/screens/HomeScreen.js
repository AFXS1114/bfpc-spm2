import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';
import Modal from 'react-native-modal';
import { Calendar } from 'react-native-calendars';
import AddSpeciesModal from '../components/AddSpeciesModal';
import SpecieLibraryModal from '../components/SpecieLibraryModal';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [species, setSpecies] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [trendData, setTrendData] = useState({ labels: [], datasets: [{ data: [] }] });
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('today'); // 'today', '7d', 'custom'
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [isAddSpeciesVisible, setIsAddSpeciesVisible] = useState(false);
  const [isSpecieLibraryVisible, setIsSpecieLibraryVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

  useEffect(() => {
    fetchData();
  }, [timeframe, selectedDate]);

  useEffect(() => {
    const speciesChannel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'species' }, (payload) => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(speciesChannel);
    };
  }, []);

  const fetchData = async (currentFrame = timeframe, targetDate = selectedDate) => {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const speciesRef = supabase.from('species').select('*').order('local_name');
      const recentTransRef = supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(6);
      const latestPricesRef = supabase.from('transactions')
        .select('species_name, price_per_unit, created_at')
        .order('created_at', { ascending: false });

      let trendQuery = supabase.from('transactions')
        .select('manual_date, manual_time, price_per_unit')
        .ilike('species_name', '%lawlaw%')
        .order('manual_date').order('manual_time');

      if (currentFrame === 'today') {
        trendQuery = trendQuery.eq('manual_date', today);
      } else if (currentFrame === '7d') {
        const last7Days = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
        trendQuery = trendQuery.gte('manual_date', last7Days);
      } else if (currentFrame === 'custom') {
        trendQuery = trendQuery.eq('manual_date', targetDate);
      }

      const [speciesRes, transRes, trendRes, pricesRes] = await Promise.all([
        speciesRef,
        recentTransRef,
        trendQuery,
        latestPricesRef
      ]);

      if (speciesRes.error) throw speciesRes.error;
      if (transRes.error) throw transRes.error;

      // Map latest prices to species
      const priceMap = (pricesRes.data || []).reduce((acc, curr) => {
        if (!acc[curr.species_name.toLowerCase()]) {
          acc[curr.species_name.toLowerCase()] = curr.price_per_unit;
        }
        return acc;
      }, {});

      const enrichedSpecies = (speciesRes.data || []).map(s => ({
        ...s,
        current_price: priceMap[s.local_name.toLowerCase()] || 0,
        change_percent: '+0.0' // Placeholder for now
      }));

      setSpecies(enrichedSpecies);
      setTransactions(transRes.data || []);

      // Process Trend Data
      if (trendRes.data && trendRes.data.length > 0) {
        let labels = [];
        let data = [];

        if (currentFrame === '7d') {
          // Aggregate by Day
          const dailyAvg = trendRes.data.reduce((acc, curr) => {
            const d = dayjs(curr.manual_date).format('MMM DD');
            if (!acc[d]) acc[d] = { sum: 0, count: 0 };
            acc[d].sum += curr.price_per_unit;
            acc[d].count += 1;
            return acc;
          }, {});

          labels = Object.keys(dailyAvg);
          data = labels.map(l => Math.round(dailyAvg[l].sum / dailyAvg[l].count));
        } else {
          // Hourly view (Today or Custom Day)
          labels = trendRes.data.map(t => t.manual_time.slice(0, 5));
          data = trendRes.data.map(t => t.price_per_unit);
        }

        setTrendData({
          labels,
          datasets: [{
            data,
            color: (opacity = 1) => `rgba(47, 212, 110, ${opacity})`,
            strokeWidth: 2
          }]
        });
      } else {
        // Mock/Empty data
        setTrendData({
          labels: ["No Data"],
          datasets: [{ data: [0], color: (opacity = 1) => `rgba(255, 255, 255, 0.1)`, strokeWidth: 2 }]
        });
      }
    } catch (error) {
      console.error('Error fetching Home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeframe, selectedDate]);

  const highlightedFish = species.find(s => s.local_name.toLowerCase().includes('lawlaw')) || species[0];

  const chartConfig = {
    backgroundGradientFrom: THEME.colors.bgCard,
    backgroundGradientTo: THEME.colors.bgCard,
    backgroundGradientFromOpacity: 0,
    backgroundGradientToOpacity: 0,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(155, 179, 189, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: "4", strokeWidth: "2", stroke: THEME.colors.accent },
    propsForBackgroundLines: { stroke: "rgba(255, 255, 255, 0.05)" }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={THEME.colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topHeader}>
        <View style={styles.locationGroup}>
          <Ionicons name="location-sharp" size={20} color={THEME.colors.accent} />
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationCity}>Bulan, Sorsogon</Text>
            <Text style={styles.locationLabel}>BULAN FISH PORT COMPLEX</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="search" size={22} color={THEME.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="notifications-outline" size={22} color={THEME.colors.textPrimary} />
            <View style={styles.badge} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Sea Condition & Market Pulse Section */}
        <View style={styles.pulseContainer}>
          <SeaConditionWidget />
          <MarketTicker species={species} />
        </View>

        {/* Quick Actions Row */}
        <View style={styles.quickActions}>
          <QuickActionItem
            icon="fish"
            label="Specie"
            onPress={() => setIsAddSpeciesVisible(true)}
          />
          <QuickActionItem
            icon="library-outline"
            label="Specie Library"
            onPress={() => setIsSpecieLibraryVisible(true)}
          />
          <QuickActionItem icon="calendar-outline" label="Forecast" />
          <QuickActionItem icon="boat-outline" label="Arriving" />
        </View>

        {/* Main Highlight Card */}
        {highlightedFish && (
          <TouchableOpacity style={styles.mainCard} activeOpacity={0.9}>
            <View style={styles.glassBackground} />
            <View style={styles.mainCardContent}>
              <View style={[styles.featuredFishImg, styles.placeholderImg]}>
                <Ionicons name="fish" size={60} color={THEME.colors.accent} />
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              </View>
              <View style={styles.featuredDetails}>
                <Text style={styles.tagline}>TRENDING SPECIE</Text>
                <Text style={styles.fishName}>{highlightedFish.local_name}</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceValue}>₱{highlightedFish.current_price?.toLocaleString() || '0'}</Text>
                  <Text style={styles.priceUnit}> {highlightedFish.unit || '/ Tub'}</Text>
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statChip}>
                    <Ionicons name="trending-up" size={14} color={THEME.colors.positive} />
                    <Text style={[styles.statNum, { marginLeft: 4 }]}>
                      {highlightedFish.change_percent || '+0.0'}%
                    </Text>
                  </View>
                  <Text style={styles.statLabel}>Today's Gain</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Other Key Species */}
        {species.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Market Explorer</Text>
              <TouchableOpacity style={styles.viewAllBtn}>
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="arrow-forward" size={14} color={THEME.colors.accent} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {species.map(item => (
                <SpeciesCard
                  key={item.id}
                  name={item.local_name}
                  price={item.current_price?.toLocaleString()}
                  change={`${item.change_percent || 0}%`}
                  icon="fish-outline"
                  isNeg={false}
                  unit="Tub"
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* Tamban Price Performance Chart */}
        <View style={styles.chartSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tamban Price Trend</Text>
            <View style={styles.timeframeRow}>
              {['today', '7d', 'custom'].map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => f === 'custom' ? setIsCalendarVisible(true) : setTimeframe(f)}
                  style={[
                    styles.timeframeChip,
                    (timeframe === f || (f === 'custom' && timeframe === 'custom')) && styles.timeframeChipActive
                  ]}
                >
                  <Text style={[
                    styles.timeframeText,
                    (timeframe === f || (f === 'custom' && timeframe === 'custom')) && styles.timeframeTextActive
                  ]}>
                    {f === 'today' ? 'Today' : f === '7d' ? '7 Days' : dayjs(selectedDate).format('MMM DD')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.chartCard}>
            <LineChart
              data={trendData}
              width={width - 64}
              height={180}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={false}
              withVerticalLines={false}
              yAxisLabel="₱"
              yAxisInterval={1}
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.activityCard}>
          <Text style={styles.sectionTitleSmall}>LATEST TRANSACTIONS</Text>
          {transactions.length > 0 ? (
            <View style={styles.tradesContainer}>
              {transactions.map(item => (
                <TradeRow
                  key={item.id}
                  date={item.manual_date ? dayjs(item.manual_date).format('MMM DD') : '--'}
                  time={item.manual_time ? item.manual_time.slice(0, 5) : '00:00'}
                  item={item.species_name}
                  price={item.price_per_unit?.toLocaleString()}
                  qty={`${item.volume} ${item.unit || 'Krate'}`}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No recent trades recorded.</Text>
          )}
        </View>

      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        isVisible={isCalendarVisible}
        onBackdropPress={() => setIsCalendarVisible(false)}
        style={styles.modal}
      >
        <View style={styles.calendarContainer}>
          <Text style={styles.modalTitle}>Select Transaction Date</Text>
          <Calendar
            theme={{
              backgroundColor: THEME.colors.bgCard,
              calendarBackground: THEME.colors.bgCard,
              textSectionTitleColor: THEME.colors.accent,
              selectedDayBackgroundColor: THEME.colors.accent,
              selectedDayTextColor: '#000',
              todayTextColor: THEME.colors.gold,
              dayTextColor: '#FFF',
              textDisabledColor: '#555',
              dotColor: THEME.colors.accent,
              monthTextColor: '#FFF',
              indicatorColor: THEME.colors.accent,
            }}
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
              setTimeframe('custom');
              setIsCalendarVisible(false);
            }}
            markedDates={{
              [selectedDate]: { selected: true }
            }}
          />
        </View>
      </Modal>

      {/* Add Species Modal */}
      <AddSpeciesModal
        isVisible={isAddSpeciesVisible}
        onClose={() => {
          setIsAddSpeciesVisible(false);
          fetchData(); // Refresh list after adding
        }}
      />

      {/* Specie Library Modal */}
      <SpecieLibraryModal 
        isVisible={isSpecieLibraryVisible} 
        onClose={() => {
          setIsSpecieLibraryVisible(false);
          fetchData();
        }} 
      />
    </SafeAreaView>
  );
}

// Sub-components
const SeaConditionWidget = () => (
  <View style={styles.seaWidget}>
    <View style={styles.seaMain}>
      <View style={styles.seaCondition}>
        <Ionicons name="sunny" size={24} color={THEME.colors.gold} />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.seaStatus}>Optimal</Text>
          <Text style={styles.seaLabel}>Sea State</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.seaDetail}>
        <Text style={styles.seaValue}>0.5m</Text>
        <Text style={styles.seaLabelSmall}>Waves</Text>
      </View>
      <View style={styles.seaDetail}>
        <Text style={styles.seaValue}>8kts</Text>
        <Text style={styles.seaLabelSmall}>Wind</Text>
      </View>
    </View>
    <View style={styles.portStatus}>
      <View style={styles.portDot} />
      <Text style={styles.portText}>Bulan Port: Normal Activity</Text>
    </View>
  </View>
);

const MarketTicker = ({ species }) => (
  <View style={styles.tickerContainer}>
    <View style={styles.tickerLabel}>
      <Text style={styles.tickerLabelText}>LIVE PRICES</Text>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tickerContent}>
      {species.map(s => (
        <View key={s.id} style={styles.tickerItem}>
          <Text style={styles.tickerName}>{s.local_name}: </Text>
          <Text style={styles.tickerPrice}>₱{s.current_price?.toLocaleString() || '0'}</Text>
          <Ionicons
            name={s.change_percent < 0 ? "caret-down" : "caret-up"}
            size={12}
            color={s.change_percent < 0 ? THEME.colors.negative : THEME.colors.positive}
            style={{ marginLeft: 4 }}
          />
        </View>
      ))}
    </ScrollView>
  </View>
);

const QuickActionItem = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.actionItem} onPress={onPress}>
    <View style={styles.actionIcon}>
      <Ionicons name={icon} size={22} color={THEME.colors.textPrimary} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

// Sub-components
const SpeciesCard = ({ name, price, change, icon, isNeg, unit }) => (
  <View style={styles.speciesCard}>
    <View style={styles.speciesIconContainer}>
      <Ionicons name={icon} size={30} color={THEME.colors.accent} />
    </View>
    <Text style={styles.speciesName}>{name}</Text>
    <View style={styles.speciesPriceRow}>
      <Text style={styles.speciesPriceCurrency}>₱</Text>
      <Text style={styles.speciesPrice}>{price}</Text>
      <Text style={styles.speciesUnit}>{unit || '/Krate'}</Text>
    </View>
    <Text style={[styles.speciesChange, isNeg && styles.negColor]}>{change}</Text>
  </View>
);

const TradeRow = ({ date, time, item, price, qty }) => (
  <View style={styles.tradeRow}>
    <View style={styles.tradeMeta}>
      <Text style={styles.tradeDate}>{date}</Text>
      <Text style={styles.tradeTime}>{time}</Text>
    </View>
    <Text style={styles.tradeInfo}>{item} @ <Text style={styles.tradePrice}>₱{price}</Text></Text>
    <Text style={styles.tradeQty}>({qty})</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgMain,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    justifyContent: 'space-between',
  },
  locationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTextContainer: {
    marginLeft: 6,
  },
  locationCity: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  locationLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    backgroundColor: THEME.colors.accent,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: THEME.colors.bgMain,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  pulseContainer: {
    marginHorizontal: 16,
    marginTop: 10,
    gap: 12,
  },
  seaWidget: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(47, 212, 198, 0.1)',
  },
  seaMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seaCondition: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1.5,
  },
  seaStatus: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  seaLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 12,
  },
  seaDetail: {
    flex: 1,
    alignItems: 'center',
  },
  seaValue: {
    color: THEME.colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  seaLabelSmall: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
  },
  portStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  portDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.positive,
    marginRight: 8,
  },
  portText: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
  },
  tickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(19, 42, 52, 0.4)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 36,
  },
  tickerLabel: {
    marginRight: 10,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
  },
  tickerLabelText: {
    color: THEME.colors.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tickerContent: {
    alignItems: 'center',
  },
  tickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  tickerName: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
  },
  tickerPrice: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 24,
  },
  actionItem: {
    alignItems: 'center',
    width: (width - 32) / 4,
  },
  actionIcon: {
    width: 54,
    height: 54,
    backgroundColor: THEME.colors.bgCardAlt,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 8,
  },
  actionLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  mainCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...THEME.shadow.glow,
  },
  mainCardContent: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredFishImg: {
    width: 100,
    height: 100,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderImg: {
    backgroundColor: 'rgba(47, 212, 198, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(47, 212, 198, 0.2)',
  },
  liveIndicator: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: THEME.colors.bgMain,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.negative,
    marginRight: 4,
  },
  liveText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
  },
  featuredDetails: {
    flex: 1,
    marginLeft: 20,
  },
  tagline: {
    color: THEME.colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  fishName: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceValue: {
    color: THEME.colors.gold,
    fontSize: 24,
    fontWeight: '800',
  },
  priceUnit: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(75, 174, 79, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  statNum: {
    color: THEME.colors.positive,
    fontSize: 12,
    fontWeight: '700',
  },
  statLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: THEME.colors.accent,
    fontSize: 13,
    marginRight: 4,
  },
  horizontalScroll: {
    paddingLeft: 20,
    marginBottom: 30,
  },
  speciesCard: {
    width: 140,
    backgroundColor: THEME.colors.bgCardAlt,
    borderRadius: 20,
    padding: 16,
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  speciesIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(47, 212, 198, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  speciesName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  speciesPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  speciesPriceCurrency: {
    color: THEME.colors.gold,
    fontSize: 12,
    fontWeight: '700',
    marginRight: 1,
  },
  speciesPrice: {
    color: THEME.colors.gold,
    fontSize: 16,
    fontWeight: '700',
  },
  speciesUnit: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    marginLeft: 2,
  },
  speciesChange: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.positive,
  },
  negColor: {
    color: THEME.colors.negative,
  },
  chartSection: {
    marginBottom: 30,
  },
  timeframeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeframeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  timeframeChipActive: {
    backgroundColor: 'rgba(47, 212, 198, 0.1)',
    borderColor: 'rgba(47, 212, 198, 0.2)',
  },
  timeframeText: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timeframeTextActive: {
    color: THEME.colors.accent,
  },
  liveBadge: {
    backgroundColor: 'rgba(47, 212, 198, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(47, 212, 198, 0.2)',
  },
  liveBadgeText: {
    color: THEME.colors.accent,
    fontSize: 10,
    fontWeight: '900',
  },
  chartCard: {
    marginHorizontal: 16,
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  chart: {
    paddingRight: 40,
    marginTop: 10,
  },
  activityCard: {
    marginHorizontal: 16,
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 40,
  },
  sectionTitleSmall: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 16,
  },
  tradesContainer: {
    gap: 4,
  },
  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tradeMeta: {
    width: 65,
    marginRight: 10,
  },
  tradeDate: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tradeTime: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    opacity: 0.7,
  },
  tradeInfo: {
    color: '#FFF',
    fontSize: 14,
    flex: 1,
  },
  tradePrice: {
    color: THEME.colors.gold,
    fontWeight: '700',
  },
  tradeQty: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
  },
  emptyText: {
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  calendarContainer: {
    backgroundColor: THEME.colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
  },
});
