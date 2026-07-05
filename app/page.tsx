'use client';

import React, { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, DollarSign, FileText, Printer, Briefcase, Activity, PieChart, TrendingUp, LineChart, Menu, X, Download, AlertTriangle, Loader2, CalendarRange, ArrowRightLeft } from 'lucide-react';
import { exportElementToPdf, getExportDateParts } from '@/lib/export-pdf';
import {
  type FinancialCalculations,
  type FinancialData,
  MAX_PROJECTION_YEARS,
  calculateFinancials,
  calculateCashFlow,
  emptyFinancialData,
  getPriorPeriodForCashFlow,
  getProjectionLabel,
  projectFinancialData,
  shiftStatementDate,
} from '@/lib/finance';
import { loadPersistedState, savePersistedState } from '@/lib/storage';

const formatCurrency = (amount: number) => {
  if (!Number.isFinite(amount)) return '-';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatBirr = (amount: number) => `${formatCurrency(amount)} Birr`;

const formatStatementDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return 'DATE';
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  });
};

const getStatementYear = (dateStr: string) => {
  const [year] = dateStr.split('-').map(Number);
  return year || 'Year';
};

export default function FinancialApp() {
  const [data, setData] = useState<FinancialData>(emptyFinancialData);
  const [activeTab, setActiveTab] = useState<'income' | 'balance' | 'cashflow' | 'ratios'>('income');
  const [projectionYears, setProjectionYears] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const incomeReportRef = useRef<HTMLDivElement>(null);
  const balanceReportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = loadPersistedState();
    startTransition(() => {
      if (saved) {
        setData(saved.data);
        setProjectionYears(saved.projectionYears);
      }
      setIsStorageReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isStorageReady) return;
    savePersistedState(data, projectionYears);
  }, [data, projectionYears, isStorageReady]);

  const displayData = useMemo(
    () => projectFinancialData(data, projectionYears),
    [data, projectionYears]
  );
  const calc = useMemo(() => calculateFinancials(displayData), [displayData]);
  const previousCalc = useMemo(() => {
    if (projectionYears <= 0) return null;
    return calculateFinancials(projectFinancialData(data, projectionYears - 1));
  }, [data, projectionYears]);
  const previousPeriodLabel =
    data.statementDate && projectionYears > 0
      ? formatStatementDate(shiftStatementDate(data.statementDate, projectionYears - 1))
      : null;
  const priorPeriodData = useMemo(
    () => getPriorPeriodForCashFlow(data, projectionYears),
    [data, projectionYears]
  );
  const cashFlow = useMemo(
    () => calculateCashFlow(displayData, priorPeriodData, projectionYears === 0),
    [displayData, priorPeriodData, projectionYears]
  );
  const displayDateLabel = displayData.statementDate
    ? formatStatementDate(displayData.statementDate)
    : 'DATE';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (name === 'statementDate' && !value) {
      setProjectionYears(0);
    }
  };

  const handleNumberChange = (name: keyof FinancialData, value: number) => {
    setData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const warnings: string[] = [];
  if (calc.cogs < 0) {
    warnings.push('Cost of goods sold is negative — ending inventory exceeds goods available for sale.');
  }
  if (calc.netFixedAssets < 0) {
    warnings.push('Net fixed assets is negative — accumulated depreciation exceeds fixed asset values.');
  }
  const balanceSheetDifference = calc.totalAssets - calc.totalLiabilityAndEquity;
  if (Math.abs(balanceSheetDifference) > 0.005) {
    warnings.push(
      `Balance sheet is out of balance by ${formatBirr(Math.abs(balanceSheetDifference))}. Total assets (${formatBirr(calc.totalAssets)}) does not equal total liabilities and equity (${formatBirr(calc.totalLiabilityAndEquity)}).`
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    if (!incomeReportRef.current || !balanceReportRef.current || isExporting) return;

    setIsExporting(true);
    setIsExportingPdf(true);

    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

      const { fileDate } = getExportDateParts();
      await exportElementToPdf({
        pages: [incomeReportRef.current, balanceReportRef.current],
        companyName: data.companyName,
        currentDateLabel: displayDateLabel,
        fileDate,
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      window.alert('Could not export PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
      setIsExporting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden print:h-auto print:overflow-visible print:bg-white">
      <header className="flex-none bg-white border-b border-slate-200 px-3 md:px-6 py-2.5 md:py-3 flex items-center justify-between sticky top-0 z-40 print:hidden">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="xl:hidden p-1.5 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
            aria-label={isSidebarOpen ? 'Close data entry panel' : 'Open data entry panel'}
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="hidden sm:block bg-indigo-600 p-1.5 rounded-lg text-white flex-shrink-0">
            <Briefcase size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-semibold tracking-tight truncate">Financial Statement Generator</h1>
            <p className="hidden md:block text-xs text-slate-500 font-medium">Create professional P&L and Balance Sheets</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed text-indigo-700 px-2.5 md:px-3 py-1.5 rounded-md font-medium transition-colors text-xs md:text-sm border border-indigo-200"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span className="hidden sm:inline">{isExporting ? 'Exporting…' : 'Export PDF'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 md:px-3 py-1.5 rounded-md font-medium transition-colors text-xs md:text-sm border border-slate-200"
          >
            <Printer size={16} />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 w-full max-w-[1920px] mx-auto p-2 md:p-4 xl:p-6 flex flex-col xl:flex-row gap-3 xl:gap-6 print:p-0 print:block print:h-auto print:overflow-visible overflow-y-auto xl:overflow-hidden relative">
        {isSidebarOpen && (
          <button
            type="button"
            aria-label="Close data entry panel"
            className="xl:hidden fixed inset-0 bg-black/30 z-20"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Left Column: Data Entry */}
        <div
          className={`fixed xl:relative inset-y-0 left-0 z-30 xl:z-auto w-full max-w-[450px] xl:w-[450px] flex-none flex-col space-y-4 xl:space-y-6 print:hidden xl:h-full xl:overflow-y-auto xl:pr-2 xl:pb-6 custom-scrollbar bg-slate-50 xl:bg-transparent p-4 md:p-0 pt-16 xl:pt-0 overflow-y-auto transition-transform duration-200 ease-in-out ${
            isSidebarOpen ? 'translate-x-0 flex' : '-translate-x-full xl:translate-x-0 hidden xl:flex'
          }`}
        >
          <div className="xl:hidden sticky top-0 z-10 -mx-4 px-4 py-2 mb-1 flex items-center justify-between border-b border-slate-200 bg-slate-50">
            <span className="text-sm font-semibold text-slate-800">Enter Data</span>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 -mr-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              aria-label="Close data entry panel"
            >
              <X size={20} />
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-shrink-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <FileText size={18} className="text-indigo-600" />
                General Information
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Company Name</label>
                <input
                  type="text"
                  name="companyName"
                  value={data.companyName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Statement Date</label>
                <input
                  type="date"
                  name="statementDate"
                  value={data.statementDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm font-medium"
                />
              </div>
              <StatementPeriodSelector
                statementDate={data.statementDate}
                projectionYears={projectionYears}
                onChange={setProjectionYears}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-shrink-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-600" />
                Income Statement Data
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <InputField label="Sales (Revenue)" name="sales" value={data.sales} onChange={handleNumberChange} />

              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Cost of Goods Sold</h3>
                <div className="space-y-3">
                  <InputField label="Beginning Inventory" name="beginningInventory" value={data.beginningInventory} onChange={handleNumberChange} />
                  <InputField label="Purchases" name="purchases" value={data.purchases} onChange={handleNumberChange} />
                  <InputField label="Ending Inventory" name="endingInventory" value={data.endingInventory} onChange={handleNumberChange} />
                </div>
                <p className="text-xs text-slate-400 mt-2">Ending inventory is also used on the balance sheet.</p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Operating Expenses</h3>
                <div className="space-y-3">
                  <InputField label="Salary and Benefit" name="salaryAndBenefit" value={data.salaryAndBenefit} onChange={handleNumberChange} />
                  <InputField label="Transportation Cost" name="transportationCost" value={data.transportationCost} onChange={handleNumberChange} />
                  <InputField label="Loading and Unloading" name="loadingAndUnloading" value={data.loadingAndUnloading} onChange={handleNumberChange} />
                  <InputField label="Repair and Maintenance" name="repairAndMaintenance" value={data.repairAndMaintenance} onChange={handleNumberChange} />
                  <InputField label="Stationary and Printing" name="stationaryAndPrinting" value={data.stationaryAndPrinting} onChange={handleNumberChange} />
                  <InputField label="Miscellanies & Other" name="miscellaneousExpense" value={data.miscellaneousExpense} onChange={handleNumberChange} />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <InputField label="Profit Tax" name="profitTax" value={data.profitTax} onChange={handleNumberChange} />
                <p className="text-xs text-slate-400 mt-2">Also used as profit tax payable on the balance sheet.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-shrink-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Calculator size={18} className="text-blue-600" />
                Balance Sheet Data
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="pt-1">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Current Assets</h3>
                <div className="space-y-3">
                  <InputField label="Cash on Hand / Bank" name="cashOnBank" value={data.cashOnBank} onChange={handleNumberChange} />
                  <InputField label="Other Receivables" name="otherReceivables" value={data.otherReceivables} onChange={handleNumberChange} />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Fixed Assets</h3>
                <div className="space-y-3">
                  <InputField label="Building" name="building" value={data.building} onChange={handleNumberChange} />
                  <InputField label="Property and Equipment" name="propertyAndEquipment" value={data.propertyAndEquipment} onChange={handleNumberChange} />
                  <InputField label="Vehicle" name="vehicle" value={data.vehicle} onChange={handleNumberChange} />
                  <InputField label="Less Acc. Depreciation" name="accumulatedDepreciation" value={data.accumulatedDepreciation} onChange={handleNumberChange} />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Liabilities</h3>
                <div className="space-y-3">
                  <InputField label="Employee Benefit / Salary" name="employeeBenefitPayable" value={data.employeeBenefitPayable} onChange={handleNumberChange} />
                  <InputField label="Credit Purchase Payable" name="creditPurchasePayable" value={data.creditPurchasePayable} onChange={handleNumberChange} />
                  <InputField label="Outstanding Financing" name="outstandingFinancing" value={data.outstandingFinancing} onChange={handleNumberChange} />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Equity</h3>
                <div className="space-y-3">
                  <InputField label="Beginning Capital" name="beginningCapital" value={data.beginningCapital} onChange={handleNumberChange} />
                  <InputField label="Reserved Capital" name="reservedCapital" value={data.reservedCapital} onChange={handleNumberChange} />
                </div>
                <p className="text-xs text-slate-400 mt-2">Bank working capital loan is calculated on the balance sheet.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Generated Reports */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 print:block xl:h-full print:h-auto print:overflow-visible">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0 print:border-none print:shadow-none print:h-auto print:overflow-visible print:block">
            <ReportToolbar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              statementDate={data.statementDate}
              projectionYears={projectionYears}
              displayDateLabel={displayDateLabel}
              onProjectionChange={setProjectionYears}
            />

            {(projectionYears > 0 || warnings.length > 0) && (
              <CompactAlertStrip
                projectionYears={projectionYears}
                displayDateLabel={displayDateLabel}
                warnings={warnings}
              />
            )}

            {/* Document Content */}
            <div
              id="report-container"
              className={`p-2 sm:p-3 md:p-4 bg-white document-container print:overflow-visible print:p-0 ${
                isExportingPdf ? 'overflow-visible h-auto' : 'flex-1 min-h-0 overflow-auto'
              }`}
            >
              <div
                ref={incomeReportRef}
                className={`${activeTab === 'income' || isExportingPdf ? 'block print:block' : 'hidden print:block'} ${
                  isExportingPdf ? 'pdf-export-page' : ''
                }`}
              >
                <div className={`max-w-4xl mx-auto ${isExportingPdf ? 'mb-0' : 'mb-16 print:mb-24'}`}>
                  <ReportStatementHeader
                    companyName={displayData.companyName}
                    title="Profit And Loss Statement"
                    displayDateLabel={displayDateLabel}
                    projectionYears={projectionYears}
                    forExport={isExportingPdf}
                  />

                  <div className="w-full border border-slate-800 border-collapse">
                    <div className="grid grid-cols-12 border-b border-slate-800 bg-slate-50">
                      <div className="col-span-8 p-2 font-bold text-sm border-r border-slate-800">Revenue</div>
                      <div className="col-span-4 p-2 font-bold text-sm text-right">Amounts in (Birr)</div>
                    </div>

                    <ReportRow label="SALES" value={displayData.sales} />
                    <ReportRow label="Total Revenue" value={displayData.sales} isBold isSubtotal />

                    <ReportRow label="Beginning Inventory" value={displayData.beginningInventory} />
                    <ReportRow label="PURCHASE" value={displayData.purchases} />
                    <ReportRow label="Goods available for sales" value={calc.goodsAvailableForSales} />
                    <ReportRow label="Less: Ending Inventory" value={displayData.endingInventory} isDeduction />

                    <ReportRow label="Cost of goods sold" value={calc.cogs} isBold isSubtotal />
                    <ReportRow label="Gross Profit" value={calc.grossProfit} isBold isTotal />

                    <div className="grid grid-cols-12 border-b border-slate-800">
                      <div className="col-span-12 p-2 font-bold text-sm">General & Administration Expense</div>
                    </div>

                    <ReportRow label="Salary and benefit" value={displayData.salaryAndBenefit} indent />
                    <ReportRow label="TRANSPORTATION COST" value={displayData.transportationCost} indent />
                    <ReportRow label="LOADING AND UNLOADING" value={displayData.loadingAndUnloading} indent />
                    <ReportRow label="repair and maintenance expense" value={displayData.repairAndMaintenance} indent />
                    <ReportRow label="Stationary and printing" value={displayData.stationaryAndPrinting} indent />
                    <ReportRow label="Miscellanies & other expense" value={displayData.miscellaneousExpense} indent />

                    <ReportRow label="Total expense" value={calc.totalExpenses} isBold isSubtotal />

                    <ReportRow label="Income before profit tax" value={calc.incomeBeforeTax} />
                    <ReportRow label="Profit tax" value={displayData.profitTax} />

                    <ReportRow label="Net income/Loss" value={calc.netIncome} isBold isTotal />
                  </div>
                </div>
              </div>

              <div
                ref={balanceReportRef}
                className={`print:break-before-page ${activeTab === 'balance' || isExportingPdf ? 'block print:block' : 'hidden print:block'} ${
                  isExportingPdf ? 'pdf-export-page' : ''
                }`}
              >
                <div className={`max-w-4xl mx-auto ${isExportingPdf ? 'mb-0' : 'mb-16 print:mb-24'}`}>
                  <ReportStatementHeader
                    companyName={displayData.companyName}
                    title="Balance Sheet"
                    displayDateLabel={displayDateLabel}
                    projectionYears={projectionYears}
                    forExport={isExportingPdf}
                  />

                  <div className="w-full border border-slate-800 border-collapse">
                    <div className="grid grid-cols-12 border-b border-slate-800 bg-slate-50">
                      <div className="col-span-8 p-2 font-bold text-sm border-r border-slate-800">Description</div>
                      <div className="col-span-4 p-2 font-bold text-sm text-right">
                        {displayData.statementDate ? getStatementYear(displayData.statementDate) : 'Year'}
                      </div>
                    </div>

                    <div className="grid grid-cols-12 border-b border-slate-800">
                      <div className="col-span-12 p-2 font-bold text-sm">ASSET</div>
                    </div>
                    <div className="grid grid-cols-12 border-b border-slate-800">
                      <div className="col-span-12 p-2 font-bold text-sm">CURRENT ASSET</div>
                    </div>

                    <ReportRow label="CASH ON HAND /BANK" value={displayData.cashOnBank} />
                    <ReportRow label="INVENTORY" value={calc.inventory} />
                    <ReportRow label="OTHER RECIEVABLES" value={displayData.otherReceivables} />

                    <ReportRow label="TOTAL CURRENT ASSET" value={calc.totalCurrentAssets} isBold isSubtotal />

                    <div className="grid grid-cols-12 border-b border-slate-800">
                      <div className="col-span-12 p-2 font-bold text-sm">FIXED ASSET</div>
                    </div>

                    <ReportRow label="BUILDING" value={displayData.building} />
                    <ReportRow label="PROPERTY AND EQUIPMENT" value={displayData.propertyAndEquipment} />
                    <ReportRow label="VEHICLE" value={displayData.vehicle} />
                    <ReportRow label="LESS ACC. DEP BULG. PROP & VEH" value={displayData.accumulatedDepreciation} isDeduction />

                    <ReportRow label="NET FIXED ASSET" value={calc.netFixedAssets} isBold isSubtotal />

                    <ReportRow label="TOTAL ASSET" value={calc.totalAssets} isBold isTotal />

                    <div className="grid grid-cols-12 border-b border-slate-800">
                      <div className="col-span-12 p-2 font-bold text-sm">LIABILITY</div>
                    </div>

                    <ReportRow label="EMPLOYEE BENEFIT/SALARY" value={displayData.employeeBenefitPayable} />
                    <ReportRow label="CREDIT PURCHASE PAYABLE" value={displayData.creditPurchasePayable} />
                    <ReportRow label="OUTSTANDING FINANCING" value={displayData.outstandingFinancing} />
                    <ReportRow label="PROFIT TAX PAYABLE" value={displayData.profitTax} />
                    <ReportRow label="BANK WORKING CAPITAL LOAN" value={calc.bankWorkingCapitalFinancing} />

                    <ReportRow label="TOTAL LIABILITY" value={calc.totalLiability} isBold isSubtotal />

                    <div className="grid grid-cols-12 border-b border-slate-800">
                      <div className="col-span-12 p-2 font-bold text-sm">EQUITY</div>
                    </div>

                    <ReportRow label="BEG. CAPITAL" value={displayData.beginningCapital} />
                    <ReportRow label="NET PROFIT" value={calc.netIncome} />
                    <ReportRow label="RESERVED CAPITAL" value={displayData.reservedCapital} />

                    <ReportRow label="TOTAL CAPITAL" value={calc.totalCapital} isBold isSubtotal />

                    <ReportRow label="TOTAL LIABILITY AND EQUITY" value={calc.totalLiabilityAndEquity} isBold isTotal />
                  </div>
                </div>
              </div>

              <div className={`print:break-before-page ${activeTab === 'cashflow' ? 'block print:block' : 'hidden print:hidden'}`}>
                <div className="max-w-4xl mx-auto mb-4 md:mb-6 print:mb-24">
                  <ReportStatementHeader
                    companyName={displayData.companyName}
                    title="Statement of Cash Flows"
                    displayDateLabel={displayDateLabel}
                    projectionYears={projectionYears}
                    forExport={false}
                  />

                  {cashFlow.usesAssumedOpeningBalances ? (
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed print:text-slate-600">
                      Opening balances assumed at zero for cash, receivables, and payables. Inventory opening comes from
                      P&amp;L beginning inventory. For projected periods, all changes link to the prior balance sheet.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed print:text-slate-600">
                      Linked to P&amp;L and balance sheet vs prior period
                      {previousPeriodLabel ? ` (${previousPeriodLabel})` : ''}.
                    </p>
                  )}

                  <div className="w-full border border-slate-800 border-collapse">
                    <div className="grid grid-cols-12 border-b border-slate-800 bg-slate-50">
                      <div className="col-span-8 p-2 font-bold text-sm border-r border-slate-800">Description</div>
                      <div className="col-span-4 p-2 font-bold text-sm text-right">Amounts in (Birr)</div>
                    </div>

                    <div className="grid grid-cols-12 border-b border-slate-800 bg-slate-100">
                      <div className="col-span-12 p-2 font-bold text-sm">Cash flows</div>
                    </div>

                    <ReportRow label="Net income" value={cashFlow.netIncome} />
                    <ReportRow label="Add: Depreciation (non-cash)" value={cashFlow.depreciation} indent />
                    <ReportRow label="Change in inventory" value={cashFlow.inventoryChange} indent />
                    <ReportRow label="Change in other receivables" value={cashFlow.receivablesChange} indent />
                    <ReportRow label="Change in operating payables" value={cashFlow.payablesChange} indent />
                    <ReportRow
                      label="Net cash from operating activities"
                      value={cashFlow.netCashFromOperating}
                      isBold
                      isSubtotal
                    />

                    <div className="grid grid-cols-12 border-b border-slate-800 bg-slate-100">
                      <div className="col-span-12 p-2 font-bold text-sm">Cash flows from investing activities</div>
                    </div>

                    <ReportRow label="Purchase / sale of fixed assets" value={cashFlow.fixedAssetPurchases} indent />
                    <ReportRow
                      label="Net cash from investing activities"
                      value={cashFlow.netCashFromInvesting}
                      isBold
                      isSubtotal
                    />

                    <div className="grid grid-cols-12 border-b border-slate-800 bg-slate-100">
                      <div className="col-span-12 p-2 font-bold text-sm">Cash flows from financing activities</div>
                    </div>

                    <ReportRow label="Change in bank working capital loan" value={cashFlow.bankLoanChange} indent />
                    <ReportRow label="Change in outstanding financing" value={cashFlow.outstandingFinancingChange} indent />
                    <ReportRow label="Reserved capital contributed" value={cashFlow.reservedCapitalChange} indent />
                    <ReportRow label="Change in beginning capital" value={cashFlow.ownerCapitalChange} indent />
                    <ReportRow
                      label="Net cash from financing activities"
                      value={cashFlow.netCashFromFinancing}
                      isBold
                      isSubtotal
                    />

                    <div className="grid grid-cols-12 border-b border-slate-800 bg-slate-100">
                      <div className="col-span-12 p-2 font-bold text-sm">Net change in cash</div>
                    </div>

                    <ReportRow label="Net increase (decrease) in cash" value={cashFlow.netChangeInCash} isBold isSubtotal />
                    <ReportRow label="Cash at beginning of period" value={cashFlow.beginningCash} />
                    <ReportRow label="Cash at end of period" value={cashFlow.endingCash} isBold isTotal />

                    <div
                      className={`grid grid-cols-12 border-t border-slate-800 px-2 py-2 text-xs font-medium ${
                        cashFlow.reconciles ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
                      }`}
                    >
                      <div className="col-span-12">
                        {cashFlow.reconciles
                          ? '✓ Cash flow reconciles: beginning cash + net change = ending cash on balance sheet.'
                          : `Note: Calculated ending cash (${formatBirr(cashFlow.beginningCash + cashFlow.netChangeInCash)}) differs from balance sheet cash (${formatBirr(cashFlow.endingCash)}) by ${formatBirr(Math.abs(cashFlow.beginningCash + cashFlow.netChangeInCash - cashFlow.endingCash))}. Check opening balances or balance sheet entries.`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`print:break-before-page ${activeTab === 'ratios' ? 'block print:block' : 'hidden print:block'}`}>
                <div className="max-w-4xl mx-auto mb-4 md:mb-6 print:mb-24">
                  <ReportStatementHeader
                    companyName={displayData.companyName}
                    title="Financial Ratios & Metrics"
                    displayDateLabel={displayDateLabel}
                    projectionYears={projectionYears}
                    forExport={false}
                  />

                  {previousCalc && previousPeriodLabel && (
                    <RatioYearComparison
                      calc={calc}
                      previousCalc={previousCalc}
                      previousPeriodLabel={previousPeriodLabel}
                    />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
                    <div className="col-span-1 md:col-span-2">
                      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-6 print:border-slate-300 print:shadow-none">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-slate-50 rounded-lg print:bg-transparent print:p-0">
                              <Briefcase className="text-blue-500" size={24} />
                            </div>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full print:px-0 ${calc.netWorkingCapital > 0 ? 'bg-emerald-100 text-emerald-700 print:bg-transparent print:text-emerald-800' : 'bg-rose-100 text-rose-700 print:bg-transparent print:text-rose-800'}`}>
                              {calc.netWorkingCapital > 0 ? 'Healthy' : 'Needs Attention'}
                            </span>
                          </div>
                          <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider mb-1 print:text-slate-600">Net Working Capital</h3>
                          <div className="text-3xl font-bold text-slate-900 mb-2 print:text-2xl">{formatBirr(calc.netWorkingCapital)}</div>
                          <p className="text-slate-500 text-sm leading-relaxed print:text-slate-600">Current assets minus all current liabilities, including bank working capital loan</p>
                          <p className="text-xs text-slate-400 mt-2 print:text-slate-500">Healthy: positive working capital</p>
                        </div>
                        <div className="w-px bg-slate-200 hidden md:block print:block"></div>
                        <div className="h-px bg-slate-200 block md:hidden print:hidden"></div>
                        <div className="flex-1 flex flex-col justify-center space-y-4">
                          <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Financed by Bank</div>
                            <div className="text-xl font-bold text-slate-800">{formatBirr(calc.bankWorkingCapitalFinancing)}</div>
                            <p className="text-xs text-slate-400 mt-1">Calculated from balance sheet</p>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Financed by Business</div>
                            <div className="text-xl font-bold text-slate-800">{formatBirr(calc.businessFundedWorkingCapital)}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <RatioCard
                      title="Current Ratio"
                      value={calc.currentRatio !== null ? `${calc.currentRatio.toFixed(2)}x` : 'N/A'}
                      healthyBenchmark="≥ 1.5x"
                      description={calc.currentRatio !== null ? 'Current assets divided by current liabilities' : 'Cannot calculate — no current liabilities entered'}
                      icon={<Activity className="text-indigo-500" size={24} />}
                      trend={calc.currentRatio !== null ? (calc.currentRatio >= 1.5 ? 'positive' : calc.currentRatio >= 1 ? 'neutral' : 'negative') : undefined}
                    />

                    <RatioCard
                      title="Debt to Equity Ratio"
                      value={`${calc.debtToEquity.toFixed(2)}x`}
                      healthyBenchmark="≤ 1.0x"
                      description="Total liabilities divided by total equity"
                      icon={<PieChart className="text-orange-500" size={24} />}
                      trend={calc.debtToEquity <= 1 ? 'positive' : calc.debtToEquity <= 2 ? 'neutral' : 'negative'}
                    />

                    <RatioCard
                      title="Gross Profit Margin"
                      value={`${calc.grossProfitMargin.toFixed(1)}%`}
                      healthyBenchmark="≥ 30%"
                      description="Gross profit as a percentage of sales"
                      icon={<LineChart className="text-emerald-500" size={24} />}
                      trend={calc.grossProfitMargin >= 30 ? 'positive' : calc.grossProfitMargin >= 15 ? 'neutral' : 'negative'}
                    />

                    <RatioCard
                      title="Net Profit Margin"
                      value={`${calc.netProfitMargin.toFixed(1)}%`}
                      healthyBenchmark="≥ 10%"
                      description="Net income as a percentage of sales"
                      icon={<TrendingUp className="text-emerald-500" size={24} />}
                      trend={calc.netProfitMargin >= 10 ? 'positive' : calc.netProfitMargin > 0 ? 'neutral' : 'negative'}
                    />

                    <RatioCard
                      title="Return on Assets (ROA)"
                      value={`${calc.returnOnAssets.toFixed(1)}%`}
                      healthyBenchmark="≥ 5%"
                      description="Net income relative to total assets"
                      icon={<TrendingUp className="text-purple-500" size={24} />}
                      trend={calc.returnOnAssets >= 5 ? 'positive' : calc.returnOnAssets >= 2 ? 'neutral' : 'negative'}
                    />

                    <RatioCard
                      title="Return on Equity (ROE)"
                      value={`${calc.returnOnEquity.toFixed(1)}%`}
                      healthyBenchmark="≥ 15%"
                      description="Net income relative to total equity"
                      icon={<TrendingUp className="text-pink-500" size={24} />}
                      trend={calc.returnOnEquity >= 15 ? 'positive' : calc.returnOnEquity >= 8 ? 'neutral' : 'negative'}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function formatRatioChange(diff: number, unit: 'x' | 'percent' | 'currency') {
  if (!Number.isFinite(diff) || Math.abs(diff) < 0.005) {
    return { text: 'No change', className: 'text-slate-500' };
  }

  const sign = diff > 0 ? '+' : '−';
  const absolute = Math.abs(diff);

  if (unit === 'x') {
    return {
      text: `${sign}${absolute.toFixed(2)}x`,
      className: diff > 0 ? 'text-emerald-700' : 'text-rose-700',
    };
  }
  if (unit === 'percent') {
    return {
      text: `${sign}${absolute.toFixed(1)}%`,
      className: diff > 0 ? 'text-emerald-700' : 'text-rose-700',
    };
  }
  return {
    text: `${sign}${formatCurrency(absolute)}`,
    className: diff > 0 ? 'text-emerald-700' : 'text-rose-700',
  };
}

function RatioYearComparison({
  calc,
  previousCalc,
  previousPeriodLabel,
}: {
  calc: FinancialCalculations;
  previousCalc: FinancialCalculations;
  previousPeriodLabel: string;
}) {
  const rows = [
    {
      label: 'Current Ratio',
      previous: previousCalc.currentRatio !== null ? `${previousCalc.currentRatio.toFixed(2)}x` : 'N/A',
      current: calc.currentRatio !== null ? `${calc.currentRatio.toFixed(2)}x` : 'N/A',
      diff: (calc.currentRatio ?? 0) - (previousCalc.currentRatio ?? 0),
      unit: 'x' as const,
    },
    {
      label: 'Debt to Equity',
      previous: `${previousCalc.debtToEquity.toFixed(2)}x`,
      current: `${calc.debtToEquity.toFixed(2)}x`,
      diff: calc.debtToEquity - previousCalc.debtToEquity,
      unit: 'x' as const,
    },
    {
      label: 'Gross Profit Margin',
      previous: `${previousCalc.grossProfitMargin.toFixed(1)}%`,
      current: `${calc.grossProfitMargin.toFixed(1)}%`,
      diff: calc.grossProfitMargin - previousCalc.grossProfitMargin,
      unit: 'percent' as const,
    },
    {
      label: 'Net Profit Margin',
      previous: `${previousCalc.netProfitMargin.toFixed(1)}%`,
      current: `${calc.netProfitMargin.toFixed(1)}%`,
      diff: calc.netProfitMargin - previousCalc.netProfitMargin,
      unit: 'percent' as const,
    },
    {
      label: 'Return on Assets',
      previous: `${previousCalc.returnOnAssets.toFixed(1)}%`,
      current: `${calc.returnOnAssets.toFixed(1)}%`,
      diff: calc.returnOnAssets - previousCalc.returnOnAssets,
      unit: 'percent' as const,
    },
    {
      label: 'Return on Equity',
      previous: `${previousCalc.returnOnEquity.toFixed(1)}%`,
      current: `${calc.returnOnEquity.toFixed(1)}%`,
      diff: calc.returnOnEquity - previousCalc.returnOnEquity,
      unit: 'percent' as const,
    },
    {
      label: 'Net Working Capital',
      previous: formatCurrency(previousCalc.netWorkingCapital),
      current: formatCurrency(calc.netWorkingCapital),
      diff: calc.netWorkingCapital - previousCalc.netWorkingCapital,
      unit: 'currency' as const,
    },
  ];

  return (
    <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/40 overflow-hidden print:border-slate-300 print:bg-white">
      <div className="px-4 py-3 border-b border-indigo-200/80 bg-white/70 print:bg-slate-50">
        <h3 className="text-sm font-bold text-slate-900">Year-over-year change</h3>
        <p className="text-xs text-slate-600 mt-0.5">
          This period vs <span className="font-medium text-slate-800">{previousPeriodLabel}</span>
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left border-b border-indigo-100 bg-white/60">
              <th className="px-4 py-2 font-semibold text-slate-600">Ratio</th>
              <th className="px-3 py-2 font-semibold text-slate-600 text-right">Last year</th>
              <th className="px-3 py-2 font-semibold text-indigo-800 text-right">This year</th>
              <th className="px-4 py-2 font-semibold text-slate-600 text-right">Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const change = formatRatioChange(row.diff, row.unit);
              return (
                <tr key={row.label} className="border-b border-indigo-50 last:border-0 bg-white/50">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{row.label}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{row.previous}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-indigo-900">{row.current}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${change.className}`}>
                    {change.text}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatementPeriodSelector({
  statementDate,
  projectionYears,
  onChange,
}: {
  statementDate: string;
  projectionYears: number;
  onChange: (years: number) => void;
}) {
  const options = Array.from({ length: MAX_PROJECTION_YEARS + 1 }, (_, years) => {
    const dateLabel = statementDate
      ? formatStatementDate(shiftStatementDate(statementDate, years))
      : null;

    return {
      years,
      label:
        years === 0
          ? `Current period${dateLabel ? ` (${dateLabel})` : ''}`
          : `${getProjectionLabel(years)}${dateLabel ? ` — ${dateLabel}` : ''}`,
    };
  });

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        View Period
      </label>
      <select
        value={projectionYears}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={!statementDate}
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {options.map((option) => (
          <option key={option.years} value={option.years}>
            {option.label}
          </option>
        ))}
      </select>
      {!statementDate && (
        <p className="text-xs text-slate-400 mt-1.5">Set a statement date to view future periods.</p>
      )}
    </div>
  );
}

function ReportToolbar({
  activeTab,
  onTabChange,
  statementDate,
  projectionYears,
  displayDateLabel,
  onProjectionChange,
}: {
  activeTab: 'income' | 'balance' | 'cashflow' | 'ratios';
  onTabChange: (tab: 'income' | 'balance' | 'cashflow' | 'ratios') => void;
  statementDate: string;
  projectionYears: number;
  displayDateLabel: string;
  onProjectionChange: (years: number) => void;
}) {
  const tabs = [
    { id: 'income' as const, label: 'P&L', fullLabel: 'Profit & Loss', icon: FileText },
    { id: 'balance' as const, label: 'Balance', fullLabel: 'Balance Sheet', icon: Briefcase },
    { id: 'cashflow' as const, label: 'Cash', fullLabel: 'Cash Flow', icon: ArrowRightLeft },
    { id: 'ratios' as const, label: 'Ratios', fullLabel: 'Financial Ratios', icon: Activity },
  ];

  return (
    <div className="flex-none border-b border-slate-200 bg-slate-50/80 print:hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-2 py-2">
        <div className="flex min-w-0 overflow-x-auto gap-1" role="tablist" aria-label="Report sections">
          {tabs.map(({ id, label, fullLabel, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => onTabChange(id)}
              title={fullLabel}
              className={`px-2.5 sm:px-3 py-1.5 font-medium text-xs sm:text-sm rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === id
                  ? 'bg-white text-indigo-700 border border-slate-200 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/70'
              }`}
            >
              <Icon size={14} className="flex-shrink-0" />
              <span className="sm:hidden">{label}</span>
              <span className="hidden sm:inline">{fullLabel}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-1 sm:px-0 sm:border-l sm:border-slate-200 sm:pl-3 flex-shrink-0">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
            <CalendarRange size={14} className="text-indigo-600 flex-shrink-0" />
            <span className="truncate">
              {displayDateLabel}
              {projectionYears > 0 && (
                <span className="ml-1.5 text-indigo-600 font-medium">· Projected</span>
              )}
            </span>
          </div>
          <label htmlFor="report-period-select" className="sr-only">
            View period
          </label>
          <select
            id="report-period-select"
            value={projectionYears}
            onChange={(e) => onProjectionChange(Number(e.target.value))}
            disabled={!statementDate}
            title={statementDate ? `Viewing ${displayDateLabel}` : 'Set a statement date first'}
            className="w-full sm:w-auto min-w-0 sm:min-w-[9.5rem] px-2 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs sm:text-sm font-medium disabled:opacity-50"
          >
            {Array.from({ length: MAX_PROJECTION_YEARS + 1 }, (_, years) => (
              <option key={years} value={years}>
                {getProjectionLabel(years)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="md:hidden px-2 pb-1.5 text-[11px] text-slate-500 truncate border-t border-slate-200/60">
        As of <span className="font-medium text-slate-700">{displayDateLabel}</span>
        {projectionYears > 0 && <span className="text-indigo-600"> · Projected</span>}
      </div>
    </div>
  );
}

function CompactAlertStrip({
  projectionYears,
  displayDateLabel,
  warnings,
}: {
  projectionYears: number;
  displayDateLabel: string;
  warnings: string[];
}) {
  return (
    <div className="flex-none border-b border-slate-200 bg-slate-50 px-2 py-1.5 print:hidden space-y-1">
      {projectionYears > 0 && (
        <details className="group rounded-md border border-indigo-200/80 bg-indigo-50/80 open:bg-indigo-50">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-indigo-900 [&::-webkit-details-marker]:hidden">
            <Activity size={14} className="flex-shrink-0 text-indigo-600" />
            <span className="flex-1 min-w-0 truncate">
              {getProjectionLabel(projectionYears)} · As of {displayDateLabel}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-indigo-500 flex-shrink-0 group-open:hidden">Details</span>
          </summary>
          <p className="px-2.5 pb-2 text-[11px] leading-relaxed text-indigo-900/90">
            Each year rolls inventory, equity, cash, tax payable, and 10% fixed-asset depreciation forward.
            Sales and expenses stay the same. Bank working capital loan is recalculated each period.
          </p>
        </details>
      )}
      {warnings.map((warning) => (
        <details key={warning} className="group rounded-md border border-amber-200/80 bg-amber-50/80 open:bg-amber-50">
          <summary className="flex cursor-pointer list-none items-start gap-2 px-2.5 py-1.5 text-xs text-amber-900 [&::-webkit-details-marker]:hidden">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-amber-600" />
            <span className="flex-1 min-w-0 line-clamp-1 group-open:line-clamp-none">{warning}</span>
            <span className="text-[10px] uppercase tracking-wide text-amber-600 flex-shrink-0 group-open:hidden">Details</span>
          </summary>
          <p className="px-2.5 pb-2 pl-7 text-[11px] leading-relaxed text-amber-900/90">{warning}</p>
        </details>
      ))}
    </div>
  );
}

function ReportStatementHeader({
  companyName,
  title,
  displayDateLabel,
  projectionYears,
  forExport = false,
}: {
  companyName: string;
  title: string;
  displayDateLabel: string;
  projectionYears: number;
  forExport?: boolean;
}) {
  return (
    <div className={`text-center ${forExport ? 'mb-6' : 'mb-4 md:mb-6 print:mb-8'}`}>
      <h1 className="text-base sm:text-lg md:text-xl font-bold uppercase tracking-wide text-slate-900">
        {companyName || 'COMPANY NAME'}
      </h1>
      <h2 className="text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wide text-slate-800 mt-0.5">
        {title}
      </h2>
      <p className={`text-sm font-medium text-slate-600 uppercase mt-1 ${forExport ? 'block' : 'hidden print:block'}`}>
        As of {displayDateLabel}
        {projectionYears > 0 && (
          <span className="ml-2 normal-case text-indigo-600">(Projected)</span>
        )}
      </p>
    </div>
  );
}

function InputField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: keyof FinancialData;
  value: number;
  onChange: (name: keyof FinancialData, value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const displayValue = draft !== null ? draft : value === 0 ? '' : String(value);

  const commitValue = (raw: string) => {
    const parsed = raw === '' ? 0 : parseFloat(raw);
    onChange(name, Number.isFinite(parsed) ? parsed : 0);
    setDraft(null);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
      <label className="text-sm font-medium text-slate-600 truncate flex-1" title={label}>
        {label}
      </label>
      <div className="relative w-full sm:w-40 flex-shrink-0">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-medium text-xs">Br</span>
        <input
          type="number"
          min="0"
          step="any"
          name={name}
          value={displayValue}
          onFocus={() => setDraft(value === 0 ? '' : String(value))}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commitValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
          className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm font-medium tabular-nums"
        />
      </div>
    </div>
  );
}

function ReportRow({
  label,
  value,
  isBold = false,
  isSubtotal = false,
  isTotal = false,
  indent = false,
  isDeduction = false,
}: {
  label: string;
  value: number;
  isBold?: boolean;
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: boolean;
  isDeduction?: boolean;
}) {
  const formatReportValue = () => {
    if (!Number.isFinite(value)) return '-';
    if (value === 0 && !isTotal && !isSubtotal) return '-';
    if (isDeduction && value > 0) return `(${formatCurrency(value)})`;
    return formatCurrency(value);
  };

  return (
    <div className={`grid grid-cols-12 border-b border-slate-800 ${isSubtotal ? 'bg-slate-50' : ''} ${isTotal ? 'bg-slate-100' : ''}`}>
      <div className={`col-span-8 p-2 text-sm border-r border-slate-800 flex items-center ${isBold ? 'font-bold' : 'font-medium text-slate-700'} ${indent ? 'pl-6' : ''}`}>
        {label}
      </div>
      <div className={`col-span-4 p-2 text-sm text-right tabular-nums tracking-tight ${isBold ? 'font-bold' : 'font-medium text-slate-700'}`}>
        {formatReportValue()}
      </div>
    </div>
  );
}

function RatioCard({
  title,
  value,
  healthyBenchmark,
  description,
  icon,
  trend,
}: {
  title: string;
  value: string;
  healthyBenchmark: string;
  description: string;
  icon: React.ReactNode;
  trend?: 'positive' | 'neutral' | 'negative';
}) {
  const trendLabel =
    trend === 'positive' ? 'Healthy' : trend === 'neutral' ? 'Fair' : trend === 'negative' ? 'Needs Attention' : null;
  const trendClass =
    trend === 'positive'
      ? 'bg-emerald-100 text-emerald-700 print:bg-transparent print:text-emerald-800'
      : trend === 'neutral'
        ? 'bg-amber-100 text-amber-700 print:bg-transparent print:text-amber-800'
        : 'bg-rose-100 text-rose-700 print:bg-transparent print:text-rose-800';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-full print:border-slate-300 print:shadow-none">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-slate-50 rounded-lg print:bg-transparent print:p-0">{icon}</div>
        {trend && trendLabel && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full print:px-0 ${trendClass}`}>
            {trendLabel}
          </span>
        )}
      </div>
      <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider mb-1 print:text-slate-600">{title}</h3>
      <div className="text-3xl font-bold text-slate-900 mb-1 print:text-2xl">{value}</div>
      <div className="text-xs font-semibold text-emerald-700 mb-2 print:text-emerald-800">
        Healthy benchmark: {healthyBenchmark}
      </div>
      <p className="text-slate-500 text-sm mt-auto leading-relaxed print:text-slate-600">{description}</p>
    </div>
  );
}
