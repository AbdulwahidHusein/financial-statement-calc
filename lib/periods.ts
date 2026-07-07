import {
  calculateFinancials,
  emptyFinancialData,
  getDefaultStatementDate,
  getProjectedStatementDate,
  getTotalProjectionMonths,
  normalizeProjectionPeriod,
  type FinancialData,
} from '@/lib/finance';

export type PeriodKey = `${number}-${number}`;

export function getPeriodKey(years: number, months: number): PeriodKey {
  const { years: y, months: m } = normalizeProjectionPeriod(years, months);
  return `${y}-${m}`;
}

export function parsePeriodKey(key: PeriodKey): { years: number; months: number } {
  const [years, months] = key.split('-').map(Number);
  return normalizeProjectionPeriod(years || 0, months || 0);
}

function grossFixedAssets(data: FinancialData) {
  return data.building + data.propertyAndEquipment + data.vehicle;
}

/**
 * Seed the next projection period from the prior period.
 * - Carries: company, fixed assets, accumulated depreciation (increased), cash (increased by monthly net income)
 * - Feeds outputs → inputs: ending inventory → beginning inventory, total capital → beginning capital (at year-end)
 * - Resets: P&L activity, period payables, reserved/additional capital, receivables
 */
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

    beginningInventory: isYearEnd ? prior.endingInventory : prior.beginningInventory,
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
  const key = getPeriodKey(years, months);
  const saved = snapshots[key];
  if (saved) return saved;

  const total = getTotalProjectionMonths(years, months);
  const anchorDate = baseStatementDate || getDefaultStatementDate();

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

  return createPeriodSeedFromPrior(prior, anchorDate, years, months);
}

export function getPriorPeriodCoords(years: number, months: number) {
  const total = getTotalProjectionMonths(years, months);
  if (total <= 0) return null;
  const priorTotal = total - 1;
  return {
    years: Math.floor(priorTotal / 12),
    months: priorTotal % 12,
  };
}

export function ensurePeriodSnapshot(
  snapshots: Record<PeriodKey, FinancialData>,
  years: number,
  months: number,
  baseStatementDate: string
): Record<PeriodKey, FinancialData> {
  const key = getPeriodKey(years, months);
  if (snapshots[key]) return snapshots;
  return {
    ...snapshots,
    [key]: resolvePeriodData(years, months, snapshots, baseStatementDate),
  };
}
