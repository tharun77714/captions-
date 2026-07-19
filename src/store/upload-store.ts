import { create } from 'zustand';

export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

interface UploadState {
  status: UploadStatus;
  progress: number; // 0 to 100
  error: string | null;
  projectId: string | null;
  sourceLanguage: string;
  
  setStatus: (status: UploadStatus) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  setProjectId: (id: string | null) => void;
  setSourceLanguage: (lang: string) => void;
  reset: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  status: 'idle',
  progress: 0,
  error: null,
  projectId: null,
  sourceLanguage: 'auto',
  
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set(error ? { error, status: 'error' } : { error: null }),
  setProjectId: (projectId) => set({ projectId }),
  setSourceLanguage: (sourceLanguage) => set({ sourceLanguage }),
  reset: () => set({ status: 'idle', progress: 0, error: null, projectId: null, sourceLanguage: 'auto' }),
}));
