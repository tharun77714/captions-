import crypto from 'crypto';

export class RevisionHasher {
  static hash(snapshot: any): string {
    const serialized = JSON.stringify(snapshot, Object.keys(snapshot).sort());
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }
}
