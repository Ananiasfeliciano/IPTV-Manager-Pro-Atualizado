import { IptvData, Customer, Server, Plan, Subscription, SubscriptionStatus, DashboardStats, ActivityItem } from '../types';
import * as db from './db';

// Helper function to simulate network latency
const simulateNetwork = (delay = 300) => new Promise(res => setTimeout(res, delay));

// Helper function to update statuses based on the current date
const checkAndUpdateStatuses = async (subscriptions: Subscription[]): Promise<Subscription[]> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const updates = subscriptions.map(async (sub) => {
    let hasChanged = false;
    let newStatus = sub.status;

    // Don't change already canceled subscriptions
    if (sub.status === SubscriptionStatus.CANCELED) {
      return sub;
    }
    
    const endDate = new Date(sub.endDate);
    
    // If expired
    if (endDate < today && sub.status !== SubscriptionStatus.OVERDUE) {
      newStatus = SubscriptionStatus.OVERDUE;
      hasChanged = true;
    }
    
    // If valid date but marked overdue (e.g. renewal or manual edit)
    if (endDate >= today && sub.status === SubscriptionStatus.OVERDUE) {
        // Here we respect the trust logic: if it was a trust activation, it goes back to TRUST, else ACTIVE.
        newStatus = sub.isTrustActivation ? SubscriptionStatus.TRUST : SubscriptionStatus.ACTIVE;
        hasChanged = true;
    }

    if (hasChanged) {
        const updatedSub = { ...sub, status: newStatus };
        // Update in DB silently
        await db.dbUpdate('subscriptions', updatedSub);
        return updatedSub;
    }
    return sub;
  });

  return Promise.all(updates);
};

// --- Optimized Dashboard Fetch ---
export const fetchDashboardStats = async (): Promise<DashboardStats> => {
    await simulateNetwork(200); // Shorter delay for dashboard
    
    // Perform Health Check
    const dbStatus = await db.checkConnection();

    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    // Parallel execution for maximum performance
    const [
        totalCustomers,
        activeCount,
        trustCount,
        overdueCount,
        expiringSoon,
        recentSubs,
        recentCusts,
        plans,
        activeSubs,
        trustSubs,
        activeOverdue
    ] = await Promise.all([
        db.dbCount('customers'),
        db.dbCount('subscriptions', 'status', SubscriptionStatus.ACTIVE),
        db.dbCount('subscriptions', 'status', SubscriptionStatus.TRUST),
        db.dbCount('subscriptions', 'status', SubscriptionStatus.OVERDUE),
        // Get expiring soon (Range: Today -> Today + 7 days) on 'endDate' index
        db.dbGetRange<Subscription>('subscriptions', 'endDate', IDBKeyRange.bound(today.toISOString(), nextWeek.toISOString())),
        // Get recent activities
        db.dbGetRecent<Subscription>('subscriptions', 'startDate', 5),
        db.dbGetRecent<Customer>('customers', 'createdAt', 5),
        // Plans for revenue calc
        db.dbGetAll<Plan>('plans'),
        // Fetch strictly active/trust for revenue, using index instead of filtering in JS
        db.dbGetAllFromIndex<Subscription>('subscriptions', 'status', SubscriptionStatus.ACTIVE),
        db.dbGetAllFromIndex<Subscription>('subscriptions', 'status', SubscriptionStatus.TRUST),
        // Fetch strictly overdue for display list
        db.dbGetAllFromIndex<Subscription>('subscriptions', 'status', SubscriptionStatus.OVERDUE)
    ]);

    const allRevenueGeneratingSubs = [...activeSubs, ...trustSubs];

    // Calculate Revenue
    const totalRevenue = allRevenueGeneratingSubs.reduce((acc, sub) => {
        const plan = plans.find(p => p.id === sub.planId);
        return acc + (plan?.price || 0);
    }, 0);

    // Combine recent activities
    const recentActivities: ActivityItem[] = [
        ...recentCusts.map(c => ({ type: 'customer' as const, data: c, date: new Date(c.createdAt) })),
        ...recentSubs.map(s => ({ type: 'subscription' as const, data: s, date: new Date(s.startDate) }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
    
    // Ensure status correctness for displayed items (expiring soon)
    const validExpiringSoon = expiringSoon.filter(s => s.status === SubscriptionStatus.ACTIVE || s.status === SubscriptionStatus.TRUST);

    return {
        totalCustomers,
        activeCustomers: activeCount + trustCount,
        overdueCustomers: overdueCount,
        monthlyRevenue: totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        expiringSoon: validExpiringSoon,
        overdueSubscriptions: activeOverdue,
        recentActivities,
        dbStatus
    };
};

// --- Standard API Functions ---

export const fetchAllData = async (): Promise<IptvData> => {
  await simulateNetwork();
  
  const customers = await db.dbGetAll<Customer>('customers');
  const servers = await db.dbGetAll<Server>('servers');
  const plans = await db.dbGetAll<Plan>('plans');
  let subscriptions = await db.dbGetAll<Subscription>('subscriptions');

  // Check for expirations on load
  subscriptions = await checkAndUpdateStatuses(subscriptions);

  return {
    customers,
    servers,
    plans,
    subscriptions,
  };
};

// --- Customer API ---
export const addCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> => {
  await simulateNetwork();
  const newCustomer: Customer = { 
    ...customerData, 
    id: `c${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  return db.dbAdd('customers', newCustomer);
};

export const updateCustomer = async (customerData: Customer): Promise<Customer> => {
  await simulateNetwork();
  return db.dbUpdate('customers', customerData);
};

export const deleteCustomer = async (customerId: string): Promise<{ id: string }> => {
  await simulateNetwork();
  
  // Also remove subscriptions for this customer
  const allSubs = await db.dbGetAll<Subscription>('subscriptions');
  const customerSubs = allSubs.filter(s => s.customerId === customerId);
  
  for (const sub of customerSubs) {
      await db.dbDelete('subscriptions', sub.id);
  }

  await db.dbDelete('customers', customerId);
  return { id: customerId };
};

// --- Subscription API ---
export const addSubscription = async (subData: Omit<Subscription, 'id'>): Promise<Subscription> => {
  await simulateNetwork();
  const newSubscription: Subscription = { ...subData, id: `sub${Date.now()}` };
  return db.dbAdd('subscriptions', newSubscription);
};

export const updateSubscription = async (subData: Subscription): Promise<Subscription> => {
  await simulateNetwork();
  return db.dbUpdate('subscriptions', subData);
};

export const deleteSubscription = async (subscriptionId: string): Promise<{ id: string }> => {
  await simulateNetwork();
  await db.dbDelete('subscriptions', subscriptionId);
  return { id: subscriptionId };
};

// Renew subscription logic
export const renewSubscription = async (subscriptionId: string, type: 'PAYMENT' | 'TRUST', paymentMethod?: string): Promise<Subscription> => {
    await simulateNetwork();
    const subscription = await db.dbGetById<Subscription>('subscriptions', subscriptionId);
    if (!subscription) throw new Error("Subscription not found");

    const plan = await db.dbGetById<Plan>('plans', subscription.planId);
    if (!plan) throw new Error("Plan not found");

    const today = new Date();
    const currentEndDate = new Date(subscription.endDate);
    
    // Logic: If already expired, start from today. If active, add to current end date.
    let newStartDate = new Date(subscription.startDate);
    let newEndDate = currentEndDate;

    if (currentEndDate < today) {
        // Expired: Reset cycle
        newStartDate = today;
        newEndDate = new Date(today);
        newEndDate.setDate(today.getDate() + plan.durationDays);
    } else {
        // Active: Extend
        newEndDate = new Date(currentEndDate);
        newEndDate.setDate(currentEndDate.getDate() + plan.durationDays);
    }

    const updatedSub: Subscription = {
        ...subscription,
        startDate: newStartDate.toISOString(),
        endDate: newEndDate.toISOString(),
        status: type === 'TRUST' ? SubscriptionStatus.TRUST : SubscriptionStatus.ACTIVE,
        isTrustActivation: type === 'TRUST',
        paymentMethod: type === 'PAYMENT' ? (paymentMethod || 'PIX') : undefined
    };

    return db.dbUpdate('subscriptions', updatedSub);
};


// --- Server API ---
export const addServer = async (serverData: Omit<Server, 'id'>): Promise<Server> => {
  await simulateNetwork();
  const newServer: Server = { ...serverData, id: `s${Date.now()}` };
  return db.dbAdd('servers', newServer);
};

export const updateServer = async (serverData: Server): Promise<Server> => {
  await simulateNetwork();
  return db.dbUpdate('servers', serverData);
};

export const deleteServer = async (serverId: string): Promise<{ id: string }> => {
  await simulateNetwork();
  
  // Find all associated subscriptions and cancel them instead of deleting
  const allSubs = await db.dbGetAll<Subscription>('subscriptions');
  const serverSubs = allSubs.filter(sub => sub.serverId === serverId);

  for (const sub of serverSubs) {
      const canceledSub = { ...sub, status: SubscriptionStatus.CANCELED };
      await db.dbUpdate('subscriptions', canceledSub);
  }

  await db.dbDelete('servers', serverId);
  return { id: serverId };
};

// --- Plan API ---
export const addPlan = async (planData: Omit<Plan, 'id'>): Promise<Plan> => {
  await simulateNetwork();
  const newPlan: Plan = { ...planData, id: `p${Date.now()}` };
  return db.dbAdd('plans', newPlan);
};

export const updatePlan = async (planData: Plan): Promise<Plan> => {
  await simulateNetwork();
  return db.dbUpdate('plans', planData);
};

export const deletePlan = async (planId: string): Promise<{ id: string }> => {
  await simulateNetwork();
  
  // Cancel subscriptions associated with this plan
  const allSubs = await db.dbGetAll<Subscription>('subscriptions');
  const planSubs = allSubs.filter(sub => sub.planId === planId);

  for (const sub of planSubs) {
      const canceledSub = { ...sub, status: SubscriptionStatus.CANCELED };
      await db.dbUpdate('subscriptions', canceledSub);
  }

  await db.dbDelete('plans', planId);
  return { id: planId };
};