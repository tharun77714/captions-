import { WorkerClient } from './client';

export class ModalWorkerClient implements WorkerClient {
  async submitJob(jobId: string, projectId: string): Promise<void> {
    const webhookUrl = process.env.MODAL_EXPORT_WEBHOOK_URL;
    if (!webhookUrl) throw new Error('MODAL_EXPORT_WEBHOOK_URL is not configured');

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, project_id: projectId }),
    });

    if (!res.ok) {
      throw new Error(`Failed to submit job to Modal: ${res.statusText}`);
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    console.log(`[ModalWorkerClient] Cancel requested for jobId=${jobId}`);
  }

  async health(): Promise<boolean> {
    return true;
  }
}
