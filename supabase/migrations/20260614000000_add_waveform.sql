-- Add waveform column to transcriptions table
ALTER TABLE public.transcriptions 
ADD COLUMN IF NOT EXISTS waveform JSONB;
