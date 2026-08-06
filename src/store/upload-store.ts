import { create } from 'zustand';

export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

interface UploadState {
  status: UploadStatus;
  progress: number; // 0 to 100
  error: string | null;
  projectId: string | null;
  sourceLanguage: string;
  targetLanguage: string;
  enableVoiceCloning: boolean;
  
  setStatus: (status: UploadStatus) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  setProjectId: (id: string | null) => void;
  setSourceLanguage: (lang: string) => void;
  setTargetLanguage: (lang: string) => void;
  setEnableVoiceCloning: (enable: boolean) => void;
  reset: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  status: 'idle',
  progress: 0,
  error: null,
  projectId: null,
  sourceLanguage: 'auto',
  targetLanguage: 'en',
  enableVoiceCloning: true,
  
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set(error ? { error, status: 'error' } : { error: null }),
  setProjectId: (projectId) => set({ projectId }),
  setSourceLanguage: (sourceLanguage) => set({ sourceLanguage }),
  setTargetLanguage: (targetLanguage) => set({ targetLanguage }),
  setEnableVoiceCloning: (enableVoiceCloning) => set({ enableVoiceCloning }),
  reset: () => set({ status: 'idle', progress: 0, error: null, projectId: null, sourceLanguage: 'auto', targetLanguage: 'en', enableVoiceCloning: true }),
}));
