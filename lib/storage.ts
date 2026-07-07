import {
  emptyFinancialData,
  getDefaultStatementDate,
  MAX_PROJECTION_MONTHS,
  MAX_PROJECTION_YEARS,
  normalizeProjectionPeriod,
  type FinancialData,
} from '@/lib/finance';
import { canonicalizeSnapshotMap, getPeriodKey, type PeriodKey } from '@/lib/periods';

const STORAGE_KEY = 'financial-statement-calc:v2';

export type PersistedAppState = {
  version: 2;
  baseStatementDate: string;
  periodSnapshots: Record<PeriodKey, FinancialData>;
  projectionYears: number;
  projectionMonths: number;
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

function parseProjectionPeriod(years: unknown, months: unknown) {
  return normalizeProjectionPeriod(sanitizeNumber(years), sanitizeNumber(months));
}

function parsePeriodSnapshots(raw: unknown): Record<PeriodKey, FinancialData> {
  if (!raw || typeof raw !== 'object') return {};

  const snapshots: Record<PeriodKey, FinancialData> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (/^\d+-\d+$/.test(key)) {
      snapshots[key as PeriodKey] = parseFinancialData(value);
    }
  }
  return snapshots;
}

function migrateV1(record: Record<string, unknown>): PersistedAppState {
  const data = parseFinancialData(record.data);
  const baseStatementDate = data.statementDate || getDefaultStatementDate();
  const currentKey = getPeriodKey(0, 0);

  return {
    version: 2,
    baseStatementDate,
    periodSnapshots: {
      [currentKey]: { ...data, statementDate: baseStatementDate },
    },
    projectionYears: parseProjectionPeriod(record.projectionYears, record.projectionMonths).years,
    projectionMonths: parseProjectionPeriod(record.projectionYears, record.projectionMonths).months,
    savedAt: typeof record.savedAt === 'string' ? record.savedAt : new Date().toISOString(),
  };
}

export function loadPersistedState(): PersistedAppState | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    const rawV1 = localStorage.getItem('financial-statement-calc:v1');
    const raw = rawV2 ?? rawV1;
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const record = parsed as Record<string, unknown>;

    if (record.version === 2) {
      const baseStatementDate =
        typeof record.baseStatementDate === 'string' && record.baseStatementDate
          ? record.baseStatementDate
          : new Date().toISOString().slice(0, 10);
      const periodSnapshots = canonicalizeSnapshotMap(
        parsePeriodSnapshots(record.periodSnapshots),
        baseStatementDate
      );
      const { years: projectionYears, months: projectionMonths } = parseProjectionPeriod(
        record.projectionYears,
        record.projectionMonths
      );
      const currentKey = getPeriodKey(0, 0);

      if (!periodSnapshots[currentKey]) {
        periodSnapshots[currentKey] = {
          ...emptyFinancialData,
          statementDate: baseStatementDate,
        };
      }

      return {
        version: 2,
        baseStatementDate,
        periodSnapshots,
        projectionYears,
        projectionMonths,
        savedAt: typeof record.savedAt === 'string' ? record.savedAt : new Date().toISOString(),
      };
    }

    return migrateV1(record);
  } catch {
    return null;
  }
}

export function savePersistedState(
  baseStatementDate: string,
  periodSnapshots: Record<PeriodKey, FinancialData>,
  projectionYears: number,
  projectionMonths: number
): boolean {
  if (typeof window === 'undefined') return false;

  const period = parseProjectionPeriod(projectionYears, projectionMonths);
  const payload: PersistedAppState = {
    version: 2,
    baseStatementDate,
    periodSnapshots,
    projectionYears: period.years,
    projectionMonths: period.months,
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
  localStorage.removeItem('financial-statement-calc:v1');
}

export { MAX_PROJECTION_YEARS, MAX_PROJECTION_MONTHS };
