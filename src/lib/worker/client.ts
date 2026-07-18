export interface WorkerClient {
  submitJob(jobId: string, projectId: string): Promise<void>;
  cancelJob(jobId: string): Promise<void>;
  health(): Promise<boolean>;
}

export function getWorkerClient(): WorkerClient {
  const isModal = process.env.MODAL_EXPORT_WEBHOOK_URL ? true : false;
  if (isModal) {
    const { ModalWorkerClient } = require('./modal');
    return new ModalWorkerClient();
  }
  const { LocalWorkerClient } = require('./local');
  return new LocalWorkerClient();
}
