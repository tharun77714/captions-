'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  Upload, 
  Sparkles, 
  Play, 
  Pause, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  Volume2,
  FileVideo,
  Globe,
  Clock,
  Edit3,
  Sliders
} from 'lucide-react';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English (US/UK)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'ja', name: 'Japanese (日本語)' },
];

const SOURCE_LANGUAGES = [
  { code: 'auto', name: 'Auto Detect' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'en', name: 'English (US/UK)' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'ja', name: 'Japanese (日本語)' },
];

export default function SvaraVoiceStudio() {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [sourceLang, setSourceLang] = useState<string>('auto');
  const [targetLang, setTargetLang] = useState<string>('en');
  
  // Pipeline Processing States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Result States
  const [originalTranscript, setOriginalTranscript] = useState<string>('');
  const [translatedScript, setTranslatedScript] = useState<string>('');
  const [utterances, setUtterances] = useState<Array<{ text: string; start: number; end: number }>>([]);
  const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Speaking Pace Control
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Handle File Upload Select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaFile(file);
    setErrorMsg(null);
    setDubbedAudioUrl(null);
    setOriginalTranscript('');
    setTranslatedScript('');
  };

  // Run End-to-End Dubbing & Voice Cloning Pipeline
  const handleStartDubbing = async () => {
    if (!mediaFile) {
      setErrorMsg("Please upload a video or audio file first.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setUploadProgress(0);
    setCurrentStep("1/4 Initializing Cloudflare R2 Upload...");

    try {
      // Step A: Initialize presigned R2 upload URL
      const initRes = await fetch('/api/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: mediaFile.name,
          contentType: mediaFile.type || 'video/mp4',
          fileSize: mediaFile.size
        })
      });

      if (!initRes.ok) {
        const errJson = await initRes.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to initialize R2 upload.");
      }

      const { url, key } = await initRes.json();

      // Step B: Upload file directly to R2 bucket via presigned PUT URL
      setCurrentStep("2/4 Uploading media to Cloudflare R2 storage...");
      
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url, true);
        xhr.setRequestHeader('Content-Type', mediaFile.type || 'video/mp4');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`R2 Upload failed with status ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Network error during R2 upload"));
        xhr.send(mediaFile);
      });

      // Step C: Trigger Deepgram STT, Gemini Translation & CosyVoice 2 Modal Synthesis
      setCurrentStep("3/4 Deepgram STT, Gemini Translation & CosyVoice 2 Synthesis...");

      const response = await fetch('/api/svara-voice/dubbing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          s3_key: key,
          source_language: sourceLang,
          target_language: targetLang
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned error (${response.status})`);
      }

      const data = await response.json();

      setCurrentStep("4/4 Dubbing complete! Matching speaker pace...");

      setOriginalTranscript(data.original_transcript || '');
      setTranslatedScript(data.translated_script || '');
      setUtterances(data.utterances || []);

      if (data.dubbed_audio_b64) {
        const audioBlob = b64toBlob(data.dubbed_audio_b64, 'audio/wav');
        const audioUrl = URL.createObjectURL(audioBlob);
        setDubbedAudioUrl(audioUrl);
      } else {
        throw new Error("No dubbed audio output was returned from voice engine.");
      }

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to complete AI dubbing pipeline.");
    } finally {
      setIsProcessing(false);
      setCurrentStep('');
      setUploadProgress(0);
    }
  };

  // Base64 to Blob helper
  const b64toBlob = (b64Data: string, contentType = 'audio/wav', sliceSize = 512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    return new Blob(byteArrays, { type: contentType });
  };

  // Toggle Audio Playback
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Update Pace / Speed
  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  return (
    <section className="py-8 px-4 max-w-5xl mx-auto">
      
      {/* Title */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Deepgram Nova-2 STT + Gemini 1.5 + CosyVoice 2-0.5B</span>
        </div>
        
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-zinc-100">
          AI Video Dubbing & Voice Cloning Studio
        </h1>
        
        <p className="mt-3 text-sm text-zinc-400 max-w-xl mx-auto">
          Upload any raw video file. Our pipeline transcribes audio with Deepgram, translates script to your target language with timestamps, and synthesizes dubbed speech in the creator's exact voice.
        </p>
      </div>

      {/* Main Container */}
      <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* Left Column: Media File Upload */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <FileVideo className="w-4 h-4 text-violet-400" />
              <span>1. Upload Video / Audio File</span>
            </label>

            <div className="relative border-2 border-dashed border-zinc-800 hover:border-violet-500/50 rounded-xl p-6 text-center transition-all bg-zinc-950/40 group cursor-pointer">
              <input 
                type="file" 
                accept="video/*,audio/*" 
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-zinc-900 group-hover:bg-violet-500/10 border border-zinc-800 group-hover:border-violet-500/30 flex items-center justify-center transition-all">
                  <Upload className="w-6 h-6 text-zinc-400 group-hover:text-violet-400 transition-colors" />
                </div>
                
                {mediaFile ? (
                  <div>
                    <p className="text-sm font-medium text-emerald-400 flex items-center justify-center gap-1.5 truncate max-w-[240px] mx-auto">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{mediaFile.name}</span>
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">{(mediaFile.size / 1024 / 1024).toFixed(2)} MB loaded</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-zinc-200 group-hover:text-white">
                      Drop video or audio file here
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      MP4, MOV, WEBM, WAV, MP3 (Up to 500 MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Source + Target Language Selection */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>2. Select Languages</span>
            </label>

            {/* Source Language */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
              <label className="text-[11px] text-zinc-400 mb-2 block font-medium">
                Original video language:
              </label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg p-3 outline-none focus:border-violet-500 cursor-pointer font-medium transition-colors"
              >
                {SOURCE_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between h-full">
              <div>
                <label className="text-[11px] text-zinc-400 mb-2 block font-medium">
                  Dub video dialogue into:
                </label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full bg-zinc-900 border border-violet-500/40 text-violet-200 text-sm rounded-lg p-3 outline-none focus:border-violet-500 cursor-pointer font-medium transition-colors"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/80 text-xs text-zinc-500 flex items-center gap-2">
                <Mic className="w-3.5 h-3.5 text-violet-400" />
                <span>CosyVoice 2 will synthesize translated speech matching original vocal timbre & pace.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Button & Processing Progress */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleStartDubbing}
            disabled={isProcessing || !mediaFile}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing AI Video Dubbing...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Start AI Video Dubbing & Voice Cloning</span>
              </>
            )}
          </button>

          {isProcessing && (
            <div className="w-full max-w-xs mt-4 flex flex-col items-center">
              <p className="text-xs text-violet-400 font-mono mb-2 animate-pulse text-center">
                {currentStep} {uploadProgress > 0 && uploadProgress < 100 ? `(${uploadProgress}%)` : ''}
              </p>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-violet-500 transition-all duration-200" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results View: Timestamps & Translated Script */}
        {translatedScript && (
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 pt-8 border-t border-zinc-800"
          >
            <h3 className="text-base font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-400" />
              <span>Timestamped Dialogue & Translated Script</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Original Transcript */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <div className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">Original Video Speech</div>
                <p className="text-sm text-zinc-300 leading-relaxed">{originalTranscript}</p>
              </div>

              {/* Translated Target Script */}
              <div className="bg-zinc-950 border border-violet-500/30 rounded-xl p-4">
                <div className="text-xs font-mono uppercase tracking-wider text-violet-400 mb-2 flex items-center justify-between">
                  <span>Translated Target Script ({SUPPORTED_LANGUAGES.find(l=>l.code===targetLang)?.name})</span>
                  <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <textarea 
                  value={translatedScript}
                  onChange={(e) => setTranslatedScript(e.target.value)}
                  rows={3}
                  className="w-full bg-transparent text-sm text-zinc-100 outline-none resize-none"
                />
              </div>
            </div>

            {/* Generated Dubbed Audio Player */}
            {dubbedAudioUrl && (
              <div className="p-6 rounded-xl bg-zinc-950 border border-violet-500/40 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={togglePlay}
                      className="w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition-transform active:scale-95 shadow-md shadow-violet-600/30"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>

                    <div>
                      <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                        <span>Dubbed Audio Track Generated!</span>
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        Synthesized in creator's voice with target language alignment
                      </div>
                    </div>
                  </div>

                  <a
                    href={dubbedAudioUrl}
                    download={`dubbed_voice_${targetLang}.wav`}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Dubbed Audio (.wav)</span>
                  </a>
                </div>

                {/* Speaking Pace / Speed Adjustment */}
                <div className="pt-4 border-t border-zinc-800/80 flex items-center gap-4">
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                    <Sliders className="w-3.5 h-3.5 text-violet-400" />
                    <span>Speaking Pace:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[0.9, 1.0, 1.1, 1.25].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => handleSpeedChange(speed)}
                        className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                          playbackRate === speed 
                            ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 font-semibold' 
                            : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>

                <audio 
                  ref={audioRef} 
                  src={dubbedAudioUrl} 
                  onEnded={() => setIsPlaying(false)}
                  className="hidden" 
                />
              </div>
            )}
          </motion.div>
        )}

      </div>
    </section>
  );
}
