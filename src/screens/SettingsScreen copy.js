import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, Button, Image, ImageBackground, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import ViewShot from "react-native-view-shot";
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';
import { THEME } from '../theme/theme';

// Asset Imports
import PFDA_LOGO from '../../assets/pfda-logo.png';
import TAG_LOGO from '../../assets/bantay-presyo-tag.jpg';
import FISH_BG from '../../assets/tamban-bg.jpg';
import FOOTER_TEXT from '../../assets/footer-text.png';

export default function SettingsScreen({ navigation }) {
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [reportData, setReportData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const viewShotRef = useRef();

  const convertTo12H = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    let h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  };

  const format12H = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    const dbStartDate = startDate.toISOString().split('T')[0];
    const dbEndDate = endDate.toISOString().split('T')[0];
    const dbStartTime = startTime.toTimeString().split(' ')[0];

    const { data, error } = await supabase
      .from('transactions')
      .select('manual_date, manual_time, price_per_unit')
      .eq('species_name', 'Lawlaw')
      .gte('manual_date', dbStartDate)
      .lte('manual_date', dbEndDate)
      .gte('manual_time', dbStartTime)
      .order('manual_date', { ascending: true });

    if (data && data.length > 0) {
      setReportData(data);
      setTimeout(captureAndShare, 1500);
    } else {
      Alert.alert("No Data", "Check your filters and try again.");
      setIsGenerating(false);
    }
  };

  const captureAndShare = async () => {
    try {
      const uri = await viewShotRef.current.capture();
      await Sharing.shareAsync(uri);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
      setShowModal(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity style={styles.row} onPress={() => setShowModal(true)}>
          <Text style={styles.rowLabel}>Generate Bantay Presyo Report</Text>
          <Text style={styles.chevron}>📊</Text>
        </TouchableOpacity>

        <View style={{ position: 'absolute', left: -5000 }}>
          <ViewShot ref={viewShotRef} options={{ format: "jpg", quality: 0.9 }}>
            <View style={styles.reportCanvas}>
              <View style={styles.headerSection}>
                <Image source={TAG_LOGO} style={styles.pfdaLogoHeader} resizeMode="contain" />
                <View style={styles.headerTextContainer}>
                  <Text style={styles.headerPortName}>PFDA — Bulan Fish Port Complex</Text>
                  <View style={styles.titleWithTagRow}>
                    <Text style={styles.headerMainTitle}>TAMBAN PRICE MONITORING</Text>
                    <Image source={PFDA_LOGO} style={styles.inlineTag} resizeMode="contain" />
                  </View>
                </View>
              </View>

              <View style={styles.tableContainer}>
                <View style={styles.tableHeaderBlue}>
                  <Text style={styles.columnHeader}>DATE</Text>
                  <Text style={styles.columnHeader}>TIME</Text>
                  <Text style={styles.columnHeader}>PRICE</Text>
                </View>

                {reportData.map((item, index) => (
                  <View key={index} style={[styles.dataRow, index % 2 === 0 ? styles.zebra : null]}>
                    <Text style={styles.dataText}>{item.manual_date}</Text>
                    <Text style={styles.dataText}>{convertTo12H(item.manual_time)}</Text>
                    <Text style={[styles.dataText, styles.priceBold]}>₱{item.price_per_unit}</Text>
                  </View>
                ))}
              </View>

              {/* FOOTER FIX: Ensure width/height are strict and background covers */}
              <View style={styles.footerWrapper}>
                <ImageBackground source={FISH_BG} style={styles.footerBackground} resizeMode="cover">
                  <Image source={FOOTER_TEXT} style={styles.footerBranding} resizeMode="contain" />
                </ImageBackground>
              </View>
            </View>
          </ViewShot>
        </View>

        <Modal visible={showModal} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Report Criteria</Text>
              <Text style={styles.inputLabel}>Start Date</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowStartPicker(true)}>
                <Text>{startDate.toDateString()}</Text>
              </TouchableOpacity>
              {showStartPicker && <DateTimePicker value={startDate} mode="date" onChange={(e, d) => { setShowStartPicker(false); if (d) setStartDate(d) }} />}

              <Text style={styles.inputLabel}>End Date</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowEndPicker(true)}>
                <Text>{endDate.toDateString()}</Text>
              </TouchableOpacity>
              {showEndPicker && <DateTimePicker value={endDate} mode="date" onChange={(e, d) => { setShowEndPicker(false); if (d) setEndDate(d) }} />}

              <Text style={styles.inputLabel}>Start Time</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowTimePicker(true)}>
                <Text>{format12H(startTime)}</Text>
              </TouchableOpacity>
              {showTimePicker && <DateTimePicker value={startTime} mode="time" is24Hour={false} onChange={(e, d) => { setShowTimePicker(false); if (d) setStartTime(d) }} />}

              <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} disabled={isGenerating}>
                <Text style={styles.generateBtnText}>{isGenerating ? "GENERATING..." : "GENERATE REPORT"}</Text>
              </TouchableOpacity>
              <Button title="Close" color="gray" onPress={() => setShowModal(false)} />
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.bgMain },
  content: { padding: 24, flex: 1 },
  title: { fontSize: 28, fontWeight: '700', color: THEME.colors.textPrimary, marginBottom: 32 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: THEME.colors.bgCardAlt, padding: 16, borderRadius: 10, borderWidth: 1, borderColor: THEME.colors.border },
  rowLabel: { fontSize: 16, color: THEME.colors.textPrimary, fontWeight: '500' },
  chevron: { fontSize: 20 },

  reportCanvas: { width: 1000, minHeight: 1000, backgroundColor: '#fff', justifyContent: 'space-between' },
  headerSection: { height: 220, backgroundColor: '#1d417a', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 40 },
  pfdaLogoHeader: { marginLeft: -50, width: 230, height: 230 },
  headerTextContainer: { flex: 1, marginLeft: 20, justifyContent: 'center' },
  headerPortName: { color: '#fff', fontSize: 24, fontWeight: '600' },
  titleWithTagRow: { flexDirection: 'row', alignItems: 'center' },
  headerMainTitle: { color: '#fff', fontSize: 42, fontWeight: 'bold' },
  inlineTag: { width: 180, height: 100, marginLeft: 15, marginTop: 5 },

  tableContainer: { flex: 1, marginTop: 40, paddingHorizontal: 60 },
  tableHeaderBlue: { flexDirection: 'row', backgroundColor: '#1d417a', paddingVertical: 15 },
  columnHeader: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 26, fontWeight: 'bold' },
  dataRow: { flexDirection: 'row', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#eee' },
  zebra: { backgroundColor: '#f2f6fa' },
  dataText: { flex: 1, textAlign: 'center', fontSize: 24, color: '#333' },
  priceBold: { fontWeight: 'bold', color: '#1d417a' },

  footerWrapper: { width: '100%', height: 250, overflow: 'hidden' },
  footerBackground: { width: '100%', height: '100%', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40 },
  footerBranding: { width: '90%', height: 80 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 30 },
  modalContent: { backgroundColor: '#fff', padding: 25, borderRadius: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  inputLabel: { marginTop: 15, fontWeight: '600', color: '#555' },
  pickerBtn: { padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginTop: 5 },
  generateBtn: { backgroundColor: '#1d417a', padding: 18, borderRadius: 12, marginVertical: 25, alignItems: 'center' },
  generateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});