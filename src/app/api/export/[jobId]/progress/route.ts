import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const responseHeaders = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const interval = setInterval(async () => {
        try {
          const { data: job, error } = await supabaseAdmin
            .from('export_jobs')
            .select('status, progress, stage, output_url, error')
            .eq('id', jobId)
            .single();

          if (error) {
            console.error('SSE DB fetch error:', error);
            return;
          }

          if (job) {
            sendEvent({
              status: job.status,
              progress: job.progress,
              stage: job.stage,
              outputUrl: job.output_url,
              error: job.error
            });

            if (['completed', 'failed', 'cancelled'].includes(job.status)) {
              clearInterval(interval);
              controller.close();
            }
          }
        } catch (err) {
          console.error('SSE Stream error:', err);
          clearInterval(interval);
          controller.close();
        }
      }, 1000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new NextResponse(stream, { headers: responseHeaders });
}
