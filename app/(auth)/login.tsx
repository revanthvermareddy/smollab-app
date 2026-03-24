import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/lib/auth';
import { StatusBar } from 'expo-status-bar';

export default function LoginScreen() {
  const { login, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFD21E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.hero}>
        <Text style={styles.emoji}>🧪</Text>
        <Text style={styles.title}>SmolLab</Text>
        <Text style={styles.subtitle}>
          Run small language models{'\n'}directly on your device
        </Text>
      </View>

      <View style={styles.features}>
        <FeatureRow icon="🔒" text="Private — your data never leaves your device" />
        <FeatureRow icon="⚡" text="Fast — GPU-accelerated on-device inference" />
        <FeatureRow icon="🤗" text="Powered by HuggingFace models" />
      </View>

      <TouchableOpacity style={styles.loginButton} onPress={login} activeOpacity={0.8}>
        <Text style={styles.loginButtonText}>🤗  Sign in with Hugging Face</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        Sign in to download and run models from HuggingFace Hub
      </Text>
    </View>
  );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 48,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 17,
    color: '#a0a0b8',
    textAlign: 'center',
    lineHeight: 24,
  },
  features: {
    width: '100%',
    marginBottom: 48,
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureText: {
    fontSize: 15,
    color: '#c0c0d0',
    flex: 1,
  },
  loginButton: {
    backgroundColor: '#FFD21E',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  footer: {
    marginTop: 20,
    fontSize: 13,
    color: '#606078',
    textAlign: 'center',
  },
});
