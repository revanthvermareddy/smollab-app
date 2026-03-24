import { File, Directory, Paths } from 'expo-file-system';
import { HF_API_BASE } from './config';

const MODELS_DIR_NAME = 'models';

export interface HFModelFile {
  rfilename: string;
  size: number;
  blobId?: string;
}

export interface HFModelInfo {
  id: string;
  modelId: string;
  author: string;
  sha: string;
  siblings: HFModelFile[];
  private: boolean;
  gated: boolean | string;
}

export interface LocalModel {
  repoId: string;
  filename: string;
  filepath: string;
  sizeBytes: number;
}

export interface DownloadProgress {
  totalBytesWritten: number;
  totalBytesExpectedToWrite: number;
  fraction: number;
}

function getModelsDir(): Directory {
  return new Directory(Paths.document, MODELS_DIR_NAME);
}

function repoDirName(repoId: string): string {
  return repoId.replace(/\//g, '__');
}

function getModelDir(repoId: string): Directory {
  return new Directory(getModelsDir(), repoDirName(repoId));
}

function ensureDir(dir: Directory) {
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
}

/**
 * Fetch model info from HuggingFace API, including file listing.
 */
export async function fetchModelInfo(repoId: string, token: string): Promise<HFModelInfo> {
  const res = await fetch(`${HF_API_BASE}/api/models/${repoId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch model info for ${repoId}: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * Find GGUF files in a model repo.
 */
export async function listGGUFFiles(repoId: string, token: string): Promise<HFModelFile[]> {
  const info = await fetchModelInfo(repoId, token);
  return info.siblings.filter((f) => f.rfilename.endsWith('.gguf'));
}

/**
 * Download a model file from HuggingFace with progress tracking.
 * Uses fetch streaming since SDK 54 File.downloadFileAsync doesn't support progress.
 */
export function downloadModelFile(
  repoId: string,
  filename: string,
  token: string,
  onProgress?: (progress: DownloadProgress) => void,
): { promise: Promise<string>; cancel: () => void } {
  const controller = new AbortController();

  const promise = (async () => {
    const modelsDir = getModelsDir();
    ensureDir(modelsDir);
    const modelDir = getModelDir(repoId);
    ensureDir(modelDir);

    const destFile = new File(modelDir, filename);
    const url = `${HF_API_BASE}/${repoId}/resolve/main/${filename}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const contentLength = parseInt(response.headers.get('content-length') ?? '0', 10);
    const reader = response.body?.getReader();

    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedBytes += value.length;

      onProgress?.({
        totalBytesWritten: receivedBytes,
        totalBytesExpectedToWrite: contentLength,
        fraction: contentLength > 0 ? receivedBytes / contentLength : 0,
      });
    }

    // Combine chunks and write to file
    const fullBuffer = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      fullBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    destFile.create({ intermediates: true, overwrite: true });
    destFile.write(fullBuffer);

    return destFile.uri;
  })();

  return {
    promise,
    cancel: () => controller.abort(),
  };
}

/**
 * List all locally downloaded models.
 */
export function listLocalModels(): LocalModel[] {
  const modelsDir = getModelsDir();
  if (!modelsDir.exists) return [];

  const models: LocalModel[] = [];
  const repoDirs = modelsDir.list();

  for (const item of repoDirs) {
    if (!(item instanceof Directory)) continue;
    const repoId = item.name.replace(/__/g, '/');
    const files = item.list();

    for (const file of files) {
      if (!(file instanceof File)) continue;
      if (!file.name.endsWith('.gguf')) continue;

      models.push({
        repoId,
        filename: file.name,
        filepath: file.uri,
        sizeBytes: file.size ?? 0,
      });
    }
  }

  return models;
}

/**
 * Delete a locally downloaded model.
 */
export function deleteLocalModel(repoId: string, filename?: string): void {
  const modelDir = getModelDir(repoId);
  if (!modelDir.exists) return;

  if (filename) {
    const file = new File(modelDir, filename);
    if (file.exists) file.delete();
    // If directory is now empty, remove it
    const remaining = modelDir.list();
    if (remaining.length === 0) modelDir.delete();
  } else {
    modelDir.delete();
  }
}

/**
 * Check if a model file exists locally.
 */
export function isModelDownloaded(repoId: string, filename: string): boolean {
  const file = new File(getModelDir(repoId), filename);
  return file.exists;
}

/**
 * Format byte count to human readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
