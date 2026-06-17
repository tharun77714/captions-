const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://teydehnwtfeyfmzxcsta.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRleWRlaG53dGZleWZtenhjc3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI0MjU3MCwiZXhwIjoyMDk2ODE4NTcwfQ.VprBWN0245PWK-yuts_7uj-jiPXQA7bjU_U-7NSIF5k";
const TRIGGER_URL = "https://kothapallitharun777--vidyut-transcriber-trigger.modal.run";
const S3_KEY = "anon_user/3b4163dc-e6f6-4450-a875-be28a19f7a34/raw.mp4";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function runLoadTest(concurrency = 10) {
  console.log(`=== STARTING CONCURRENT LOAD TEST (${concurrency} JOBS) ===`);
  const projectIds = [];
  
  // 1. Create temporary projects
  console.log(`[1/4] Inserting ${concurrency} temporary projects into Supabase...`);
  for (let i = 0; i < concurrency; i++) {
    const id = generateUUID();
    const { error } = await supabase.from('projects').insert({
      id,
      user_id: '00000000-0000-0000-0000-000000000000',
      title: `Load Test Project ${i + 1}`,
      status: 'queued',
      media_url: S3_KEY,
      subtitle_style: {
        fontSize: 24,
        position: 'bottom',
        alignment: 'center',
        textColor: '#FFFFFF',
        fontFamily: 'Inter',
        fontWeight: 700,
        shadowBlur: 4,
        shadowColor: 'rgba(0, 0, 0, 0.5)',
        strokeColor: '#000000',
        strokeWidth: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)'
      }
    });
    if (error) {
      console.error(`Failed to insert project ${i}:`, error.message);
      return;
    }
    projectIds.push(id);
  }
  console.log(`✅ Temporary projects inserted.`);

  // 2. Fire concurrent requests to Modal
  console.log(`[2/4] Firing ${concurrency} trigger requests concurrently to Modal...`);
  const startTime = Date.now();
  const triggerPromises = projectIds.map(async (id, idx) => {
    const triggerStart = Date.now();
    try {
      const response = await fetch(TRIGGER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: id, s3_key: S3_KEY })
      });
      const data = await response.json();
      const latency = Date.now() - triggerStart;
      console.log(`Trigger request ${idx + 1} response received in ${latency}ms:`, data);
      return { id, success: response.ok, latency };
    } catch (err) {
      console.error(`Trigger request ${idx + 1} failed:`, err.message);
      return { id, success: false, error: err.message };
    }
  });

  const triggerResults = await Promise.all(triggerPromises);
  console.log(`✅ All trigger requests dispatched.`);

  // 3. Poll projects status from Supabase
  console.log(`[3/4] Polling project statuses to measure execution metrics...`);
  const projectTimings = projectIds.map(id => ({
    id,
    triggeredAt: startTime,
    startedTranscribingAt: null,
    completedAt: null,
    status: 'pending',
    queueTime: null,
    executionTime: null,
    totalTime: null
  }));

  let completedCount = 0;
  const pollInterval = 2000; // 2 seconds
  const timeoutMs = 180000;  // 3 minutes timeout
  const pollStart = Date.now();

  while (completedCount < concurrency && (Date.now() - pollStart) < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    
    // Fetch current status for all projects
    const { data: currentProjects, error } = await supabase
      .from('projects')
      .select('id, status, title')
      .in('id', projectIds);
      
    if (error) {
      console.error('Polling error:', error.message);
      continue;
    }

    for (const proj of currentProjects) {
      const timing = projectTimings.find(t => t.id === proj.id);
      if (!timing) continue;

      if (proj.status === 'transcribing' && !timing.startedTranscribingAt) {
        timing.startedTranscribingAt = Date.now();
        timing.queueTime = (timing.startedTranscribingAt - timing.triggeredAt) / 1000;
        console.log(`[Status Update] Project ${proj.id.slice(0,8)} started transcribing (Queue wait: ${timing.queueTime.toFixed(2)}s)`);
      }

      if ((proj.status === 'ready' || proj.status === 'failed') && !timing.completedAt) {
        timing.completedAt = Date.now();
        timing.status = proj.status;
        timing.totalTime = (timing.completedAt - timing.triggeredAt) / 1000;
        if (timing.startedTranscribingAt) {
          timing.executionTime = (timing.completedAt - timing.startedTranscribingAt) / 1000;
        } else {
          timing.executionTime = timing.totalTime;
        }
        completedCount++;
        console.log(`[Status Update] Project ${proj.id.slice(0,8)} finished with status "${proj.status}" in ${timing.totalTime.toFixed(2)}s`);
      }
    }
  }

  // 4. Summarize and Clean up
  console.log(`\n=== LOAD TEST RESULTS ===`);
  let totalQueueTime = 0;
  let totalExecTime = 0;
  let totalDuration = 0;
  let failedJobs = 0;
  let finishedJobs = 0;

  projectTimings.forEach((t, i) => {
    console.log(`Job ${i + 1} (${t.id.slice(0,8)}):`);
    console.log(`  Status:         ${t.status}`);
    console.log(`  Queue Wait:     ${t.queueTime ? t.queueTime.toFixed(2) + 's' : 'N/A'}`);
    console.log(`  Execution Time: ${t.executionTime ? t.executionTime.toFixed(2) + 's' : 'N/A'}`);
    console.log(`  Total Duration: ${t.totalTime ? t.totalTime.toFixed(2) + 's' : 'N/A'}`);
    
    if (t.status === 'ready') {
      totalQueueTime += t.queueTime || 0;
      totalExecTime += t.executionTime || 0;
      totalDuration += t.totalTime || 0;
      finishedJobs++;
    } else {
      failedJobs++;
    }
  });

  const avgQueue = finishedJobs > 0 ? (totalQueueTime / finishedJobs) : 0;
  const avgExec = finishedJobs > 0 ? (totalExecTime / finishedJobs) : 0;
  const avgTotal = finishedJobs > 0 ? (totalDuration / finishedJobs) : 0;
  const failureRate = (failedJobs / concurrency) * 100;

  console.log(`\nSummary:`);
  console.log(`  Average Queue Wait Time:   ${avgQueue.toFixed(2)}s`);
  console.log(`  Average Execution Time:    ${avgExec.toFixed(2)}s`);
  console.log(`  Average Total Time:        ${avgTotal.toFixed(2)}s`);
  console.log(`  Failure Rate:              ${failureRate.toFixed(2)}%`);

  console.log(`\n[4/4] Cleaning up temporary projects and transcriptions from Supabase...`);
  // Delete transcriptions
  const { error: delTransError } = await supabase
    .from('transcriptions')
    .delete()
    .in('project_id', projectIds);
    
  if (delTransError) {
    console.error('Cleanup transcriptions error:', delTransError.message);
  }

  // Delete projects
  const { error: delProjError } = await supabase
    .from('projects')
    .delete()
    .in('id', projectIds);
    
  if (delProjError) {
    console.error('Cleanup projects error:', delProjError.message);
  } else {
    console.log('✅ Cleanup completed successfully.');
  }
}

runLoadTest().catch(console.error);
