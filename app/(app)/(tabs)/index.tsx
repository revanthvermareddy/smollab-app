import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInference, ChatMessage } from '@/lib/inference';
import { useModels } from '@/lib/model-context';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function ChatScreen() {
  const {
    isModelLoaded,
    isLoadingModel,
    isGenerating,
    loadError,
    messages,
    loadModel,
    sendMessage,
    stopGeneration,
    partialResponse,
  } = useInference();
  const { activeModel } = useModels();
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const bg = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, partialResponse]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isGenerating) return;
    setInput('');
    sendMessage(text);
  };

  // Model not loaded state
  if (!isModelLoaded) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.emptyState}>
          {isLoadingModel ? (
            <>
              <ActivityIndicator size="large" color="#FFD21E" />
              <Text style={[styles.emptyTitle, { color: textColor }]}>Loading Model...</Text>
              <Text style={styles.emptySubtitle}>
                This may take a moment depending on model size
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.emptyEmoji}>🧪</Text>
              <Text style={[styles.emptyTitle, { color: textColor }]}>
                {activeModel ? 'Ready to Chat' : 'No Model Selected'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeModel
                  ? `Tap below to load ${activeModel.filename}`
                  : 'Go to the Models tab to download a model first'}
              </Text>
              {loadError && <Text style={styles.errorText}>{loadError}</Text>}
              {activeModel && (
                <TouchableOpacity style={styles.loadButton} onPress={loadModel}>
                  <Text style={styles.loadButtonText}>Load Model</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          style={styles.flex}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => <MessageBubble message={item} textColor={textColor} />}
          ListFooterComponent={
            partialResponse ? (
              <View style={[styles.bubble, styles.assistantBubble]}>
                <Text style={styles.assistantText}>{partialResponse}▊</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>Send a message to start chatting</Text>
            </View>
          }
        />

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { color: textColor }]}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor="#888"
            multiline
            maxLength={2000}
            editable={!isGenerating}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          {isGenerating ? (
            <TouchableOpacity style={styles.stopButton} onPress={stopGeneration}>
              <Text style={styles.stopButtonText}>■</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!input.trim()}
            >
              <Text style={styles.sendButtonText}>↑</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ message, textColor }: { message: ChatMessage; textColor: string }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
      <Text style={isUser ? styles.userText : styles.assistantText}>{message.content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22 },
  errorText: { color: '#ff6b6b', marginTop: 12, fontSize: 14, textAlign: 'center' },
  loadButton: {
    marginTop: 24,
    backgroundColor: '#FFD21E',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  loadButtonText: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  messageList: { padding: 16, gap: 12 },
  bubble: {
    maxWidth: '85%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFD21E',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#2a2a3e',
    borderBottomLeftRadius: 4,
  },
  userText: { fontSize: 16, color: '#1a1a2e', lineHeight: 22 },
  assistantText: { fontSize: 16, color: '#e0e0f0', lineHeight: 22 },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyChatText: { color: '#888', fontSize: 15 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#333',
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a3e',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD21E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonText: { fontSize: 20, fontWeight: '700', color: '#1a1a2e' },
  stopButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff6b6b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButtonText: { fontSize: 16, color: '#fff' },
});
