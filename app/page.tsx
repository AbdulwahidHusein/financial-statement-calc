'use client';

import React, { useState } from 'react';
import { Calculator, DollarSign, FileText, Printer, Briefcase, Activity, PieChart, TrendingUp, LineChart, Menu, X, Download } from 'lucide-react';

type FinancialData = {
  companyName: string;
  statementDate: string;
  // Income Statement
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
  
  // Balance Sheet - Assets
  cashOnBank: number;
  inventory: number;
  otherReceivables: number;
  building: number;
  propertyAndEquipment: number;
  vehicle: number;
  accumulatedDepreciation: number;

  // Balance Sheet - Liabilities & Equity
  employeeBenefitPayable: number;
  creditPurchasePayable: number;
  outstandingFinancing: number;
  profitTaxPayable: number;
  beginningCapital: number;
  reservedCapital: number;
  bankWorkingCapitalFinancing: number;
};

const initialData: FinancialData = {
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
  inventory: 0,
  otherReceivables: 0,
  building: 0,
  propertyAndEquipment: 0,
  vehicle: 0,
  accumulatedDepreciation: 0,
  employeeBenefitPayable: 0,
  creditPurchasePayable: 0,
  outstandingFinancing: 0,
  profitTaxPayable: 0,
  beginningCapital: 0,
  reservedCapital: 0,
  bankWorkingCapitalFinancing: 0,
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export default function FinancialApp() {
  const [data, setData] = useState<FinancialData>(initialData);
  const [activeTab, setActiveTab] = useState<'income' | 'balance' | 'ratios'>('income');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  // Calculations
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

  const totalCurrentAssets = data.cashOnBank + data.inventory + data.otherReceivables;
  const netFixedAssets = data.building + data.propertyAndEquipment + data.vehicle - data.accumulatedDepreciation;
  const totalAssets = totalCurrentAssets + netFixedAssets;

  const totalLiability = data.employeeBenefitPayable + data.creditPurchasePayable + data.outstandingFinancing + data.profitTaxPayable;
  const totalCapital = data.beginningCapital + netIncome + data.reservedCapital;
  const totalLiabilityAndEquity = totalLiability + totalCapital;

  // Ratios
  const workingCapital = totalCurrentAssets - totalLiability;
  const businessWorkingCapital = workingCapital - data.bankWorkingCapitalFinancing;
  const currentRatio = totalLiability > 0 ? totalCurrentAssets / totalLiability : 0;
  const debtToEquity = totalCapital > 0 ? totalLiability / totalCapital : 0;
  const grossProfitMargin = data.sales > 0 ? (grossProfit / data.sales) * 100 : 0;
  const netProfitMargin = data.sales > 0 ? (netIncome / data.sales) * 100 : 0;
  const returnOnAssets = totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0;
  const returnOnEquity = totalCapital > 0 ? (netIncome / totalCapital) * 100 : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const originalTitle = document.title;
    document.title = `${data.companyName || 'Financial_Report'}_${data.statementDate || new Date().toISOString().split('T')[0]}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden print:h-auto print:overflow-visible print:bg-white">
      <header className="flex-none bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-10 print:hidden">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="xl:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="hidden sm:block bg-indigo-600 p-2 rounded-lg text-white">
            <Briefcase size={24} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-semibold tracking-tight">Financial Statement Generator</h1>
            <p className="hidden sm:block text-sm text-slate-500 font-medium">Create professional P&L and Balance Sheets</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 md:px-4 py-2 rounded-md font-medium transition-colors text-sm md:text-base border border-indigo-200"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 md:px-4 py-2 rounded-md font-medium transition-colors text-sm md:text-base border border-slate-200"
          >
            <Printer size={18} />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 w-full max-w-[1920px] mx-auto p-4 md:p-6 flex flex-col xl:flex-row gap-6 print:p-0 print:block print:h-auto print:overflow-visible overflow-y-auto xl:overflow-hidden relative">
        
        {/* Left Column: Data Entry */}
        <div className={`w-full xl:w-[450px] flex-none flex-col space-y-6 print:hidden xl:h-full xl:overflow-y-auto xl:pr-2 xl:pb-6 custom-scrollbar ${isSidebarOpen ? 'flex' : 'hidden xl:flex'}`}>
          
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
              <InputField label="Sales (Revenue)" name="sales" value={data.sales} onChange={handleInputChange} />
              
              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Cost of Goods Sold</h3>
                <div className="space-y-3">
                  <InputField label="Beginning Inventory" name="beginningInventory" value={data.beginningInventory} onChange={handleInputChange} />
                  <InputField label="Purchases" name="purchases" value={data.purchases} onChange={handleInputChange} />
                  <InputField label="Ending Inventory" name="endingInventory" value={data.endingInventory} onChange={handleInputChange} />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Operating Expenses</h3>
                <div className="space-y-3">
                  <InputField label="Salary and Benefit" name="salaryAndBenefit" value={data.salaryAndBenefit} onChange={handleInputChange} />
                  <InputField label="Transportation Cost" name="transportationCost" value={data.transportationCost} onChange={handleInputChange} />
                  <InputField label="Loading and Unloading" name="loadingAndUnloading" value={data.loadingAndUnloading} onChange={handleInputChange} />
                  <InputField label="Repair and Maintenance" name="repairAndMaintenance" value={data.repairAndMaintenance} onChange={handleInputChange} />
                  <InputField label="Stationary and Printing" name="stationaryAndPrinting" value={data.stationaryAndPrinting} onChange={handleInputChange} />
                  <InputField label="Miscellanies & Other" name="miscellaneousExpense" value={data.miscellaneousExpense} onChange={handleInputChange} />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <InputField label="Profit Tax" name="profitTax" value={data.profitTax} onChange={handleInputChange} />
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
                  <InputField label="Cash on Hand / Bank" name="cashOnBank" value={data.cashOnBank} onChange={handleInputChange} />
                  <InputField label="Inventory" name="inventory" value={data.inventory} onChange={handleInputChange} />
                  <InputField label="Other Receivables" name="otherReceivables" value={data.otherReceivables} onChange={handleInputChange} />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Fixed Assets</h3>
                <div className="space-y-3">
                  <InputField label="Building" name="building" value={data.building} onChange={handleInputChange} />
                  <InputField label="Property and Equipment" name="propertyAndEquipment" value={data.propertyAndEquipment} onChange={handleInputChange} />
                  <InputField label="Vehicle" name="vehicle" value={data.vehicle} onChange={handleInputChange} />
                  <InputField label="Less Acc. Depreciation" name="accumulatedDepreciation" value={data.accumulatedDepreciation} onChange={handleInputChange} />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Liabilities</h3>
                <div className="space-y-3">
                  <InputField label="Employee Benefit / Salary" name="employeeBenefitPayable" value={data.employeeBenefitPayable} onChange={handleInputChange} />
                  <InputField label="Credit Purchase Payable" name="creditPurchasePayable" value={data.creditPurchasePayable} onChange={handleInputChange} />
                  <InputField label="Outstanding Financing" name="outstandingFinancing" value={data.outstandingFinancing} onChange={handleInputChange} />
                  <InputField label="Profit Tax Payable" name="profitTaxPayable" value={data.profitTaxPayable} onChange={handleInputChange} />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Equity & Financing</h3>
                <div className="space-y-3">
                  <InputField label="Beginning Capital" name="beginningCapital" value={data.beginningCapital} onChange={handleInputChange} />
                  <InputField label="Reserved Capital" name="reservedCapital" value={data.reservedCapital} onChange={handleInputChange} />
                  <InputField label="Bank Working Capital Loan" name="bankWorkingCapitalFinancing" value={data.bankWorkingCapitalFinancing} onChange={handleInputChange} />
                </div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Right Column: Generated Reports */}
        <div className={`flex-1 flex-col min-w-0 print:block xl:h-full xl:pb-6 print:h-auto print:overflow-visible ${isSidebarOpen ? 'hidden xl:flex' : 'flex'}`}>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0 print:border-none print:shadow-none print:h-auto print:overflow-visible print:block">
            
            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/80 px-2 pt-2 print:hidden overflow-x-auto">
              <button 
                onClick={() => setActiveTab('income')}
                className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'income' ? 'bg-white text-indigo-700 border-x border-t border-slate-200 shadow-[0_2px_0_0_white]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
              >
                <FileText size={16} />
                Profit & Loss
              </button>
              <button 
                onClick={() => setActiveTab('balance')}
                className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'balance' ? 'bg-white text-indigo-700 border-x border-t border-slate-200 shadow-[0_2px_0_0_white]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
              >
                <Briefcase size={16} />
                Balance Sheet
              </button>
              <button 
                onClick={() => setActiveTab('ratios')}
                className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'ratios' ? 'bg-white text-indigo-700 border-x border-t border-slate-200 shadow-[0_2px_0_0_white]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
              >
                <Activity size={16} />
                Financial Ratios
              </button>
            </div>

            {/* Document Content */}
            <div id="report-container" className="p-4 md:p-6 lg:p-8 flex-1 overflow-auto bg-white document-container print:overflow-visible print:p-0">
              
              <div className={activeTab === 'income' ? 'block print:block' : 'hidden print:block'}>
                <div className="max-w-4xl mx-auto mb-16 print:mb-24">
                  
                  {/* Header */}
                  <div className="text-center mb-8">
                    <h1 className="text-xl font-bold uppercase tracking-wide text-slate-900">{data.companyName || 'COMPANY NAME'}</h1>
                    <h2 className="text-lg font-semibold uppercase tracking-wide text-slate-800 mt-1">Profit And Loss Statement</h2>
                    <p className="text-sm font-medium text-slate-600 uppercase mt-1">
                      As of {data.statementDate ? new Date(data.statementDate).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }) : 'DATE'}
                    </p>
                  </div>

                  {/* Table */}
                  <div className="w-full border border-slate-800 border-collapse">
                    
                    {/* Header Row */}
                    <div className="grid grid-cols-12 border-b border-slate-800 bg-slate-50">
                      <div className="col-span-8 p-2 font-bold text-sm border-r border-slate-800">Revenue</div>
                      <div className="col-span-4 p-2 font-bold text-sm text-right">Amounts in (Birr)</div>
                    </div>

                    {/* Data Rows */}
                    <ReportRow label="SALES" value={data.sales} />
                    <ReportRow label="Total Revenue" value={data.sales} isBold isSubtotal />
                    
                    <ReportRow label="Beginning Inventory" value={data.beginningInventory} />
                    <ReportRow label="PURCHASE" value={data.purchases} />
                    <ReportRow label="Goods available for sales" value={goodsAvailableForSales} />
                    <ReportRow label="Less: Ending Inventory" value={data.endingInventory} />
                    
                    <ReportRow label="Cost of goods sold" value={cogs} isBold isSubtotal />
                    <ReportRow label="Gross Profit" value={grossProfit} isBold isTotal />

                    <div className="grid grid-cols-12 border-b border-slate-800">
                      <div className="col-span-12 p-2 font-bold text-sm">General & Administration Expense</div>
                    </div>

                    <ReportRow label="Salary and benefit" value={data.salaryAndBenefit} indent />
                    <ReportRow label="TRANSPORTATION COST" value={data.transportationCost} indent />
                    <ReportRow label="LOADING AND UNLOADING" value={data.loadingAndUnloading} indent />
                    <ReportRow label="repair and maintenance expense" value={data.repairAndMaintenance} indent />
                    <ReportRow label="Stationary and printing" value={data.stationaryAndPrinting} indent />
                    <ReportRow label="Miscellanies & other expense" value={data.miscellaneousExpense} indent />
                    
                    <ReportRow label="Total expense" value={totalExpenses} isBold isSubtotal />
                    
                    <ReportRow label="Income before profit tax" value={incomeBeforeTax} />
                    <ReportRow label="Profit tax" value={data.profitTax} />
                    
                    <ReportRow label="Net income/Loss" value={netIncome} isBold isTotal />

                  </div>
                </div>
              </div>

              <div className={`print:break-before-page ${activeTab === 'balance' ? 'block print:block' : 'hidden print:block'}`}>
                <div className="max-w-4xl mx-auto mb-16 print:mb-24">
                  
                  {/* Header */}
                  <div className="text-center mb-8">
                    <h1 className="text-xl font-bold uppercase tracking-wide text-slate-900">{data.companyName || 'COMPANY NAME'}</h1>
                    <h2 className="text-lg font-semibold uppercase tracking-wide text-slate-800 mt-1">Balance Sheet</h2>
                    <p className="text-sm font-medium text-slate-600 uppercase mt-1">
                      As of {data.statementDate ? new Date(data.statementDate).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }) : 'DATE'}
                    </p>
                  </div>

                  {/* Table */}
                  <div className="w-full border border-slate-800 border-collapse">
                    
                    {/* Header Row */}
                    <div className="grid grid-cols-12 border-b border-slate-800 bg-slate-50">
                      <div className="col-span-8 p-2 font-bold text-sm border-r border-slate-800">Description</div>
                      <div className="col-span-4 p-2 font-bold text-sm text-right">
                        {data.statementDate ? new Date(data.statementDate).getFullYear() : 'Year'}
                      </div>
                    </div>

                    <div className="grid grid-cols-12 border-b border-slate-800">
                      <div className="col-span-12 p-2 font-bold text-sm">ASSET</div>
                    </div>
                    <div className="grid grid-cols-12 border-b border-slate-800">
                      <div className="col-span-12 p-2 font-bold text-sm">CURRENT ASSET</div>
                    </div>

                    <ReportRow label="CASH ON HAND /BANK" value={data.cashOnBank} />
                    <ReportRow label="INVENTORY" value={data.inventory} />
                    <ReportRow label="OTHER RECIEVABLES" value={data.otherReceivables} />
                    
                    <ReportRow label="TOTAL CURRENT ASSET" value={totalCurrentAssets} isBold isSubtotal />

                    <div className="grid grid-cols-12 border-b border-slate-800">
                      <div className="col-span-12 p-2 font-bold text-sm">FIXED ASSET</div>
                    </div>

                    <ReportRow label="BUILDING" value={data.building} />
                    <ReportRow label="PROPERTY AND EQUIPMENT" value={data.propertyAndEquipment} />
                    <ReportRow label="VEHICLE" value={data.vehicle} />
                    <ReportRow label="LESS ACC. DEP BULG. PROP & VEH" value={data.accumulatedDepreciation} />
                    
                    <ReportRow label="NET FIXED ASSET" value={netFixedAssets} isBold isSubtotal />
                    
                    <ReportRow label="TOTAL ASSET" value={totalAssets} isBold isTotal />

                    <div className="grid grid-cols-12 border-b border-slate-800">
                      <div className="col-span-12 p-2 font-bold text-sm">LIABILITY</div>
                    </div>

                    <ReportRow label="EMPLOYEE BENEFIT/SALARY" value={data.employeeBenefitPayable} />
                    <ReportRow label="CREDIT PURCHASE PAYABLE" value={data.creditPurchasePayable} />
                    <ReportRow label="OUTSTANDING FINANCING" value={data.outstandingFinancing} />
                    <ReportRow label="PROFIT TAX PAYABLE" value={data.profitTaxPayable} />
                    
                    <ReportRow label="TOTAL LIABILITY" value={totalLiability} isBold isSubtotal />

                    <div className="grid grid-cols-12 border-b border-slate-800">
                      <div className="col-span-12 p-2 font-bold text-sm">EQUITY</div>
                    </div>

                    <ReportRow label="BEG. CAPITAL" value={data.beginningCapital} />
                    <ReportRow label="NET PROFIT" value={netIncome} />
                    <ReportRow label="RESERVED CAPITAL" value={data.reservedCapital} />
                    
                    <ReportRow label="TOTAL CAPITAL" value={totalCapital} isBold isSubtotal />

                    <ReportRow label="TOTAL LIABILITY AND EQUITY" value={totalLiabilityAndEquity} isBold isTotal />

                  </div>

                </div>
              </div>

              <div className={`print:break-before-page ${activeTab === 'ratios' ? 'block print:block' : 'hidden print:block'}`}>
                <div className="max-w-4xl mx-auto mb-16 print:mb-24">
                  
                  {/* Header */}
                  <div className="text-center mb-10">
                    <h1 className="text-xl font-bold uppercase tracking-wide text-slate-900">{data.companyName || 'COMPANY NAME'}</h1>
                    <h2 className="text-lg font-semibold uppercase tracking-wide text-slate-800 mt-1">Financial Ratios & Metrics</h2>
                    <p className="text-sm font-medium text-slate-600 uppercase mt-1">
                      As of {data.statementDate ? new Date(data.statementDate).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }) : 'DATE'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
                    {/* Working Capital Breakdown */}
                    <div className="col-span-1 md:col-span-2">
                      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-6 print:border-slate-300 print:shadow-none">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-slate-50 rounded-lg print:bg-transparent print:p-0">
                              <Briefcase className="text-blue-500" size={24} />
                            </div>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full print:px-0 ${workingCapital > 0 ? 'bg-emerald-100 text-emerald-700 print:bg-transparent print:text-emerald-800' : 'bg-rose-100 text-rose-700 print:bg-transparent print:text-rose-800'}`}>
                              {workingCapital > 0 ? 'Healthy' : 'Needs Attention'}
                            </span>
                          </div>
                          <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider mb-1 print:text-slate-600">Net Working Capital</h3>
                          <div className="text-3xl font-bold text-slate-900 mb-2 print:text-2xl">${formatCurrency(workingCapital)}</div>
                          <p className="text-slate-500 text-sm leading-relaxed print:text-slate-600">Current Assets minus Current Liabilities</p>
                        </div>
                        <div className="w-px bg-slate-200 hidden md:block print:block"></div>
                        <div className="h-px bg-slate-200 block md:hidden print:hidden"></div>
                        <div className="flex-1 flex flex-col justify-center space-y-4">
                          <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Financed by Bank</div>
                            <div className="text-xl font-bold text-slate-800">${formatCurrency(data.bankWorkingCapitalFinancing)}</div>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Financed by Business</div>
                            <div className="text-xl font-bold text-slate-800">${formatCurrency(businessWorkingCapital)}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Current Ratio */}
                    <RatioCard 
                      title="Current Ratio" 
                      value={`${currentRatio.toFixed(2)}x`} 
                      description="Current Assets divided by Current Liabilities"
                      icon={<Activity className="text-indigo-500" size={24} />}
                      trend={currentRatio >= 1 ? 'positive' : 'negative'}
                    />

                    {/* Debt to Equity */}
                    <RatioCard 
                      title="Debt to Equity Ratio" 
                      value={`${debtToEquity.toFixed(2)}x`} 
                      description="Total Liabilities divided by Total Equity"
                      icon={<PieChart className="text-orange-500" size={24} />}
                    />

                    {/* Gross Profit Margin */}
                    <RatioCard 
                      title="Gross Profit Margin" 
                      value={`${grossProfitMargin.toFixed(1)}%`} 
                      description="Gross Profit as a percentage of Sales"
                      icon={<LineChart className="text-emerald-500" size={24} />}
                    />

                    {/* Net Profit Margin */}
                    <RatioCard 
                      title="Net Profit Margin" 
                      value={`${netProfitMargin.toFixed(1)}%`} 
                      description="Net Income as a percentage of Sales"
                      icon={<TrendingUp className="text-emerald-500" size={24} />}
                      trend={netProfitMargin > 0 ? 'positive' : 'negative'}
                    />

                    {/* Return on Assets */}
                    <RatioCard 
                      title="Return on Assets (ROA)" 
                      value={`${returnOnAssets.toFixed(1)}%`} 
                      description="Net Income relative to Total Assets"
                      icon={<TrendingUp className="text-purple-500" size={24} />}
                    />

                    {/* Return on Equity */}
                    <RatioCard 
                      title="Return on Equity (ROE)" 
                      value={`${returnOnEquity.toFixed(1)}%`} 
                      description="Net Income relative to Total Equity"
                      icon={<TrendingUp className="text-pink-500" size={24} />}
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

// Utility Components

function InputField({ 
  label, 
  name, 
  value, 
  onChange 
}: { 
  label: string; 
  name: string; 
  value: number; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
      <label className="text-sm font-medium text-slate-600 truncate flex-1" title={label}>{label}</label>
      <div className="relative w-full sm:w-40 flex-shrink-0">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-medium text-sm">$</span>
        <input 
          type="number" 
          name={name} 
          value={value} 
          onChange={onChange}
          className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm font-medium tabular-nums"
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
  indent = false
}: { 
  label: string; 
  value: number; 
  isBold?: boolean; 
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: boolean;
}) {
  return (
    <div className={`grid grid-cols-12 border-b border-slate-800 ${isSubtotal ? 'bg-slate-50' : ''} ${isTotal ? 'bg-slate-100' : ''}`}>
      <div className={`col-span-8 p-2 text-sm border-r border-slate-800 flex items-center ${isBold ? 'font-bold' : 'font-medium text-slate-700'} ${indent ? 'pl-6' : ''}`}>
        {label}
      </div>
      <div className={`col-span-4 p-2 text-sm text-right tabular-nums tracking-tight ${isBold ? 'font-bold' : 'font-medium text-slate-700'}`}>
        {value === 0 && !isTotal && !isSubtotal ? '-' : formatCurrency(value)}
      </div>
    </div>
  );
}

function RatioCard({ 
  title, 
  value, 
  description, 
  icon,
  trend
}: { 
  title: string; 
  value: string; 
  description: string; 
  icon: React.ReactNode;
  trend?: 'positive' | 'negative';
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-full print:border-slate-300 print:shadow-none">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-slate-50 rounded-lg print:bg-transparent print:p-0">
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full print:px-0 ${trend === 'positive' ? 'bg-emerald-100 text-emerald-700 print:bg-transparent print:text-emerald-800' : 'bg-rose-100 text-rose-700 print:bg-transparent print:text-rose-800'}`}>
            {trend === 'positive' ? 'Healthy' : 'Needs Attention'}
          </span>
        )}
      </div>
      <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider mb-1 print:text-slate-600">{title}</h3>
      <div className="text-3xl font-bold text-slate-900 mb-2 print:text-2xl">{value}</div>
      <p className="text-slate-500 text-sm mt-auto leading-relaxed print:text-slate-600">{description}</p>
    </div>
  );
}
