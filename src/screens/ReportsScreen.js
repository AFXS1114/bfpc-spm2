import React, { useState, useEffect, useCallback } from 'react';
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
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';
import { Calendar } from 'react-native-calendars';

const { width } = Dimensions.get('window');

export default function ReportsScreen() {
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [transList, setTransList] = useState([]);
  const [summaries, setSummaries] = useState({
    speciesCount: 0,
    totalVolume: 0,
    totalRevenue: 0,
    volChange: 'new',
    revChange: 'new',
  });
  const [loading, setLoading] = useState(true);

  const fetchReportData = useCallback(async (targetDate) => {
    setLoading(true);
    try {
      const dayStr = targetDate;
      const prevDayStr = dayjs(targetDate).subtract(1, 'day').format('YYYY-MM-DD');

      const [dayRes, prevDayRes, specRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('manual_date', dayStr).order('manual_time', { ascending: false }),
        supabase.from('transactions').select('volume, price_per_unit').eq('manual_date', prevDayStr),
        supabase.from('species').select('id', { count: 'exact' })
      ]);

      if (dayRes.error) throw dayRes.error;

      const dayTrans = dayRes.data || [];
      const prevTrans = prevDayRes.data || [];

      // Calculate Metrics
      const totalRev = dayTrans.reduce((acc, curr) => acc + (curr.price_per_unit * curr.volume), 0);
      const totalVol = dayTrans.reduce((acc, curr) => acc + curr.volume, 0);

      const prevRev = prevTrans.reduce((acc, curr) => acc + (curr.price_per_unit * curr.volume), 0);
      const prevVol = prevTrans.reduce((acc, curr) => acc + curr.volume, 0);

      // Percentage Calculations
      const calcChange = (current, previous) => {
        if (previous === 0) return 'new';
        const pct = ((current - previous) / previous) * 100;
        return (pct > 0 ? '+' : '') + pct.toFixed(1) + '%';
      };

      setSummaries({
        speciesCount: specRes.count || 0,
        totalVolume: totalVol,
        totalRevenue: totalRev,
        volChange: calcChange(totalVol, prevVol),
        revChange: calcChange(totalRev, prevRev),
      });

      setTransList(dayTrans);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData(selectedDate);

    const channel = supabase
      .channel('reports-update')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchReportData(selectedDate);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, fetchReportData]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <Text style={styles.topHeaderTitle}>Market Analytics</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>{dayjs(selectedDate).format('MMMM D, YYYY')}</Text>
          <Text style={styles.subTitle}>Summary for selected date</Text>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard 
            label="Species" 
            value={summaries.speciesCount} 
            change="" 
            type="positive" 
            borderColor="rgba(47, 212, 198, 0.4)"
            icon="fish"
          />
          <SummaryCard 
            label="Volume" 
            value={summaries.totalVolume.toLocaleString()} 
            change={summaries.volChange} 
            type={summaries.volChange.includes('-') ? 'negative' : 'positive'} 
          />
          <SummaryCard 
            label="Revenue" 
            value={`₱${summaries.totalRevenue.toLocaleString()}`} 
            change={summaries.revChange} 
            type={summaries.revChange.includes('-') ? 'negative' : 'positive'} 
          />
        </View>

        {loading ? (
          <View style={{ height: 200, justifyContent: 'center' }}>
            <ActivityIndicator color={THEME.colors.accent} />
          </View>
        ) : (
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colHeader, { flex: 1.5 }]}>Time</Text>
              <Text style={[styles.colHeader, { flex: 1.5 }]}>Species</Text>
              <Text style={styles.colHeader}>Vol</Text>
              <Text style={[styles.colHeader, { flex: 1.5 }]}>Price</Text>
              <Text style={styles.colHeader}>Total</Text>
            </View>

            {transList.length > 0 ? (
              transList.map((item) => (
                <TransactionRow 
                  key={item.id}
                  time={dayjs(`${item.manual_date} ${item.manual_time}`).format('hh:mm A')} 
                  specie={item.species_name} 
                  volume={item.volume.toLocaleString()} 
                  price={`₱${item.price_per_unit.toLocaleString()}`} 
                  total={`₱${(item.price_per_unit * item.volume).toLocaleString()}`} 
                />
              ))
            ) : (
              <Text style={styles.emptyText}>No trades recorded on this date.</Text>
            )}
          </View>
        )}

        <View style={styles.calendarSection}>
          <Text style={styles.calendarTitle}>History Browser</Text>
          <Calendar
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'transparent',
              textSectionTitleColor: THEME.colors.textSecondary,
              selectedDayBackgroundColor: THEME.colors.accent,
              selectedDayTextColor: '#000',
              todayTextColor: THEME.colors.gold,
              dayTextColor: THEME.colors.textPrimary,
              textDisabledColor: 'rgba(255,255,255,0.1)',
              dotColor: THEME.colors.accent,
              selectedDotColor: '#000',
              arrowColor: THEME.colors.accent,
              monthTextColor: '#FFF',
              indicatorColor: THEME.colors.accent,
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '500',
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 12
            }}
            markedDates={{
              [selectedDate]: { selected: true, disableTouchEvent: true, selectedColor: THEME.colors.accent }
            }}
            onDayPress={day => {
              setSelectedDate(day.dateString);
            }}
            maxDate={dayjs().format('YYYY-MM-DD')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Sub-components
const SummaryCard = ({ label, value, change, type, borderColor, icon }) => (
  <View style={[styles.summaryCard, borderColor && { borderColor }]}>
    <View style={styles.summaryCardHeader}>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={[styles.summaryChange, type === 'negative' ? styles.negColor : styles.posColor]}>
      {type === 'positive' ? '▲' : '▼'}{change}
    </Text>
  </View>
);

const TransactionRow = ({ time, specie, volume, price, total }) => (
  <View style={styles.tableRow}>
    <Text style={[styles.cellText, { flex: 1.5 }]}>{time}</Text>
    <Text style={[styles.cellText, { flex: 1.5 }]}>{specie}</Text>
    <Text style={styles.cellText}>{volume}</Text>
    <Text style={[styles.cellText, { flex: 1.5, fontWeight: '700' }]}>{price}</Text>
    <Text style={styles.cellText}>{total}</Text>
  </View>
);


// Sub-components

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgMain,
  },
  topHeader: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  topHeaderTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  titleContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  mainTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '700',
  },
  subTitle: {
    color: THEME.colors.accent,
    fontSize: 12,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
  },
  summaryValue: {
    color: THEME.colors.gold,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  posColor: {
    color: THEME.colors.positive,
  },
  negColor: {
    color: THEME.colors.negative,
  },
  tableCard: {
    backgroundColor: 'rgba(19, 42, 52, 0.4)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginBottom: 8,
  },
  colHeader: {
    flex: 1,
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.02)',
  },
  cellText: {
    flex: 1,
    color: THEME.colors.textPrimary,
    fontSize: 13,
  },
  calendarSection: {
    backgroundColor: 'rgba(19, 42, 52, 0.4)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  activeDayText: {
    color: THEME.colors.accent,
    fontWeight: '700',
  },
  emptyText: {
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 30,
    fontSize: 14,
  },
});
