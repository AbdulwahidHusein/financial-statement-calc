import {
  emptyFinancialData,
  MAX_PROJECTION_YEARS,
  type FinancialData,
} from '@/lib/finance';

const STORAGE_KEY = 'financial-statement-calc:v1';

export type PersistedAppState = {
  version: 1;
  data: FinancialData;
  projectionYears: number;
  savedAt: string;
};

const NUMBER_FIELD_KEYS = [
  'sales',
  'beginningInventory',
  'purchases',
  'endingInventory',
  'salaryAndBenefit',
  'transportationCost',
  'loadingAndUnloading',
  'repairAndMaintenance',
  'stationaryAndPrinting',
  'miscellaneousExpense',
  'profitTax',
  'cashOnBank',
  'otherReceivables',
  'building',
  'propertyAndEquipment',
  'vehicle',
  'accumulatedDepreciation',
  'employeeBenefitPayable',
  'creditPurchasePayable',
  'outstandingFinancing',
  'beginningCapital',
  'reservedCapital',
  'additionalCapital',
] as const satisfies ReadonlyArray<keyof FinancialData>;

function sanitizeNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseFinancialData(raw: unknown): FinancialData {
  if (!raw || typeof raw !== 'object') {
    return { ...emptyFinancialData };
  }

  const record = raw as Record<string, unknown>;
  const data: FinancialData = { ...emptyFinancialData };

  data.companyName = typeof record.companyName === 'string' ? record.companyName : '';
  data.statementDate = typeof record.statementDate === 'string' ? record.statementDate : '';

  for (const key of NUMBER_FIELD_KEYS) {
    data[key] = sanitizeNumber(record[key]);
  }

  return data;
}

function parseProjectionYears(raw: unknown): number {
  const parsed = sanitizeNumber(raw);
  const rounded = Math.trunc(parsed);
  return Math.min(Math.max(rounded, 0), MAX_PROJECTION_YEARS);
}

export function loadPersistedState(): PersistedAppState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const record = parsed as Record<string, unknown>;
    const data = parseFinancialData(record.data);
    const projectionYears = parseProjectionYears(record.projectionYears);

    return {
      version: 1,
      data,
      projectionYears,
      savedAt: typeof record.savedAt === 'string' ? record.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function savePersistedState(data: FinancialData, projectionYears: number): boolean {
  if (typeof window === 'undefined') return false;

  const payload: PersistedAppState = {
    version: 1,
    data,
    projectionYears: parseProjectionYears(projectionYears),
    savedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    return false;
  }
}

export function clearPersistedState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
