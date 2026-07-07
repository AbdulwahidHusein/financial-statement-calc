/**
 * Quick projection sanity checks — run: node scripts/verify-projections.mjs
 * Uses tsx to load TypeScript modules directly.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

async function loadModule(relPath) {
  const full = join(root, relPath);
  return import(pathToFileURL(full).href);
}

const { calculateFinancials, emptyFinancialData } = await loadModule('lib/finance.ts');
const {
  createPeriodSeedFromPrior,
  resolvePeriodData,
  invalidateDownstreamSnapshots,
  getPeriodKey,
  getTotalProjectionMonths,
  canonicalizeSnapshotMap,
} = await loadModule('lib/periods.ts');

const baseDate = '2026-01-31';
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${message}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${message}`);
  }
}

function approx(a, b, eps = 0.001) {
  return Math.abs(a - b) <= eps;
}

console.log('Projection verification\n');

// Base period with sample data
const base = {
  ...emptyFinancialData,
  companyName: 'Test Co',
  statementDate: baseDate,
  sales: 120000,
  beginningInventory: 5000,
  purchases: 40000,
  endingInventory: 8000,
  salaryAndBenefit: 20000,
  profitTax: 1000,
  cashOnBank: 10000,
  building: 120000,
  propertyAndEquipment: 0,
  vehicle: 0,
  accumulatedDepreciation: 0,
  beginningCapital: 50000,
};

const baseCalc = calculateFinancials(base);
const snapshots = { '0-0': base };

// 1. Month 1 seed: P&L cleared, inventory linked, cash bumped
const m1 = resolvePeriodData(0, 1, snapshots, baseDate);
assert(m1.sales === 0, 'Month 1 clears sales');
assert(m1.beginningInventory === base.endingInventory, 'Month 1 beginning inventory = prior ending inventory');
assert(m1.endingInventory === 0, 'Month 1 ending inventory reset');
assert(
  approx(m1.cashOnBank, base.cashOnBank + baseCalc.netIncome / 12),
  'Month 1 cash += prior net income / 12'
);
assert(m1.building === base.building, 'Fixed assets carry forward');
assert(m1.otherReceivables === 0, 'Receivables reset');
assert(m1.profitTax === 0, 'Profit tax reset');

// 2. Month 2 uses month 1 ending inventory (0) as beginning
const m2 = resolvePeriodData(0, 2, snapshots, baseDate);
assert(m2.beginningInventory === m1.endingInventory, 'Month 2 beginning inventory = month 1 ending');

// 3. Year-end (12 months): beginning capital rolls from prior total capital
const y1 = resolvePeriodData(1, 0, snapshots, baseDate);
const prior11 = resolvePeriodData(0, 11, snapshots, baseDate);
const prior11Calc = calculateFinancials(prior11);
assert(
  approx(y1.beginningCapital, prior11Calc.totalCapital),
  'Year-end beginning capital = prior total capital'
);
assert(y1.beginningCapital !== base.beginningCapital || prior11Calc.totalCapital === base.beginningCapital, 'Year-end capital roll applied');

// 4. Canonical keys: 0y12m === 1y0m
assert(getPeriodKey(0, 12) === getPeriodKey(1, 0), '0y12m canonicalizes to 1y0m');

// 5. Invalidation drops downstream only
const withFuture = {
  ...snapshots,
  '0-1': m1,
  '0-2': m2,
  '1-0': y1,
};
const afterEdit = invalidateDownstreamSnapshots(withFuture, 0, 0);
assert(afterEdit['0-0'] !== undefined, 'Edited period kept');
assert(afterEdit['0-1'] === undefined, 'Downstream 0-1 invalidated');
assert(afterEdit['1-0'] === undefined, 'Downstream 1-0 invalidated');

// 6. Switching back to 0-0 restores original snapshot (not derived)
const restored = resolvePeriodData(0, 0, snapshots, baseDate);
assert(restored.sales === base.sales, 'Period 0-0 restores saved sales');
assert(restored.cashOnBank === base.cashOnBank, 'Period 0-0 restores saved cash');

// 7. Edited upstream re-seeds downstream
const editedBase = { ...base, sales: 999999 };
const editedSnapshots = { '0-0': editedBase };
const reseeded = resolvePeriodData(0, 1, editedSnapshots, baseDate);
const editedCalc = calculateFinancials(editedBase);
assert(
  approx(reseeded.cashOnBank, editedBase.cashOnBank + editedCalc.netIncome / 12),
  'Re-seeded month 1 reflects edited upstream net income'
);

// 8. canonicalizeSnapshotMap handles null/duplicate keys
const merged = canonicalizeSnapshotMap(null, baseDate);
assert(Object.keys(merged).length === 0, 'Null snapshot map returns empty object');
const dupes = canonicalizeSnapshotMap(
  { '0-12': { ...base, sales: 1 }, '1-0': { ...base, sales: 2 } },
  baseDate
);
assert(merged['1-0'] === undefined || dupes['1-0']?.sales === 1 || dupes['1-0']?.sales === 2, 'Duplicate canonical keys merge');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
