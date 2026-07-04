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
  profitTaxPayable: number;
  beginningCapital: number;
  reservedCapital: number;
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

export const MAX_PROJECTION_YEARS = 5;

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
    data.profitTaxPayable;

  const totalCapital = data.beginningCapital + netIncome + data.reservedCapital;

  // Bank WC loan is a balancing output: liability needed so assets = liabilities + equity.
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
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  return `${year + years}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Roll one year forward using prior period results as the next opening balances. */
export function rollForwardOneYear(data: FinancialData): FinancialData {
  const { netIncome, totalCapital } = calculateFinancials(data);
  const grossFixedAssets = data.building + data.propertyAndEquipment + data.vehicle;
  const annualDepreciation = grossFixedAssets > 0 ? grossFixedAssets * 0.1 : 0;

  return {
    ...data,
    statementDate: shiftStatementDate(data.statementDate, 1),
    beginningInventory: data.endingInventory,
    beginningCapital: totalCapital,
    reservedCapital: 0,
    cashOnBank: data.cashOnBank + netIncome,
    profitTaxPayable: data.profitTax,
    accumulatedDepreciation: Math.min(
      data.accumulatedDepreciation + annualDepreciation,
      grossFixedAssets
    ),
  };
}

export function projectFinancialData(base: FinancialData, yearsAhead: number): FinancialData {
  if (yearsAhead <= 0) return base;

  let current = base;
  for (let i = 0; i < yearsAhead; i++) {
    current = rollForwardOneYear(current);
  }
  return current;
}

export function getProjectionLabel(yearsAhead: number): string {
  if (yearsAhead === 0) return 'Current period';
  if (yearsAhead === 1) return '1 year ahead';
  return `${yearsAhead} years ahead`;
}
