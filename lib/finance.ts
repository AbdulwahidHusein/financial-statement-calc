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

/** Opening snapshot for the current period, or the prior projected period. */
export function getPriorPeriodForCashFlow(base: FinancialData, projectionYears: number): FinancialData {
  if (projectionYears > 0) {
    return projectFinancialData(base, projectionYears - 1);
  }

  return {
    ...base,
    endingInventory: base.beginningInventory,
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
  const ownerCapitalChange = current.beginningCapital - prior.beginningCapital;

  const netCashFromFinancing =
    bankLoanChange + outstandingFinancingChange + reservedCapitalChange + ownerCapitalChange;

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
    additionalCapital: 0,
    cashOnBank: data.cashOnBank + netIncome,
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
