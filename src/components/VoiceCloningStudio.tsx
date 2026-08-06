'use client';

import React, { useState } from 'react';
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
  FileAudio
} from 'lucide-react';

const MODAL_ENDPOINT_URL = "https://varunchow123--cross-lingual-voice-cloning-cosyvoice2-cos-22038c.modal.run";

export default function VoiceCloningStudio() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBase64, setAudioBase64] = useState<string>('');
  const [englishText, setEnglishText] = useState<string>(
    "Welcome back to my channel! Today we are exploring how AI cross-lingual voice cloning works in real-time."
  );
  
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [clonedAudioUrl, setClonedAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Handle File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFile(file);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data url prefix (e.g. data:audio/wav;base64,)
      const base64Data = result.split(',')[1];
      setAudioBase64(base64Data);
    };
    reader.readAsDataURL(file);
  };

  // Generate Voice Clone via Modal API
  const handleGenerateVoice = async () => {
    if (!audioBase64) {
      setErrorMsg("Please upload a creator audio sample (3-10 sec) first.");
      return;
    }
    if (!englishText.trim()) {
      setErrorMsg("Please enter the English text to generate.");
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const response = await fetch(MODAL_ENDPOINT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: englishText,
          audio_b64: audioBase64
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();

      if (data.audio_b64) {
        const audioBlob = b64toBlob(data.audio_b64, 'audio/wav');
        const url = URL.createObjectURL(audioBlob);
        setClonedAudioUrl(url);
      } else {
        throw new Error(data.error || "Failed to generate audio output.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Something went wrong while contacting the Modal voice engine.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Utility to convert Base64 to Blob
  const b64toBlob = (b64Data: string, contentType = 'audio/wav', sliceSize = 512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <section id="voice-cloning" className="py-20 px-6 max-w-5xl mx-auto scroll-mt-20">
      
      {/* Header Badge & Title */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Powered by CosyVoice 2-0.5B on Modal L4 GPU</span>
        </div>
        
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-zinc-100">
          Cross-Lingual Voice Cloning Studio
        </h2>
        
        <p className="mt-4 text-base text-zinc-400 max-w-xl mx-auto">
          Upload a 3–10 second audio sample of your creator speaking in Telugu (or any language), and generate English speech in their exact voice.
        </p>
      </div>

      {/* Main Studio Card */}
      <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Creator Audio Upload */}
          <div className="flex flex-col gap-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Mic className="w-4 h-4 text-violet-400" />
              <span>1. Creator Voice Sample</span>
            </label>

            <div className="relative border-2 border-dashed border-zinc-800 hover:border-violet-500/50 rounded-xl p-6 text-center transition-all bg-zinc-950/40 group cursor-pointer">
              <input 
                type="file" 
                accept="audio/*" 
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-zinc-900 group-hover:bg-violet-500/10 border border-zinc-800 group-hover:border-violet-500/30 flex items-center justify-center transition-all">
                  <FileAudio className="w-6 h-6 text-zinc-400 group-hover:text-violet-400 transition-colors" />
                </div>
                
                {audioFile ? (
                  <div>
                    <p className="text-sm font-medium text-emerald-400 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{audioFile.name}</span>
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">{(audioFile.size / 1024 / 1024).toFixed(2)} MB loaded</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-zinc-200 group-hover:text-white">
                      Drop creator audio file here
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Supports .wav, .mp3, .m4a (3-10 sec clip)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: English Script Input */}
          <div className="flex flex-col gap-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>2. Target English Script</span>
            </label>

            <textarea 
              value={englishText}
              onChange={(e) => setEnglishText(e.target.value)}
              rows={4}
              placeholder="Enter translated English script..."
              className="w-full rounded-xl bg-zinc-950/60 border border-zinc-800 p-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 transition-all resize-none"
            />
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleGenerateVoice}
            disabled={isGenerating}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Cloning Voice on Modal L4 GPU...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Generate Cloned English Voice</span>
              </>
            )}
          </button>
        </div>

        {/* Generated Output Player */}
        {clonedAudioUrl && (
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 rounded-xl bg-zinc-950 border border-violet-500/30 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
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
                  <span>Cloned Voice Generated Successfully!</span>
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  High-fidelity zero-shot speech in creator's voice
                </div>
              </div>
            </div>

            <audio 
              ref={audioRef} 
              src={clonedAudioUrl} 
              onEnded={() => setIsPlaying(false)}
              className="hidden" 
            />

            <a
              href={clonedAudioUrl}
              download="cloned_creator_voice.wav"
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Audio</span>
            </a>
          </motion.div>
        )}

      </div>
    </section>
  );
}
