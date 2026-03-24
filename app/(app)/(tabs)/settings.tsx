import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { useModels } from '@/lib/model-context';
import { useInference } from '@/lib/inference';
import { formatBytes } from '@/lib/models';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { localModels, activeModel } = useModels();
  const { isModelLoaded, unloadModel } = useInference();
  const bg = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  const totalSize = localModels.reduce((sum, m) => sum + m.sizeBytes, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* User info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Account</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Signed in as</Text>
            <Text style={styles.value}>{user?.preferred_username ?? user?.name ?? '—'}</Text>
          </View>
        </View>

        {/* Model info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Model</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Active Model</Text>
            <Text style={styles.value}>
              {activeModel ? activeModel.filename : 'None selected'}
            </Text>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{isModelLoaded ? '🟢 Loaded' : '⚪ Not loaded'}</Text>
          </View>
          {isModelLoaded && (
            <TouchableOpacity style={styles.dangerButton} onPress={unloadModel}>
              <Text style={styles.dangerButtonText}>Unload Model</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Storage */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Storage</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Downloaded Models</Text>
            <Text style={styles.value}>{localModels.length} model(s)</Text>
            <Text style={styles.label}>Total Size</Text>
            <Text style={styles.value}>{formatBytes(totalSize)}</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 24 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  card: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  label: { fontSize: 12, color: '#888', textTransform: 'uppercase', marginTop: 8 },
  value: { fontSize: 16, color: '#e0e0f0', fontWeight: '500' },
  dangerButton: {
    backgroundColor: '#ff6b6b22',
    borderWidth: 1,
    borderColor: '#ff6b6b44',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  dangerButtonText: { color: '#ff6b6b', fontWeight: '600', fontSize: 15 },
  logoutButton: {
    backgroundColor: '#ff6b6b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  logoutButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
