import {
  calculateFinancials,
  emptyFinancialData,
  getDefaultStatementDate,
  getProjectedStatementDate,
  getTotalProjectionMonths,
  MAX_PROJECTION_MONTHS,
  MAX_PROJECTION_YEARS,
  normalizeProjectionPeriod,
  type FinancialData,
} from '@/lib/finance';

export type PeriodKey = `${number}-${number}`;

/**
 * Projection roll-forward rules (each +1 month step):
 *
 * CARRY: company name, fixed assets, accumulated depreciation (+1/12 of 10% annual)
 * ACCUMULATE: cash (+ prior period net income / 12)
 *
 * RESET each new period: all P&L activity, ending inventory, payables, receivables,
 *   profit tax, reserved capital, additional capital
 *
 * OUTPUT → INPUT (each month): prior ending inventory → beginning inventory
 * YEAR-END ONLY (every 12 months): total capital → beginning capital
 */

export function getPeriodKey(years: number, months: number): PeriodKey {
  const { years: y, months: m } = normalizeProjectionPeriod(years, months);
  return `${y}-${m}`;
}

export function parsePeriodKey(key: PeriodKey): { years: number; months: number } {
  const [years, months] = key.split('-').map(Number);
  return normalizeProjectionPeriod(years || 0, months || 0);
}

export function getMaxProjectionMonths(): number {
  return MAX_PROJECTION_YEARS * 12 + MAX_PROJECTION_MONTHS;
}

function grossFixedAssets(data: FinancialData) {
  return data.building + data.propertyAndEquipment + data.vehicle;
}

export function createPeriodSeedFromPrior(
  prior: FinancialData,
  baseStatementDate: string,
  targetYears: number,
  targetMonths: number
): FinancialData {
  const targetTotal = getTotalProjectionMonths(targetYears, targetMonths);
  const calc = calculateFinancials(prior);
  const grossFA = grossFixedAssets(prior);
  const monthlyDepreciation = grossFA > 0 ? grossFA * 0.1 / 12 : 0;
  const monthlyNetIncome = calc.netIncome / 12;
  const isYearEnd = targetTotal > 0 && targetTotal % 12 === 0;

  return {
    companyName: prior.companyName,
    statementDate: getProjectedStatementDate(baseStatementDate, targetYears, targetMonths),

    sales: 0,
    purchases: 0,
    endingInventory: 0,
    salaryAndBenefit: 0,
    transportationCost: 0,
    loadingAndUnloading: 0,
    repairAndMaintenance: 0,
    stationaryAndPrinting: 0,
    miscellaneousExpense: 0,
    profitTax: 0,

    beginningInventory: prior.endingInventory,
    beginningCapital: isYearEnd ? calc.totalCapital : prior.beginningCapital,
    cashOnBank: prior.cashOnBank + monthlyNetIncome,
    building: prior.building,
    propertyAndEquipment: prior.propertyAndEquipment,
    vehicle: prior.vehicle,
    accumulatedDepreciation: Math.min(prior.accumulatedDepreciation + monthlyDepreciation, grossFA),

    otherReceivables: 0,
    employeeBenefitPayable: 0,
    creditPurchasePayable: 0,
    outstandingFinancing: 0,
    reservedCapital: 0,
    additionalCapital: 0,
  };
}

export function resolvePeriodData(
  years: number,
  months: number,
  snapshots: Record<PeriodKey, FinancialData>,
  baseStatementDate: string
): FinancialData {
  const { years: y, months: m } = normalizeProjectionPeriod(years, months);
  const key = getPeriodKey(y, m);
  const saved = snapshots[key];
  const anchorDate = baseStatementDate || getDefaultStatementDate();

  if (saved) {
    return {
      ...saved,
      statementDate: getProjectedStatementDate(anchorDate, y, m),
    };
  }

  const total = getTotalProjectionMonths(y, m);
  if (total === 0) {
    return (
      snapshots['0-0'] ?? {
        ...emptyFinancialData,
        statementDate: anchorDate,
      }
    );
  }

  const priorTotal = total - 1;
  const priorYears = Math.floor(priorTotal / 12);
  const priorMonths = priorTotal % 12;
  const prior = resolvePeriodData(priorYears, priorMonths, snapshots, anchorDate);

  return createPeriodSeedFromPrior(prior, anchorDate, y, m);
}

export function getPriorPeriodCoords(years: number, months: number) {
  const total = getTotalProjectionMonths(years, months);
  if (total <= 0) return null;
  const priorTotal = total - 1;
  return normalizeProjectionPeriod(Math.floor(priorTotal / 12), priorTotal % 12);
}

/** Drop saved periods after an edited period so they re-seed from updated data. */
export function invalidateDownstreamSnapshots(
  snapshots: Record<PeriodKey, FinancialData>,
  editedYears: number,
  editedMonths: number
): Record<PeriodKey, FinancialData> {
  const editedTotal = getTotalProjectionMonths(editedYears, editedMonths);
  const next: Record<PeriodKey, FinancialData> = {};

  for (const [key, data] of Object.entries(snapshots)) {
    const coords = parsePeriodKey(key as PeriodKey);
    if (getTotalProjectionMonths(coords.years, coords.months) <= editedTotal) {
      next[getPeriodKey(coords.years, coords.months)] = data;
    }
  }

  return next;
}

export function ensurePeriodSnapshot(
  snapshots: Record<PeriodKey, FinancialData>,
  years: number,
  months: number,
  baseStatementDate: string
): Record<PeriodKey, FinancialData> {
  const { years: y, months: m } = normalizeProjectionPeriod(years, months);
  const key = getPeriodKey(y, m);
  if (snapshots[key]) return snapshots;

  return {
    ...snapshots,
    [key]: resolvePeriodData(y, m, snapshots, baseStatementDate),
  };
}

/** Merge duplicate keys (e.g. 0y12m and 1y0m) into canonical form. */
export function canonicalizeSnapshotMap(
  snapshots: Record<PeriodKey, FinancialData> | undefined | null,
  baseStatementDate: string
): Record<PeriodKey, FinancialData> {
  const anchorDate = baseStatementDate || getDefaultStatementDate();
  const merged: Record<PeriodKey, FinancialData> = {};

  if (!snapshots) return merged;

  for (const [rawKey, data] of Object.entries(snapshots)) {
    if (!/^\d+-\d+$/.test(rawKey)) continue;
    const coords = parsePeriodKey(rawKey as PeriodKey);
    const key = getPeriodKey(coords.years, coords.months);
    merged[key] = {
      ...data,
      statementDate: getProjectedStatementDate(anchorDate, coords.years, coords.months),
    };
  }

  return merged;
}

export function syncAllSnapshotDates(
  snapshots: Record<PeriodKey, FinancialData>,
  baseStatementDate: string
): Record<PeriodKey, FinancialData> {
  if (!baseStatementDate) return snapshots;

  const next: Record<PeriodKey, FinancialData> = {};
  for (const [key, data] of Object.entries(snapshots)) {
    const coords = parsePeriodKey(key as PeriodKey);
    next[key as PeriodKey] = {
      ...data,
      statementDate: getProjectedStatementDate(baseStatementDate, coords.years, coords.months),
    };
  }
  return next;
}
