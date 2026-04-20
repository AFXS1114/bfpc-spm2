import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme/theme';
import { supabase } from '../lib/supabase';

export default function AddSpeciesModal({ isVisible, onClose }) {
  const [localName, setLocalName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!localName.trim()) {
      alert('Please enter a species name');
      return;
    }

    setLoading(true);
    try {
      // 1. Check if already exists (Database unique constraint will also catch this)
      const { data: existing } = await supabase
        .from('species')
        .select('local_name')
        .ilike('local_name', localName.trim())
        .single();

      if (existing) {
        alert(`${localName} is already in the library!`);
        setLoading(false);
        return;
      }

      // 2. Insert
      const { error } = await supabase
        .from('species')
        .insert([{ local_name: localName.trim() }]);

      if (error) throw error;

      alert(`${localName} added to library!`);
      setLocalName('');
      onClose();
    } catch (err) {
      console.error('Error adding species:', err);
      alert('Failed to add species. It might already exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.7}
      animationIn="zoomIn"
      animationOut="zoomOut"
      style={styles.modal}
      avoidKeyboard
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Add New Specie</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={THEME.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>Local Name</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="fish-outline" size={20} color={THEME.colors.accent} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Bangus, Pelagic..."
              placeholderTextColor="#555"
              value={localName}
              onChangeText={setLocalName}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.addButton, loading && styles.disabled]}
            onPress={handleAdd}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="#000" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>ADD TO LIBRARY</Text>
              </>
            )}
          </TouchableOpacity>
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
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...THEME.shadow.glow,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  content: {
    gap: 16,
  },
  label: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A2129',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 54,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
  },
  addButton: {
    backgroundColor: THEME.colors.accent,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
