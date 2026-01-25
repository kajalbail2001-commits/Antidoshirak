

export type UnitType = 'generation' | 'second' | 'minute';
export type CategoryType = 'video' | 'image' | 'audio' | 'text' | 'avatar' | 'other';

export interface Tool {
  id: string;
  name: string;
  lightning_price: number;
  unit: UnitType;
  category: CategoryType;
}

export interface ProjectItem extends Tool {
  uniqueId: string;
  amount: number;
}

export interface AppMeta {
  last_updated: string;
}

export interface PriceData {
  meta: AppMeta;
  tools: Tool[];
}

// Factors updated based on PDF
export enum RiskLevel {
  LOW = 1.2,   // Четкое ТЗ
  MID = 1.6,   // Средняя неопределенность
  HIGH = 2.2   // Полный туман
}

export enum UrgencyLevel {
  STANDARD = 1.0,
  ASAP = 1.5,
  YESTERDAY = 2.0
}

export interface AppSettings {
  hourlyRate: number;
  packagePriceUsd: number;
  packageTokens: number;
  // Financial Floor Params
  targetMonthlyIncome: number;
  billableHoursPerMonth: number;
  // Branding
  creatorName?: string;
  creatorTelegram?: string;
  creatorAvatarUrl?: string;
  clientName?: string;
  customTools?: Tool[];
}

export interface SharedQuote {
  items: ProjectItem[];
  laborHours: number;
  hourlyRate: number;
  risk: RiskLevel;
  urgency: UrgencyLevel;
  currencyRate: number;
  totalCost: number; // Snapshot of total
  // Snapshot of Branding
  clientName?: string;
  creatorName?: string;
  creatorTelegram?: string;
  creatorAvatarUrl?: string;
}

// --- MARKET RATES TYPES ---
export interface MarketTier {
  label: string;
  price_range: [number, number]; // Min, Max
  sla_days: number;
  desc: string;
}

export interface MarketService {
  id: string;
  name: string;
  category: string;
  base_unit_amount: number; // e.g. 30 (seconds) or 1 (pack)
  unit_label: string; // "сек" or "шт"
  tiers: {
    tier_1: MarketTier;
    tier_2: MarketTier;
    tier_3: MarketTier;
  }
}

export interface MarketRatesData {
  meta: {
    currency: string;
    last_updated: string;
    min_engagement_fee: number;
  };
  services: MarketService[];
}