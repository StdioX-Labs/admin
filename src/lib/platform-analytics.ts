/**
 * Platform reporting dataset — May 2025 to Apr 2026.
 *
 * These are static, finance-reconciled figures, not a live API feed. They back
 * the Analytics screen and the two summary charts on the Dashboard. Everything
 * else on those screens comes from the live admin API.
 */

export interface MonthRow {
  month: string;
  gmv: number;
  commission: number;
  grossProfit: number;
  margin: number;
}

export const MONTHLY: MonthRow[] = [
  { month: 'May', gmv: 0, commission: 0, grossProfit: -6, margin: 0 },
  { month: 'Jun', gmv: 4614, commission: 461, grossProfit: -36, margin: 0 },
  { month: 'Jul', gmv: 339394, commission: 33939, grossProfit: 32301, margin: 95.2 },
  { month: 'Aug', gmv: 2780021, commission: 278002, grossProfit: 272407, margin: 98.0 },
  { month: 'Sep', gmv: 2860266, commission: 286027, grossProfit: 279694, margin: 97.8 },
  { month: 'Oct', gmv: 4101681, commission: 410168, grossProfit: 408657, margin: 99.6 },
  { month: 'Nov', gmv: 730302, commission: 73030, grossProfit: 69912, margin: 95.7 },
  { month: 'Dec', gmv: 14806586, commission: 1480659, grossProfit: 1472031, margin: 99.4 },
  { month: 'Jan', gmv: 1021073, commission: 102107, grossProfit: 100714, margin: 98.6 },
  { month: 'Feb', gmv: 1190658, commission: 119066, grossProfit: 112954, margin: 94.9 },
  { month: 'Mar', gmv: 1888914, commission: 188891, grossProfit: 183366, margin: 97.1 },
  { month: 'Apr', gmv: 1418356, commission: 141836, grossProfit: 139001, margin: 98.0 },
];

export interface ChannelRow {
  name: string;
  value: number;
  pct: number;
  color: string;
}

export const CHANNEL_MIX: ChannelRow[] = [
  { name: 'M-Pesa', value: 27453391, pct: 89.4, color: '#7a8a5e' },
  { name: 'Paystack', value: 2974043, pct: 9.7, color: '#c67139' },
  { name: 'LittlePay', value: 213430, pct: 0.7, color: '#d29b3f' },
  { name: 'Other', value: 81000, pct: 0.3, color: '#a19786' },
];

export const PLATFORM_KPIS = {
  gmv: 31141864,
  totalIncome: 3492186,
  grossProfit: 3400494,
  grossMargin: 97.4,
  directCosts: 91692,
  events: 234,
  tickets: 1285839,
  avgTicket: 2500,
  checkinRate: 86,
  repeatOrgs: 53,
  bestMonthIncome: 1480659,
};
