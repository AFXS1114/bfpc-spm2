import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform
} from 'react-native';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme/theme';
import { supabase } from '../lib/supabase';

export default function SpecieLibraryModal({ isVisible, onClose }) {
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isVisible) {
      fetchSpecies();
    }
  }, [isVisible]);

  const fetchSpecies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('species')
        .select('*')
        .order('local_name');
      
      if (error) throw error;
      setSpecies(data || []);
    } catch (err) {
      console.error('Error fetching library:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    // Basic delete functionality for library management
    try {
      const { error } = await supabase.from('species').delete().eq('id', id);
      if (error) throw error;
      setSpecies(species.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting species:', err);
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
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Specie Library</Text>
            <Text style={styles.subtitle}>{species.length} varieties recorded</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={THEME.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator size="large" color={THEME.colors.accent} style={{ marginVertical: 40 }} />
          ) : species.length > 0 ? (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
              {species.map((s) => (
                <View key={s.id} style={styles.item}>
                  <View style={styles.itemIcon}>
                    <Ionicons name="fish" size={20} color={THEME.colors.accent} />
                  </View>
                  <Text style={styles.itemName}>{s.local_name}</Text>
                  <TouchableOpacity onPress={() => handleDelete(s.id, s.local_name)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color="rgba(255, 107, 107, 0.5)" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="documents-outline" size={48} color={THEME.colors.textSecondary} style={{ opacity: 0.3 }} />
              <Text style={styles.emptyText}>Library is empty</Text>
            </View>
          )}
        </View>
      </View>
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
    maxHeight: '80%',
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
  subtitle: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    flexShrink: 1,
  },
  list: {
    maxHeight: 400,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(47, 212, 110, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemName: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: THEME.colors.textSecondary,
    marginTop: 10,
    fontSize: 14,
  },
});
