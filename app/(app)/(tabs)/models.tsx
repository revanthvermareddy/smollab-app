import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useModels } from '@/lib/model-context';
import { HFModelFile, formatBytes } from '@/lib/models';
import { DEFAULT_MODEL_REPO } from '@/lib/config';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function ModelsScreen() {
  const {
    localModels,
    activeModel,
    downloadProgress,
    isRefreshing,
    refreshModels,
    setActiveModel,
    startDownload,
    cancelDownload,
    removeModel,
    fetchAvailableFiles,
  } = useModels();
  const bg = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  const [repoInput, setRepoInput] = useState(DEFAULT_MODEL_REPO);
  const [availableFiles, setAvailableFiles] = useState<HFModelFile[]>([]);
  const [isFetchingFiles, setIsFetchingFiles] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const handleFetchFiles = useCallback(async () => {
    const repo = repoInput.trim();
    if (!repo) return;
    setIsFetchingFiles(true);
    setFetchError(null);
    try {
      const files = await fetchAvailableFiles(repo);
      setAvailableFiles(files);
      if (files.length === 0) {
        setFetchError('No GGUF files found in this repository');
      }
    } catch (err: any) {
      setFetchError(err?.message ?? 'Failed to fetch files');
      setAvailableFiles([]);
    } finally {
      setIsFetchingFiles(false);
    }
  }, [repoInput, fetchAvailableFiles]);

  const handleDownload = (filename: string) => {
    startDownload(repoInput.trim(), filename);
  };

  const handleDelete = (repoId: string, filename: string) => {
    Alert.alert('Delete Model', `Remove ${filename}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeModel(repoId, filename),
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['bottom']}>
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <View style={styles.content}>
            {/* Download section */}
            <Text style={[styles.sectionTitle, { color: textColor }]}>Download Model</Text>
            <View style={styles.repoRow}>
              <TextInput
                style={styles.repoInput}
                value={repoInput}
                onChangeText={setRepoInput}
                placeholder="owner/model-name"
                placeholderTextColor="#666"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={handleFetchFiles}
                disabled={isFetchingFiles}
              >
                {isFetchingFiles ? (
                  <ActivityIndicator size="small" color="#1a1a2e" />
                ) : (
                  <Text style={styles.searchButtonText}>Search</Text>
                )}
              </TouchableOpacity>
            </View>
            {fetchError && <Text style={styles.errorText}>{fetchError}</Text>}

            {/* Available GGUF files */}
            {availableFiles.length > 0 && (
              <View style={styles.filesList}>
                {availableFiles.map((file) => {
                  const key = `${repoInput.trim()}::${file.rfilename}`;
                  const progress = downloadProgress.get(key);
                  const isDownloaded = localModels.some(
                    (m) => m.repoId === repoInput.trim() && m.filename === file.rfilename,
                  );

                  return (
                    <View key={file.rfilename} style={styles.fileRow}>
                      <View style={styles.fileInfo}>
                        <Text style={styles.fileName} numberOfLines={1}>
                          {file.rfilename}
                        </Text>
                        <Text style={styles.fileSize}>{formatBytes(file.size)}</Text>
                      </View>
                      {progress ? (
                        <View style={styles.progressContainer}>
                          <View style={styles.progressBarBg}>
                            <View
                              style={[styles.progressBarFill, { width: `${progress.fraction * 100}%` }]}
                            />
                          </View>
                          <Text style={styles.progressText}>
                            {Math.round(progress.fraction * 100)}%
                          </Text>
                          <TouchableOpacity onPress={() => cancelDownload(key)}>
                            <Text style={styles.cancelText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ) : isDownloaded ? (
                        <Text style={styles.downloadedBadge}>✓ Downloaded</Text>
                      ) : (
                        <TouchableOpacity
                          style={styles.downloadButton}
                          onPress={() => handleDownload(file.rfilename)}
                        >
                          <Text style={styles.downloadButtonText}>↓</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Local models section */}
            <Text style={[styles.sectionTitle, { color: textColor, marginTop: 32 }]}>
              On Device
            </Text>
            {localModels.length === 0 ? (
              <Text style={styles.emptyText}>No models downloaded yet</Text>
            ) : (
              <View style={styles.filesList}>
                {localModels.map((model) => {
                  const isActive = activeModel?.filepath === model.filepath;
                  return (
                    <View key={model.filepath} style={styles.fileRow}>
                      <TouchableOpacity
                        style={styles.fileInfo}
                        onPress={() => setActiveModel(model)}
                      >
                        <View style={styles.modelNameRow}>
                          {isActive && <Text style={styles.activeDot}>●</Text>}
                          <Text
                            style={[styles.fileName, isActive && styles.activeFileName]}
                            numberOfLines={1}
                          >
                            {model.filename}
                          </Text>
                        </View>
                        <Text style={styles.fileSize}>
                          {model.repoId} · {formatBytes(model.sizeBytes)}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDelete(model.repoId, model.filename)}
                      >
                        <Text style={styles.deleteButtonText}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        }
        refreshing={isRefreshing}
        onRefresh={refreshModels}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  repoRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  repoInput: {
    flex: 1,
    backgroundColor: '#2a2a3e',
    color: '#e0e0f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  searchButton: {
    backgroundColor: '#FFD21E',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchButtonText: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  errorText: { color: '#ff6b6b', fontSize: 13, marginTop: 4, marginBottom: 8 },
  filesList: { gap: 8, marginTop: 8 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a3e',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '600', color: '#e0e0f0' },
  activeFileName: { color: '#FFD21E' },
  fileSize: { fontSize: 12, color: '#888', marginTop: 2 },
  modelNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeDot: { color: '#FFD21E', fontSize: 10 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 140 },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#444',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', backgroundColor: '#FFD21E', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#aaa', width: 36, textAlign: 'right' },
  cancelText: { fontSize: 16, color: '#ff6b6b' },
  downloadedBadge: { fontSize: 13, color: '#4ecdc4', fontWeight: '600' },
  downloadButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFD21E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadButtonText: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  deleteButton: { padding: 8 },
  deleteButtonText: { fontSize: 18 },
  emptyText: { color: '#888', fontSize: 14, fontStyle: 'italic' },
});
