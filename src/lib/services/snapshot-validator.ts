export class SnapshotValidator {
  static validate(snapshot: any): void {
    if (!snapshot.projectId) {
      throw new Error('Validation Error: Missing projectId');
    }
    if (!snapshot.backgroundVideo || !snapshot.backgroundVideo.url) {
      throw new Error('Validation Error: Missing backgroundVideo url');
    }
    if (snapshot.fps <= 0 || snapshot.fps > 120) {
      throw new Error(`Validation Error: Invalid FPS: ${snapshot.fps}`);
    }
    if (!snapshot.segments || !Array.isArray(snapshot.segments)) {
      throw new Error('Validation Error: Missing segments array');
    }
  }
}
