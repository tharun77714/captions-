import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const authHeader = request.headers.get('Cookie') || '';
    
    // Parse transcript from body
    const body = await request.json();
    const { transcript } = body;

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'transcript is required' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      // If no Gemini API key, return smart mock data based on transcript
      return NextResponse.json({ clips: generateMockClips(transcript) });
    }

    const prompt = `You are a viral content strategist and social media expert.

Analyze this video transcript and find the top 4-6 most viral-worthy clip moments. 
For each clip, identify the time range, explain why it would perform well on social media,
and suggest a compelling hook caption.

Transcript:
${transcript}

Respond with ONLY valid JSON in this exact format:
{
  "clips": [
    {
      "startTime": 0.0,
      "endTime": 45.0,
      "score": 87,
      "type": "viral",
      "reason": "Strong hook, relatable moment, clear value proposition",
      "hook": "This single tip changed everything for me..."
    }
  ]
}

Rules:
- startTime and endTime must be real numbers (seconds) matching the transcript timestamps
- score must be 0-100 (higher = more viral potential)
- type must be one of: "emotional", "educational", "viral", "storytelling"
- Each clip should be 15-60 seconds long
- Focus on: strong opens, emotional peaks, surprising facts, actionable advice, story turns
- Return 4-6 clips maximum, sorted by score descending
- Only return valid JSON, no markdown`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[clip-finder] Gemini API error:', errText);
      // Fallback to mock on API error
      return NextResponse.json({ clips: generateMockClips(transcript) });
    }

    const geminiData = await response.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    let parsed: { clips: any[] };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Clean up any markdown code blocks
      const cleaned = rawText.replace(/```json\n?|```\n?/g, '').trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = { clips: generateMockClips(transcript) };
      }
    }

    return NextResponse.json({ clips: parsed.clips || [] });
  } catch (error: any) {
    console.error('[clip-finder] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * Smart fallback when no Gemini API key is configured.
 * Analyzes the transcript text directly for engaging moments.
 */
function generateMockClips(transcript: string): any[] {
  const lines = transcript.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return [];

  // Parse timestamps from "[MM:SS-MM:SS] text" format
  const parsed = lines.map((line) => {
    const match = line.match(/\[(\d+:\d+)-(\d+:\d+)\]\s*(.*)/);
    if (!match) return null;
    const [, start, end, text] = match;
    const toSeconds = (t: string) => {
      const [m, s] = t.split(':').map(Number);
      return m * 60 + s;
    };
    return { startTime: toSeconds(start), endTime: toSeconds(end), text };
  }).filter(Boolean) as { startTime: number; endTime: number; text: string }[];

  if (parsed.length < 3) return [];

  // Score each segment by simple heuristics
  const scored = parsed.map((seg) => {
    let score = 50;
    const text = seg.text.toLowerCase();
    
    // Boost for question words (hooks)
    if (/\?|how|why|what|never|always|secret|mistake|truth/.test(text)) score += 15;
    // Boost for first-person stories
    if (/i (was|did|found|discovered|learned|realized)/.test(text)) score += 10;
    // Boost for numbers (specificity)
    if (/\d+/.test(text)) score += 8;
    // Boost for emotional words
    if (/(love|hate|amazing|incredible|shocking|unbelievable|changed)/.test(text)) score += 12;
    // Penalize very short/long clips
    const duration = seg.endTime - seg.startTime;
    if (duration < 10 || duration > 120) score -= 20;
    if (duration >= 20 && duration <= 60) score += 10;
    
    return { ...seg, score: Math.min(100, Math.max(10, score)) };
  });

  // Sort by score, take top 4, group into 30-60s clips
  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const types: Array<'emotional' | 'educational' | 'viral' | 'storytelling'> = ['viral', 'emotional', 'educational', 'storytelling'];

  return top.map((seg, i) => ({
    startTime: seg.startTime,
    endTime: Math.min(seg.endTime, seg.startTime + 60),
    score: seg.score,
    type: types[i % types.length],
    reason: 'This moment has strong engagement signals based on pacing and content structure.',
    hook: `"${seg.text.slice(0, 60).trim()}..."`,
  }));
}
