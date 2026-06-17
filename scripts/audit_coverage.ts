import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, title, duration_ms, status')
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(5);

  if (projectsError) {
    console.error("Error fetching projects", projectsError);
    return;
  }

  for (const project of projects) {
    const durationS = project.duration_ms ? project.duration_ms / 1000 : 0;
    console.log(`\n======================================`);
    console.log(`Project: ${project.title} (ID: ${project.id})`);
    console.log(`Duration: ${durationS}s`);
    
    const { data: transcription, error: transError } = await supabase
      .from('transcriptions')
      .select('segments, words')
      .eq('project_id', project.id)
      .single();
      
    if (transError || !transcription) {
      console.log("No transcription found.");
      continue;
    }
    
    const segments = transcription.segments || [];
    
    if (segments.length === 0) {
      console.log("Subtitle Coverage: 0% (0s / " + durationS + "s)");
      continue;
    }
    
    let totalSubtitleDuration = 0;
    for (const seg of segments) {
      totalSubtitleDuration += (seg.end - seg.start);
    }
    
    // Gaps
    console.log(`Subtitle Coverage: ${Math.round((totalSubtitleDuration / durationS) * 100)}% (${totalSubtitleDuration.toFixed(2)}s / ${durationS}s)`);
    console.log("Gaps > 1s:");
    let gapFound = false;
    
    if (segments[0].start > 1) {
      console.log(`  [0.00s -> ${segments[0].start.toFixed(2)}s] Gap: ${segments[0].start.toFixed(2)}s`);
      gapFound = true;
    }
    
    for (let i = 0; i < segments.length - 1; i++) {
      const gap = segments[i+1].start - segments[i].end;
      if (gap > 1.0) {
        console.log(`  [${segments[i].end.toFixed(2)}s -> ${segments[i+1].start.toFixed(2)}s] Gap: ${gap.toFixed(2)}s`);
        gapFound = true;
      }
    }
    
    const lastSeg = segments[segments.length - 1];
    const endGap = durationS - lastSeg.end;
    if (endGap > 1.0) {
      console.log(`  [${lastSeg.end.toFixed(2)}s -> ${durationS}s] Gap: ${endGap.toFixed(2)}s`);
      gapFound = true;
    }
    
    if (!gapFound) {
      console.log("  None.");
    }
  }
}

runAudit().catch(console.error);
