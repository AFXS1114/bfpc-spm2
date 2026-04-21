import React, { useState, useEffect } from 'react';
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
import { useRecordPrice } from '../context/RecordPriceContext';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';

export default function RecordPriceModal() {
  const { isModalVisible, hideModal } = useRecordPrice();

  // Form State
  const [specie, setSpecie] = useState('');
  const [price, setPrice] = useState('');
  const [volume, setVolume] = useState('1');
  const [unit, setUnit] = useState('Tub');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());

  // UI State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allSpecies, setAllSpecies] = useState([]);
  const [filteredSpecies, setFilteredSpecies] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Options
  const units = ['Kilogram', 'Tub', 'Box'];

  useEffect(() => {
    loadSpecies();
  }, []);

  useEffect(() => {
    if (isModalVisible) {
      loadSpecies();
    }
  }, [isModalVisible]);

  const loadSpecies = async () => {
    try {
      const { data, error } = await supabase.from('species').select('local_name').order('local_name');
      if (error) throw error;
      setAllSpecies(data || []);
    } catch (err) {
      console.error('Error loading species:', err);
    }
  };

  const handleSpecieSearch = (text) => {
    setSpecie(text);
    if (text.length > 0) {
      // If library is empty, try one last refetch
      if (allSpecies.length === 0) loadSpecies();

      const filtered = allSpecies.filter(s =>
        s.local_name && s.local_name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredSpecies(filtered);
      setIsSearching(true);
    } else {
      setFilteredSpecies([]);
      setIsSearching(false);
    }
  };

  const selectSpecie = (name) => {
    setSpecie(name);
    setFilteredSpecies([]);
    setIsSearching(false);
  };

  const resetForm = () => {
    setSpecie('');
    setPrice('');
    setVolume('1');
    setUnit('Tub');
    setDate(new Date());
    setTime(new Date());
  };

  const handleSave = async () => {
    if (!specie || !price || !volume) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      // Prepare the data
      // Combine date and time for a single timestamp if needed, 
      // but the user's schema suggestion has separate date/time columns.
      // Use local time formatting via dayjs instead of .toISOString() to avoid UTC offsets
      const formattedDate = dayjs(date).format('YYYY-MM-DD');
      const formattedTime = dayjs(time).format('HH:mm:ss');

      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          species_name: specie,
          volume: parseFloat(volume),
          price_per_unit: parseFloat(price),
          total_price: parseFloat(price) * parseFloat(volume),
          unit: unit,
          manual_date: formattedDate,
          manual_time: formattedTime,
        }]);

      if (error) throw error;

      alert('Price recorded successfully!');
      resetForm();
      hideModal();
    } catch (error) {
      console.error('Error saving transaction:', error);
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
      isVisible={isModalVisible}
      onBackdropPress={hideModal}
      onBackButtonPress={hideModal}
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
            <Text style={styles.headerTitle}>Record Fish Price</Text>
            <TouchableOpacity onPress={hideModal} style={styles.closeButton}>
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
                placeholder="Enter species name (e.g. Lawlaw)"
                placeholderTextColor="#555"
                value={specie}
                onChangeText={handleSpecieSearch}
              />
            </View>

            {/* Suggestions Dropdown */}
            {isSearching && (
              <View style={styles.suggestionsList}>
                {allSpecies.length === 0 ? (
                  <View style={styles.suggestionItem}>
                    <Text style={[styles.suggestionText, { opacity: 0.5 }]}>Library is empty. Add species first.</Text>
                  </View>
                ) : filteredSpecies.length > 0 ? (
                  filteredSpecies.map((s, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => selectSpecie(s.local_name)}
                    >
                      <Ionicons name="fish" size={16} color={THEME.colors.accent} />
                      <Text style={styles.suggestionText}>{s.local_name}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.suggestionItem}>
                    <Text style={[styles.suggestionText, { opacity: 0.5 }]}>No matches found in library</Text>
                  </View>
                )}
              </View>
            )}

            {/* Price Input */}
            <Text style={styles.label}>Price per Unit</Text>
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

            {/* Volume & Unit Section */}
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Volume</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                    value={volume}
                    onChangeText={setVolume}
                  />
                </View>
              </View>
              <View style={{ flex: 1.2 }}>
                <Text style={styles.label}>Unit</Text>
                <View style={styles.unitSelector}>
                  {units.map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitOption, unit === u && styles.unitOptionActive]}
                      onPress={() => setUnit(u)}
                    >
                      <Text style={[styles.unitText, unit === u && styles.unitTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
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
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
              />
            )}

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
                  <Text style={styles.saveButtonText}>SAVE PRICE</Text>
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
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: '#0A2129',
    borderRadius: 12,
    padding: 4,
    height: 50,
    alignItems: 'center',
  },
  unitOption: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  unitOptionActive: {
    backgroundColor: THEME.colors.accent,
  },
  unitText: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  unitTextActive: {
    color: '#000',
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
  suggestionsList: {
    backgroundColor: '#0A2129',
    borderRadius: 12,
    marginTop: -8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  suggestionText: {
    color: '#FFF',
    fontSize: 14,
    marginLeft: 10,
  },
});
