// EXPORTS: ITransaction, IDebt, IAnnouncement, ICategory, ILockedFund, IAiConfig, MOCK_TRANSACTIONS, MOCK_DEBTS, MOCK_ANNOUNCEMENTS, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, DEFAULT_LOCKED_FUNDS

export interface ITransaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  note?: string;
  date: string;
  createdAt: string;
  source?: 'mock' | 'api';
}

export interface IDebt {
  id: string;
  direction: 'i_owe' | 'owe_me';
  personName: string;
  amount: number; // 原始总金额
  paidAmount: number; // 已还/已收金额
  date: string;
  note?: string;
  status: 'pending' | 'settled';
  createdAt: string;
  source?: 'mock' | 'api';
}

export interface IAnnouncement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  source?: 'mock' | 'api';
}

export interface ICategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
}

export interface ILockedFund {
  id: string;
  name: string;
  amount: number;
  note?: string;
  createdAt: string;
}

export interface IAiConfig {
  enabled: boolean;
  provider: 'plugin' | 'openai';
  customPrompt: string;
  modelId: string;
  temperature: number;
  openaiApiKey: string;
  openaiBaseUrl: string;
  openaiModel: string;
  openaiMaxTokens: number;
}

export const DEFAULT_EXPENSE_CATEGORIES: ICategory[] = [
  { id: 'ec1', name: '购物', type: 'expense' },
  { id: 'ec2', name: '餐饮', type: 'expense' },
  { id: 'ec3', name: '日用', type: 'expense' },
  { id: 'ec4', name: '服饰', type: 'expense' },
  { id: 'ec5', name: '交通', type: 'expense' },
  { id: 'ec6', name: '其他', type: 'expense' },
];

export const DEFAULT_INCOME_CATEGORIES: ICategory[] = [
  { id: 'ic1', name: '工资', type: 'income' },
  { id: 'ic2', name: '奖金', type: 'income' },
  { id: 'ic3', name: '投资', type: 'income' },
  { id: 'ic4', name: '其他', type: 'income' },
];

export const DEFAULT_LOCKED_FUNDS: ILockedFund[] = [
  {
    id: 'lf1',
    name: '应急储备金',
    amount: 500,
    note: '紧急情况才能动用',
    createdAt: '2026-07-01T00:00:00.000Z',
  },
];

export const MOCK_TRANSACTIONS: ITransaction[] = [
  { id: '1', type: 'expense', category: '日用', amount: 1.62, note: '膨胀螺丝', date: '2026-07-20', createdAt: '2026-07-20T10:00:00.000Z', source: 'mock' },
  { id: '2', type: 'income', category: '其他', amount: 27.88, note: '基金赎回', date: '2026-07-20', createdAt: '2026-07-20T09:00:00.000Z', source: 'mock' },
  { id: '3', type: 'income', category: '其他', amount: 6.00, note: '炸金花赢', date: '2026-07-19', createdAt: '2026-07-19T22:00:00.000Z', source: 'mock' },
  { id: '4', type: 'expense', category: '日用', amount: 4.55, note: '水泵', date: '2026-07-19', createdAt: '2026-07-19T15:00:00.000Z', source: 'mock' },
  { id: '5', type: 'expense', category: '购物', amount: 90.00, note: '网购', date: '2026-07-16', createdAt: '2026-07-16T20:00:00.000Z', source: 'mock' },
  { id: '6', type: 'expense', category: '餐饮', amount: 39.00, note: '聚餐', date: '2026-07-15', createdAt: '2026-07-15T19:00:00.000Z', source: 'mock' },
  { id: '7', type: 'expense', category: '服饰', amount: 11.00, note: '袜子', date: '2026-07-14', createdAt: '2026-07-14T14:00:00.000Z', source: 'mock' },
  { id: '8', type: 'expense', category: '交通', amount: 2.00, note: '公交', date: '2026-07-13', createdAt: '2026-07-13T08:00:00.000Z', source: 'mock' },
  { id: '9', type: 'expense', category: '其他', amount: 11.00, note: '杂费', date: '2026-07-17', createdAt: '2026-07-17T12:00:00.000Z', source: 'mock' },
  { id: '10', type: 'expense', category: '餐饮', amount: 18.70, note: '午餐', date: '2026-07-18', createdAt: '2026-07-18T12:30:00.000Z', source: 'mock' },
  { id: '11', type: 'income', category: '工资', amount: 200.00, note: '兼职收入', date: '2026-07-10', createdAt: '2026-07-10T09:00:00.000Z', source: 'mock' },
  { id: '12', type: 'income', category: '奖金', amount: -5.20, note: '退款', date: '2026-07-12', createdAt: '2026-07-12T16:00:00.000Z', source: 'mock' },
];

export const MOCK_DEBTS: IDebt[] = [
  {
    id: 'd1',
    direction: 'i_owe',
    personName: '姐',
    amount: 2500.00,
    paidAmount: 0,
    date: '2026-07-13',
    note: '',
    status: 'pending',
    createdAt: '2026-07-13T00:00:00.000Z',
    source: 'mock',
  },
];

export const MOCK_ANNOUNCEMENTS: IAnnouncement[] = [
  { id: 'a1', title: '测试公告0', content: '测试公告0', createdAt: '2026-07-01T00:00:00.000Z', source: 'mock' },
];
