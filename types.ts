export enum SubscriptionStatus {
  ACTIVE = 'Ativa',
  OVERDUE = 'Vencida',
  CANCELED = 'Cancelada',
  TRUST = 'Confiança',
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  appName: string;
  mac?: string;
  key?: string;
  notes?: string;
  createdAt: string; // ISO 8601
}

export interface Server {
  id: string;
  name: string;
  url: string;
  maxConnections: number;
  creditCost: number;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
}

export interface Subscription {
  id: string;
  customerId: string;
  planId: string;
  serverId: string;
  startDate: string; // ISO 8601
  endDate: string;   // ISO 8601
  status: SubscriptionStatus;
  isTrustActivation: boolean;
}

export interface ActivityItem {
    type: 'customer' | 'subscription';
    data: Customer | Subscription;
    date: Date;
}

export interface DashboardStats {
    totalCustomers: number;
    activeCustomers: number;
    overdueCustomers: number;
    monthlyRevenue: string;
    expiringSoon: Subscription[];
    overdueSubscriptions: Subscription[];
    recentActivities: ActivityItem[];
}

export interface IptvData {
  customers: Customer[];
  servers: Server[];
  plans: Plan[];
  subscriptions: Subscription[];
}