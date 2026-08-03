export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

const VIDEO_TYPES = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
} as const;

export type VideoExtension = keyof typeof VIDEO_TYPES;

export function getVideoUploadDescriptor(filename: string, contentType?: string) {
  const extension = filename.trim().toLowerCase().split('.').pop() as VideoExtension | undefined;
  if (!extension || !(extension in VIDEO_TYPES)) return null;

  const expectedType = VIDEO_TYPES[extension];
  const normalizedType = (contentType || '').toLowerCase();
  const typeIsCompatible = !normalizedType || normalizedType === expectedType || normalizedType === 'application/octet-stream';

  if (!typeIsCompatible) return null;

  return { extension, contentType: expectedType };
}

export function isSupportedVideo(filename: string, contentType?: string) {
  return Boolean(getVideoUploadDescriptor(filename, contentType));
}
