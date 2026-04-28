import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  FlatList
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
  const [trendData, setTrendData] = useState({ labels: ["No Data"], datasets: [{ data: [0] }] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('today');
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [isAddSpeciesVisible, setIsAddSpeciesVisible] = useState(false);
  const [isSpecieLibraryVisible, setIsSpecieLibraryVisible] = useState(false);
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

  const fetchData = async (currentFrame = timeframe, targetDate = selectedDate) => {
    try {
      const today = dayjs().format('YYYY-MM-DD');

      // 1. Fetch data
      const [speciesRes, transRes, pricesRes] = await Promise.all([
        supabase.from('species').select('*').order('local_name'),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(15),
        supabase.from('transactions').select('*').order('created_at', { ascending: false })
      ]);

      if (speciesRes.error) throw speciesRes.error;

      // 2. Process Dynamic Gains and Units
      const allTrans = pricesRes.data || [];
      const enrichedSpecies = (speciesRes.data || []).map(s => {
        const sTrans = allTrans.filter(t => t.species_name.toLowerCase() === s.local_name.toLowerCase());

        const latestPrice = sTrans[0]?.price_per_unit || 0;
        const previousPrice = sTrans[1]?.price_per_unit || 0;

        let pctChange = '0.0';
        if (previousPrice > 0) {
          const diff = ((latestPrice - previousPrice) / previousPrice) * 100;
          pctChange = (diff > 0 ? '+' : '') + diff.toFixed(1);
        }

        return {
          ...s, // Carries the 'unit' from species table
          current_price: latestPrice,
          price_date: sTrans[0]?.manual_date,
          price_time: sTrans[0]?.manual_time,
          change_percent: pctChange,
          isPositive: latestPrice >= previousPrice
        };
      });

      setSpecies(enrichedSpecies);
      setTransactions(transRes.data || []);

      // 3. Process Trend Data (Fix for 'l' character error)
      let trendQuery = supabase.from('transactions')
        .select('manual_date, manual_time, price_per_unit')
        .ilike('species_name', '%lawlaw%')
        .order('manual_date', { ascending: true })
        .order('manual_time', { ascending: true });

      if (currentFrame === 'today') {
        trendQuery = trendQuery.eq('manual_date', today);
      } else if (currentFrame === '7d') {
        const sevenDaysAgo = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
        trendQuery = trendQuery.gte('manual_date', sevenDaysAgo).lte('manual_date', today);
      } else if (currentFrame === 'custom') {
        // Ensure the custom date from the calendar is used strictly
        trendQuery = trendQuery.eq('manual_date', targetDate);
      }

      const { data: rawTrend } = await trendQuery;

      if (rawTrend && rawTrend.length > 0) {
        let labels = [];
        let data = [];

        if (currentFrame === '7d') {
          // Weekly View: Group by Date
          const dailyData = rawTrend.reduce((acc, item) => {
            const dateKey = dayjs(item.manual_date).format('MM/DD');
            if (!acc[dateKey]) acc[dateKey] = { sum: 0, count: 0 };
            acc[dateKey].sum += item.price_per_unit;
            acc[dateKey].count += 1;
            return acc;
          }, {});

          labels = Object.keys(dailyData);
          data = labels.map(key => dailyData[key].sum / dailyData[key].count);
        } else {
          // Today or Custom Date: Group by Time
          // We limit labels to avoid overlapping text on the X-axis
          labels = rawTrend.map((t, index) => {
            const time = t.manual_time.slice(0, 5);
            // Only show every 2nd or 3rd label if there are too many records in one day
            return rawTrend.length > 6 ? (index % 2 === 0 ? time : "") : time;
          });
          data = rawTrend.map(t => Number(t.price_per_unit) || 0);
        }

        // Ensure we have at least 2 points for the LineChart to draw a line
        const finalData = data.length === 1 ? [data[0], data[0]] : data;
        const finalLabels = labels.length === 1 ? [labels[0], labels[0]] : labels;

        setTrendData({
          labels: finalLabels,
          datasets: [{
            data: finalData,
            color: (opacity = 1) => `rgba(47, 212, 110, ${opacity})`,
            strokeWidth: 2
          }]
        });
      } else {
        // Empty state for dates with no records
        setTrendData({ labels: ["No Data"], datasets: [{ data: [0], color: () => 'transparent' }] });
      }

    } catch (error) {
      console.error('Fetch Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [timeframe, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [timeframe, selectedDate]);

  const highlightedFish = [...species].sort((a, b) => {
    const timeA = a.price_date ? new Date(`${a.price_date}T${a.price_time}`) : 0;
    const timeB = b.price_date ? new Date(`${b.price_date}T${b.price_time}`) : 0;
    return timeB - timeA;
  })[0] || species[0];

  const chartConfig = {
    backgroundGradientFrom: THEME.colors.bgCard,
    backgroundGradientTo: THEME.colors.bgCard,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(155, 179, 189, ${opacity})`,
    propsForDots: { r: "4", strokeWidth: "2", stroke: THEME.colors.accent },
  };

  return (
    <SafeAreaView style={styles.container}>
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
          <TouchableOpacity style={styles.headerIcon} onPress={() => setIsNotificationVisible(true)}>
            <Ionicons name="notifications-outline" size={22} color={THEME.colors.textPrimary} />
            <View style={styles.badge} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.accent} />}
      >
        <View style={styles.pulseContainer}>
          <SeaConditionWidget />
          <MarketTicker species={species} />
        </View>

        <View style={styles.quickActions}>
          <QuickActionItem icon="fish" label="Specie" onPress={() => setIsAddSpeciesVisible(true)} />
          <QuickActionItem icon="library-outline" label="Specie Library" onPress={() => setIsSpecieLibraryVisible(true)} />
          <QuickActionItem icon="calendar-outline" label="Forecast" />
          <QuickActionItem icon="boat-outline" label="Arriving" />
        </View>

        {highlightedFish && (
          <TouchableOpacity style={styles.mainCard} activeOpacity={0.9}>
            <View style={styles.mainCardContent}>
              <View style={[styles.featuredFishImg, styles.placeholderImg]}>
                <Ionicons name="fish" size={60} color={THEME.colors.accent} />
                <View style={styles.liveIndicator}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
              </View>
              <View style={styles.featuredDetails}>
                <Text style={styles.tagline}>LATEST PRICE RECORDED</Text>
                <Text style={styles.fishName}>{highlightedFish.local_name}</Text>
                {highlightedFish.price_date && (
                  <Text style={styles.priceTimestamp}>
                    {dayjs(highlightedFish.price_date).format('MMM DD')} / {dayjs(`2000-01-01 ${highlightedFish.price_time}`).format('hh:mm A')}
                  </Text>
                )}
                <View style={styles.priceContainer}>
                  <Text style={styles.priceValue}>₱{highlightedFish.current_price?.toLocaleString() || '0'}</Text>
                  <Text style={styles.priceUnit}> {highlightedFish.unit ? `/ ${highlightedFish.unit}` : '/ Unit'}</Text>
                </View>
                <View style={styles.statsRow}>
                  <View style={[styles.statChip, { backgroundColor: highlightedFish.isPositive ? 'rgba(75, 174, 79, 0.1)' : 'rgba(244, 67, 54, 0.1)' }]}>
                    <Ionicons
                      name={highlightedFish.isPositive ? "trending-up" : "trending-down"}
                      size={14}
                      color={highlightedFish.isPositive ? THEME.colors.positive : THEME.colors.negative}
                    />
                    <Text style={[styles.statNum, { marginLeft: 4, color: highlightedFish.isPositive ? THEME.colors.positive : THEME.colors.negative }]}>
                      {highlightedFish.change_percent}%
                    </Text>
                  </View>
                  <Text style={styles.statLabel}>Since last trade</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.chartSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tamban Price Trend</Text>
            <View style={styles.timeframeRow}>
              {['today', '7d', 'custom'].map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => f === 'custom' ? setIsCalendarVisible(true) : setTimeframe(f)}
                  style={[styles.timeframeChip, timeframe === f && styles.timeframeChipActive]}
                >
                  <Text style={[styles.timeframeText, timeframe === f && styles.timeframeTextActive]}>
                    {f === 'today' ? 'Today' : f === '7d' ? '7 Days' : dayjs(selectedDate).format('MMM DD')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.chartCard}>
            <LineChart data={trendData} width={width - 64} height={180} chartConfig={chartConfig} bezier style={styles.chart} />
          </View>
        </View>

        <View style={styles.activityCard}>
          <Text style={styles.sectionTitleSmall}>LATEST TRANSACTIONS</Text>
          {transactions.slice(0, 6).map(item => (
            <TradeRow key={item.id} date={dayjs(item.manual_date).format('MMM DD')} time={item.manual_time?.slice(0, 5)} item={item.species_name} price={item.price_per_unit?.toLocaleString()} qty={`${item.volume} ${item.unit || 'Krate'}`} />
          ))}
        </View>
      </ScrollView>

      {/* Notifications Modal */}
      <Modal isVisible={isNotificationVisible} onBackdropPress={() => setIsNotificationVisible(false)} style={styles.modal}>
        <View style={styles.notificationContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => setIsNotificationVisible(false)}><Ionicons name="close" size={24} color="#FFF" /></TouchableOpacity>
          </View>
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.notifItem}>
                <View style={styles.notifIcon}><Ionicons name="add-circle" size={20} color={THEME.colors.accent} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifText}>New record for <Text style={{ fontWeight: '700' }}>{item.species_name}</Text></Text>
                  <Text style={styles.notifSub}>{dayjs(item.manual_date).format('MMM DD')} • {item.manual_time.slice(0, 5)}</Text>
                </View>
                <Text style={styles.notifPrice}>₱{item.price_per_unit}</Text>
              </View>
            )}
          />
        </View>
      </Modal>

      <AddSpeciesModal isVisible={isAddSpeciesVisible} onClose={() => { setIsAddSpeciesVisible(false); fetchData(); }} />
      <SpecieLibraryModal isVisible={isSpecieLibraryVisible} onClose={() => { setIsSpecieLibraryVisible(false); fetchData(); }} />
    </SafeAreaView>
  );
}

// Subcomponents and Styles remain exactly as in your provided file
const TradeRow = ({ date, time, item, price, qty }) => (
  <View style={styles.tradeRow}>
    <View style={styles.tradeMeta}><Text style={styles.tradeDate}>{date}</Text><Text style={styles.tradeTime}>{time}</Text></View>
    <Text style={styles.tradeInfo}>{item} @ <Text style={styles.tradePrice}>₱{price}</Text></Text>
    <Text style={styles.tradeQty}>({qty})</Text>
  </View>
);

const SeaConditionWidget = () => (
  <View style={styles.seaWidget}>
    <View style={styles.seaMain}>
      <View style={styles.seaCondition}>
        <Ionicons name="sunny" size={24} color={THEME.colors.gold} />
        <View style={{ marginLeft: 10 }}><Text style={styles.seaStatus}>Optimal</Text><Text style={styles.seaLabel}>Sea State</Text></View>
      </View>
      <View style={styles.divider} /><View style={styles.seaDetail}><Text style={styles.seaValue}>0.5m</Text><Text style={styles.seaLabelSmall}>Waves</Text></View>
      <View style={styles.seaDetail}><Text style={styles.seaValue}>8kts</Text><Text style={styles.seaLabelSmall}>Wind</Text></View>
    </View>
  </View>
);

const MarketTicker = ({ species }) => (
  <View style={styles.tickerContainer}>
    <View style={styles.tickerLabel}><Text style={styles.tickerLabelText}>LIVE PRICES</Text></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tickerContent}>
      {species.map(s => (
        <View key={s.id} style={styles.tickerItem}><Text style={styles.tickerName}>{s.local_name}: </Text><Text style={styles.tickerPrice}>₱{s.current_price?.toLocaleString() || '0'}</Text></View>
      ))}
    </ScrollView>
  </View>
);

const QuickActionItem = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.actionItem} onPress={onPress}>
    <View style={styles.actionIcon}><Ionicons name={icon} size={22} color={THEME.colors.textPrimary} /></View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.bgMain },
  topHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, justifyContent: 'space-between' },
  locationGroup: { flexDirection: 'row', alignItems: 'center' },
  locationTextContainer: { marginLeft: 6 },
  locationCity: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  locationLabel: { color: THEME.colors.textSecondary, fontSize: 11 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  badge: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, backgroundColor: THEME.colors.accent, borderRadius: 4, borderWidth: 1.5, borderColor: THEME.colors.bgMain },
  scrollContent: { paddingBottom: 120 },
  pulseContainer: { marginHorizontal: 16, marginTop: 10, gap: 12 },
  seaWidget: { backgroundColor: THEME.colors.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(47, 212, 198, 0.1)' },
  seaMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seaCondition: { flexDirection: 'row', alignItems: 'center', flex: 1.5 },
  seaStatus: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  seaLabel: { color: THEME.colors.textSecondary, fontSize: 11 },
  divider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 12 },
  seaDetail: { flex: 1, alignItems: 'center' },
  seaValue: { color: THEME.colors.accent, fontSize: 14, fontWeight: '700' },
  seaLabelSmall: { color: THEME.colors.textSecondary, fontSize: 10 },
  tickerContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(19, 42, 52, 0.4)', borderRadius: 12, paddingHorizontal: 12, height: 36 },
  tickerLabel: { marginRight: 10, paddingRight: 10, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.1)' },
  tickerLabelText: { color: THEME.colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  tickerContent: { alignItems: 'center' },
  tickerItem: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  tickerName: { color: THEME.colors.textSecondary, fontSize: 12 },
  tickerPrice: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 20, marginBottom: 24 },
  actionItem: { alignItems: 'center', width: (width - 32) / 4 },
  actionIcon: { width: 54, height: 54, backgroundColor: THEME.colors.bgCardAlt, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 8 },
  actionLabel: { color: THEME.colors.textSecondary, fontSize: 11, fontWeight: '500' },
  mainCard: { marginHorizontal: 16, borderRadius: 24, overflow: 'hidden', backgroundColor: THEME.colors.bgCard, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  mainCardContent: { padding: 20, flexDirection: 'row', alignItems: 'center' },
  featuredFishImg: { width: 100, height: 100, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  placeholderImg: { backgroundColor: 'rgba(47, 212, 198, 0.05)', borderWidth: 1, borderColor: 'rgba(47, 212, 198, 0.2)' },
  liveIndicator: { position: 'absolute', bottom: -8, backgroundColor: THEME.colors.bgMain, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.colors.negative, marginRight: 4 },
  liveText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  featuredDetails: { flex: 1, marginLeft: 20 },
  tagline: { color: THEME.colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  fishName: { color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  priceTimestamp: { color: THEME.colors.textSecondary, fontSize: 11, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase' },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline' },
  priceValue: { color: THEME.colors.gold, fontSize: 24, fontWeight: '800' },
  priceUnit: { color: THEME.colors.textSecondary, fontSize: 12, marginLeft: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  statChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 10 },
  statNum: { fontSize: 12, fontWeight: '700' },
  statLabel: { color: THEME.colors.textSecondary, fontSize: 11 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', marginTop: '4%' },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center' },
  viewAllText: { color: THEME.colors.accent, fontSize: 13, marginRight: 4 },
  horizontalScroll: { paddingLeft: 20, marginBottom: 30 },
  chartSection: { marginBottom: 30 },
  timeframeRow: { flexDirection: 'row', gap: 8 },
  timeframeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  timeframeChipActive: { backgroundColor: 'rgba(47, 212, 198, 0.1)', borderColor: 'rgba(47, 212, 198, 0.2)' },
  timeframeText: { color: THEME.colors.textSecondary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  timeframeTextActive: { color: THEME.colors.accent },
  chartCard: { marginHorizontal: 16, backgroundColor: THEME.colors.bgCard, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  chart: { paddingRight: 40, marginTop: 10 },
  activityCard: { marginHorizontal: 16, backgroundColor: THEME.colors.bgCard, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 40 },
  sectionTitleSmall: { color: THEME.colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 16 },
  tradeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  tradeMeta: { width: 65, marginRight: 10 },
  tradeDate: { color: THEME.colors.textSecondary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  tradeTime: { color: THEME.colors.textSecondary, fontSize: 11, opacity: 0.7 },
  tradeInfo: { color: '#FFF', fontSize: 14, flex: 1 },
  tradePrice: { color: THEME.colors.gold, fontWeight: '700' },
  tradeQty: { color: THEME.colors.textSecondary, fontSize: 12 },
  modal: { justifyContent: 'flex-end', margin: 0 },
  notificationContainer: { backgroundColor: THEME.colors.bgMain, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, height: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  notifItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  notifIcon: { width: 40, height: 40, backgroundColor: 'rgba(47, 212, 198, 0.1)', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  notifText: { color: '#FFF', fontSize: 14 },
  notifSub: { color: THEME.colors.textSecondary, fontSize: 12, marginTop: 2 },
  notifPrice: { color: THEME.colors.gold, fontSize: 16, fontWeight: '700' }
});