import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import Modal from 'react-native-modal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme/theme';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';

export default function BagoongModal({ isVisible, onClose }) {
  // Form State
  const [specie, setSpecie] = useState('Lawlaw(Bagoong)');
  const [price, setPrice] = useState('');
  const [remarks, setRemarks] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());

  // UI State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setSpecie('Lawlaw(Bagoong)');
    setPrice('');
    setRemarks('');
    setDate(new Date());
    setTime(new Date());
  };

  const handleSave = async () => {
    if (!specie || !price) {
      alert('Please fill in specie and price.');
      return;
    }

    setLoading(true);

    try {
      const formattedDate = dayjs(date).format('YYYY-MM-DD');
      const formattedTime = dayjs(time).format('HH:mm:ss');

      const { data, error } = await supabase
        .from('rec_bagoong')
        .insert([{
          specie: specie,
          price: parseFloat(price),
          remarks: remarks,
          manual_date: formattedDate,
          manual_time: formattedTime,
        }]);

      if (error) throw error;

      alert('Bagoong record saved successfully!');
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error saving bagoong record:', error);
      alert('Failed to save data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const onTimeChange = (event, selectedTime) => {
    const currentTime = selectedTime || time;
    setShowTimePicker(Platform.OS === 'ios');
    setTime(currentTime);
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      backdropOpacity={0.7}
      animationIn="zoomIn"
      animationOut="zoomOut"
      avoidKeyboard
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add Bagoong Record</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
          >
            {/* Specie Input */}
            <Text style={styles.label}>Specie</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="fish-outline" size={20} color={THEME.colors.accent} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Specie"
                placeholderTextColor="#555"
                value={specie}
                onChangeText={setSpecie}
              />
            </View>

            {/* Price Input */}
            <Text style={styles.label}>Price</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencyPrefix}>₱</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#555"
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />
            </View>

            {/* DateTime Section */}
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Date</Text>
                <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowDatePicker(true)}>
                  <Ionicons name="calendar-outline" size={20} color={THEME.colors.accent} />
                  <Text style={styles.pickerValue}>{date.toLocaleDateString()}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Time</Text>
                <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowTimePicker(true)}>
                  <Ionicons name="time-outline" size={20} color={THEME.colors.accent} />
                  <Text style={styles.pickerValue}>
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Pickers */}
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={time}
                mode="time"
                display="default"
                onChange={onTimeChange}
                is24Hour={false}
              />
            )}

            {/* Remarks Input */}
            <Text style={styles.label}>Remarks (Optional)</Text>
            <View style={[styles.inputContainer, { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
              <TextInput
                style={[styles.input, { textAlignVertical: 'top' }]}
                placeholder="Add any remarks..."
                placeholderTextColor="#555"
                multiline
                value={remarks}
                onChangeText={setRemarks}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#000" style={{ marginRight: 8 }} />
                  <Text style={styles.saveButtonText}>SAVE RECORD</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    justifyContent: 'center',
  },
  container: {
    backgroundColor: THEME.colors.bgMain,
    borderRadius: 28,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    ...THEME.shadow.glow,
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  closeButton: {
    padding: 4,
  },
  form: {
    paddingBottom: 20,
  },
  label: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A2129',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    height: 50,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  currencyPrefix: {
    color: THEME.colors.gold,
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A2129',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  pickerValue: {
    color: '#FFF',
    fontSize: 14,
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: THEME.colors.accent,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    ...THEME.shadow.glow,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
