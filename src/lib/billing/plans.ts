export type PlanId = 'free' | 'creator' | 'studio';

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  transcriptionSecondsPerMonth: number;
  exportsPerPeriod: number;
  exportPeriod: 'month' | 'day';
  watermark: boolean;
  savedExports: number;
  exportExpiryHours: number | null;
  thumbnailsPerMonth: number;
  features: string[];
}

export const PLAN_CONFIG: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Try the complete caption workflow.',
    transcriptionSecondsPerMonth: 180,
    exportsPerPeriod: 3,
    exportPeriod: 'month',
    watermark: true,
    savedExports: 3,
    exportExpiryHours: 1,
    thumbnailsPerMonth: 0,
    features: ['3 caption minutes/month', '3 exports/month', 'Vidyut watermark', 'Multilingual captions'],
  },
  creator: {
    id: 'creator',
    name: 'Creator',
    description: 'For creators publishing consistently.',
    transcriptionSecondsPerMonth: 1800,
    exportsPerPeriod: 30,
    exportPeriod: 'day',
    watermark: false,
    savedExports: 50,
    exportExpiryHours: null,
    thumbnailsPerMonth: 0,
    features: ['30 caption minutes/month', '30 exports/day', 'No watermark', 'Saved export library', 'Premium styles'],
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    description: 'For teams and high-output creators.',
    transcriptionSecondsPerMonth: 2700,
    exportsPerPeriod: 30,
    exportPeriod: 'day',
    watermark: false,
    savedExports: 50,
    exportExpiryHours: null,
    thumbnailsPerMonth: 15,
    features: ['45 caption minutes/month', '30 exports/day', 'No watermark', 'Saved export library', 'AI thumbnail entitlement'],
  },
};

export function isPlanId(value: unknown): value is PlanId {
  return value === 'free' || value === 'creator' || value === 'studio';
}

export function effectivePlan(plan: unknown, status: unknown): PlanId {
  return isPlanId(plan) && (status === 'active' || status === 'trialing') ? plan : 'free';
}
