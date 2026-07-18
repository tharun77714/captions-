import { spawn } from 'child_process';
import { WorkerClient } from './client';

export class LocalWorkerClient implements WorkerClient {
  async submitJob(jobId: string, projectId: string): Promise<void> {
    console.log(`[LocalWorkerClient] Spawning CLI runner for jobId=${jobId}, projectId=${projectId}`);
    
    const child = spawn('python', ['-m', 'composition_engine.cli', jobId, projectId], {
      detached: true,
      stdio: 'ignore',
      cwd: process.cwd()
    });
    child.unref();
  }

  async cancelJob(jobId: string): Promise<void> {
    console.log(`[LocalWorkerClient] Cancel requested for jobId=${jobId}`);
  }

  async health(): Promise<boolean> {
    return true;
  }
}
