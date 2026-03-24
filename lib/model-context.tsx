import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  LocalModel,
  DownloadProgress,
  listLocalModels,
  downloadModelFile,
  deleteLocalModel,
  listGGUFFiles,
  HFModelFile,
} from './models';
import { useAuth } from './auth';
import { DEFAULT_MODEL_REPO } from './config';

interface ModelState {
  localModels: LocalModel[];
  activeModel: LocalModel | null;
  downloadProgress: Map<string, DownloadProgress>;
  isRefreshing: boolean;
  refreshModels: () => Promise<void>;
  setActiveModel: (model: LocalModel | null) => void;
  startDownload: (repoId: string, filename: string) => void;
  cancelDownload: (key: string) => void;
  removeModel: (repoId: string, filename?: string) => Promise<void>;
  fetchAvailableFiles: (repoId: string) => Promise<HFModelFile[]>;
}

const ModelContext = createContext<ModelState | null>(null);

export function useModels() {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error('useModels must be used within ModelProvider');
  return ctx;
}

// Unique key for a download operation
function downloadKey(repoId: string, filename: string) {
  return `${repoId}::${filename}`;
}

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const [activeModel, setActiveModel] = useState<LocalModel | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Map<string, DownloadProgress>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const cancelRefs = useRef<Map<string, () => void>>(new Map());

  const refreshModels = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const models = listLocalModels();
      setLocalModels(models);
      if (activeModel && !models.find((m) => m.filepath === activeModel.filepath)) {
        setActiveModel(null);
      }
      if (!activeModel && models.length > 0) {
        setActiveModel(models[0]);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [activeModel]);

  // Refresh on mount
  useEffect(() => {
    refreshModels();
  }, []);

  const startDownload = useCallback(
    (repoId: string, filename: string) => {
      if (!token) return;
      const key = downloadKey(repoId, filename);

      const { promise, cancel } = downloadModelFile(repoId, filename, token, (progress) => {
        setDownloadProgress((prev) => {
          const next = new Map(prev);
          next.set(key, progress);
          return next;
        });
      });

      cancelRefs.current.set(key, cancel);

      promise
        .then(async () => {
          setDownloadProgress((prev) => {
            const next = new Map(prev);
            next.delete(key);
            return next;
          });
          cancelRefs.current.delete(key);
          await refreshModels();
        })
        .catch((err) => {
          console.error(`Download failed for ${key}:`, err);
          setDownloadProgress((prev) => {
            const next = new Map(prev);
            next.delete(key);
            return next;
          });
          cancelRefs.current.delete(key);
        });
    },
    [token, refreshModels],
  );

  const cancelDownload = useCallback((key: string) => {
    const cancel = cancelRefs.current.get(key);
    cancel?.();
    cancelRefs.current.delete(key);
    setDownloadProgress((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const removeModel = useCallback(
    async (repoId: string, filename?: string) => {
      deleteLocalModel(repoId, filename);
      await refreshModels();
    },
    [refreshModels],
  );

  const fetchAvailableFiles = useCallback(
    async (repoId: string): Promise<HFModelFile[]> => {
      if (!token) return [];
      return listGGUFFiles(repoId, token);
    },
    [token],
  );

  return (
    <ModelContext.Provider
      value={{
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
      }}
    >
      {children}
    </ModelContext.Provider>
  );
}
