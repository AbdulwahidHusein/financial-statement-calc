export type FinancialData = {
  companyName: string;
  statementDate: string;
  sales: number;
  beginningInventory: number;
  purchases: number;
  endingInventory: number;
  salaryAndBenefit: number;
  transportationCost: number;
  loadingAndUnloading: number;
  repairAndMaintenance: number;
  stationaryAndPrinting: number;
  miscellaneousExpense: number;
  profitTax: number;
  cashOnBank: number;
  otherReceivables: number;
  building: number;
  propertyAndEquipment: number;
  vehicle: number;
  accumulatedDepreciation: number;
  employeeBenefitPayable: number;
  creditPurchasePayable: number;
  outstandingFinancing: number;
  beginningCapital: number;
  reservedCapital: number;
  additionalCapital: number;
};

export function getDefaultStatementDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const emptyFinancialData: FinancialData = {
  companyName: '',
  statementDate: '',
  sales: 0,
  beginningInventory: 0,
  purchases: 0,
  endingInventory: 0,
  salaryAndBenefit: 0,
  transportationCost: 0,
  loadingAndUnloading: 0,
  repairAndMaintenance: 0,
  stationaryAndPrinting: 0,
  miscellaneousExpense: 0,
  profitTax: 0,
  cashOnBank: 0,
  otherReceivables: 0,
  building: 0,
  propertyAndEquipment: 0,
  vehicle: 0,
  accumulatedDepreciation: 0,
  employeeBenefitPayable: 0,
  creditPurchasePayable: 0,
  outstandingFinancing: 0,
  beginningCapital: 0,
  reservedCapital: 0,
  additionalCapital: 0,
};

export type FinancialCalculations = {
  goodsAvailableForSales: number;
  cogs: number;
  grossProfit: number;
  totalExpenses: number;
  incomeBeforeTax: number;
  netIncome: number;
  inventory: number;
  totalCurrentAssets: number;
  netFixedAssets: number;
  totalAssets: number;
  operatingCurrentLiabilities: number;
  totalCurrentLiabilities: number;
  totalLiability: number;
  totalCapital: number;
  totalLiabilityAndEquity: number;
  netWorkingCapital: number;
  grossWorkingCapital: number;
  bankWorkingCapitalFinancing: number;
  businessFundedWorkingCapital: number;
  currentRatio: number | null;
  debtToEquity: number;
  grossProfitMargin: number;
  netProfitMargin: number;
  returnOnAssets: number;
  returnOnEquity: number;
};

export type CashFlowStatement = {
  netIncome: number;
  depreciation: number;
  inventoryChange: number;
  receivablesChange: number;
  payablesChange: number;
  netCashFromOperating: number;
  fixedAssetPurchases: number;
  netCashFromInvesting: number;
  bankLoanChange: number;
  outstandingFinancingChange: number;
  reservedCapitalChange: number;
  additionalCapitalChange: number;
  ownerCapitalChange: number;
  netCashFromFinancing: number;
  netChangeInCash: number;
  beginningCash: number;
  endingCash: number;
  reconciles: boolean;
  usesAssumedOpeningBalances: boolean;
};

function grossFixedAssets(data: FinancialData) {
  return data.building + data.propertyAndEquipment + data.vehicle;
}

function operatingPayables(data: FinancialData) {
  return data.employeeBenefitPayable + data.creditPurchasePayable + data.profitTax;
}

/** Opening snapshot for cash flow at the current period (prior period resolved from snapshots). */
export function getOpeningBalanceForCashFlow(currentPeriod: FinancialData): FinancialData {
  return {
    ...currentPeriod,
    endingInventory: currentPeriod.beginningInventory,
    cashOnBank: 0,
    otherReceivables: 0,
    employeeBenefitPayable: 0,
    creditPurchasePayable: 0,
    outstandingFinancing: 0,
    profitTax: 0,
    accumulatedDepreciation: 0,
    reservedCapital: 0,
    additionalCapital: 0,
  };
}

export function calculateCashFlow(current: FinancialData, prior: FinancialData, usesAssumedOpeningBalances: boolean): CashFlowStatement {
  const calc = calculateFinancials(current);
  const priorCalc = calculateFinancials(prior);

  const currentGrossFA = grossFixedAssets(current);
  const priorGrossFA = grossFixedAssets(prior);

  const depreciationFromAccChange = current.accumulatedDepreciation - prior.accumulatedDepreciation;
  const depreciation =
    depreciationFromAccChange > 0.005
      ? depreciationFromAccChange
      : currentGrossFA > 0
        ? Math.min(currentGrossFA * 0.1, current.accumulatedDepreciation)
        : 0;

  const inventoryChange = prior.endingInventory - current.endingInventory;
  const receivablesChange = prior.otherReceivables - current.otherReceivables;
  const payablesChange = operatingPayables(current) - operatingPayables(prior);

  const netCashFromOperating =
    calc.netIncome + depreciation + inventoryChange + receivablesChange + payablesChange;

  const fixedAssetPurchases = priorGrossFA - currentGrossFA;
  const netCashFromInvesting = fixedAssetPurchases;

  const bankLoanChange = calc.bankWorkingCapitalFinancing - priorCalc.bankWorkingCapitalFinancing;
  const outstandingFinancingChange = current.outstandingFinancing - prior.outstandingFinancing;
  const reservedCapitalChange = current.reservedCapital - prior.reservedCapital;
  const additionalCapitalChange = current.additionalCapital - prior.additionalCapital;
  const ownerCapitalChange = current.beginningCapital - prior.beginningCapital;

  const netCashFromFinancing =
    bankLoanChange +
    outstandingFinancingChange +
    reservedCapitalChange +
    additionalCapitalChange +
    ownerCapitalChange;

  const netChangeInCash = netCashFromOperating + netCashFromInvesting + netCashFromFinancing;
  const beginningCash = prior.cashOnBank;
  const endingCash = current.cashOnBank;

  return {
    netIncome: calc.netIncome,
    depreciation,
    inventoryChange,
    receivablesChange,
    payablesChange,
    netCashFromOperating,
    fixedAssetPurchases,
    netCashFromInvesting,
    bankLoanChange,
    outstandingFinancingChange,
    reservedCapitalChange,
    additionalCapitalChange,
    ownerCapitalChange,
    netCashFromFinancing,
    netChangeInCash,
    beginningCash,
    endingCash,
    reconciles: Math.abs(beginningCash + netChangeInCash - endingCash) < 0.005,
    usesAssumedOpeningBalances,
  };
}

export const MAX_PROJECTION_YEARS = 5;
export const MAX_PROJECTION_MONTHS = 12;

export type ProjectionPeriod = {
  years: number;
  months: number;
};

export function normalizeProjectionPeriod(years: number, months: number): ProjectionPeriod {
  const safeYears = Math.min(Math.max(Math.trunc(years), 0), MAX_PROJECTION_YEARS);
  const safeMonths = Math.min(Math.max(Math.trunc(months), 0), MAX_PROJECTION_MONTHS);
  const total = Math.min(safeYears * 12 + safeMonths, MAX_PROJECTION_YEARS * 12 + MAX_PROJECTION_MONTHS);
  return {
    years: Math.floor(total / 12),
    months: total % 12,
  };
}

export function getTotalProjectionMonths(years: number, months: number): number {
  const { years: y, months: m } = normalizeProjectionPeriod(years, months);
  return y * 12 + m;
}

export function isProjectedPeriod(years: number, months: number): boolean {
  return getTotalProjectionMonths(years, months) > 0;
}

export function formatDateParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function shiftStatementDateByMonths(dateStr: string, months: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;

  const date = new Date(year, month - 1, day);
  date.setMonth(date.getMonth() + months);

  return formatDateParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function getProjectedStatementDate(dateStr: string, years: number, months: number): string {
  return shiftStatementDateByMonths(dateStr, getTotalProjectionMonths(years, months));
}

export function calculateFinancials(data: FinancialData): FinancialCalculations {
  const goodsAvailableForSales = data.beginningInventory + data.purchases;
  const cogs = goodsAvailableForSales - data.endingInventory;
  const grossProfit = data.sales - cogs;

  const totalExpenses =
    data.salaryAndBenefit +
    data.transportationCost +
    data.loadingAndUnloading +
    data.repairAndMaintenance +
    data.stationaryAndPrinting +
    data.miscellaneousExpense;

  const incomeBeforeTax = grossProfit - totalExpenses;
  const netIncome = incomeBeforeTax - data.profitTax;

  const inventory = data.endingInventory;
  const totalCurrentAssets = data.cashOnBank + inventory + data.otherReceivables;
  const netFixedAssets = data.building + data.propertyAndEquipment + data.vehicle - data.accumulatedDepreciation;
  const totalAssets = totalCurrentAssets + netFixedAssets;

  const operatingCurrentLiabilities =
    data.employeeBenefitPayable +
    data.creditPurchasePayable +
    data.outstandingFinancing +
    data.profitTax;

  const totalCapital = data.beginningCapital + netIncome + data.reservedCapital + data.additionalCapital;

  // Working capital required from the bank when assets + equity do not cover operating liabilities.
  const bankWorkingCapitalFinancing = Math.max(
    0,
    totalAssets - operatingCurrentLiabilities - totalCapital
  );

  const totalCurrentLiabilities = operatingCurrentLiabilities + bankWorkingCapitalFinancing;
  const totalLiability = totalCurrentLiabilities;
  const totalLiabilityAndEquity = totalLiability + totalCapital;

  const grossWorkingCapital = totalCurrentAssets - operatingCurrentLiabilities;
  const netWorkingCapital = totalCurrentAssets - totalCurrentLiabilities;
  const businessFundedWorkingCapital = Math.max(0, grossWorkingCapital - bankWorkingCapitalFinancing);
  const currentRatio = totalCurrentLiabilities > 0 ? totalCurrentAssets / totalCurrentLiabilities : null;
  const debtToEquity = totalCapital > 0 ? totalLiability / totalCapital : 0;
  const grossProfitMargin = data.sales > 0 ? (grossProfit / data.sales) * 100 : 0;
  const netProfitMargin = data.sales > 0 ? (netIncome / data.sales) * 100 : 0;
  const returnOnAssets = totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0;
  const returnOnEquity = totalCapital > 0 ? (netIncome / totalCapital) * 100 : 0;

  return {
    goodsAvailableForSales,
    cogs,
    grossProfit,
    totalExpenses,
    incomeBeforeTax,
    netIncome,
    inventory,
    totalCurrentAssets,
    netFixedAssets,
    totalAssets,
    operatingCurrentLiabilities,
    totalCurrentLiabilities,
    totalLiability,
    totalCapital,
    totalLiabilityAndEquity,
    netWorkingCapital,
    grossWorkingCapital,
    bankWorkingCapitalFinancing,
    businessFundedWorkingCapital,
    currentRatio,
    debtToEquity,
    grossProfitMargin,
    netProfitMargin,
    returnOnAssets,
    returnOnEquity,
  };
}

export function shiftStatementDate(dateStr: string, years: number): string {
  return shiftStatementDateByMonths(dateStr, years * 12);
}

export function getProjectionLabel(yearsAhead: number, monthsAhead = 0): string {
  const { years, months } = normalizeProjectionPeriod(yearsAhead, monthsAhead);
  if (years === 0 && months === 0) return 'Current period';

  const parts: string[] = [];
  if (years > 0) parts.push(years === 1 ? '1 year' : `${years} years`);
  if (months > 0) parts.push(months === 1 ? '1 month' : `${months} months`);
  return `${parts.join(' ')} ahead`;
}
