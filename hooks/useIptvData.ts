import { useState, useEffect, useCallback } from 'react';
import { IptvData, Customer, Subscription, Server, Plan, DashboardStats } from '../types';
import * as api from '../services/mockApi';

export const useIptvData = () => {
  const [data, setData] = useState<IptvData>({
    customers: [],
    servers: [],
    plans: [],
    subscriptions: [],
  });
  
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchMainData = useCallback(async () => {
    try {
      setLoading(true);
      const allData = await api.fetchAllData();
      setData(allData);
      setError(null);
    } catch (err) {
      setError('Falha ao carregar os dados do sistema.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
      try {
          setStatsLoading(true);
          const stats = await api.fetchDashboardStats();
          setDashboardStats(stats);
      } catch (err) {
          console.error("Failed to load dashboard stats", err);
      } finally {
          setStatsLoading(false);
      }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchMainData();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApiCall = async <T,>(
    apiCall: Promise<T>, 
    onSuccess: (result: T) => void,
    successMessage: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const result = await apiCall;
      onSuccess(result);
      setSuccess(successMessage);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'A operação falhou. Tente novamente.';
      setError(errorMessage);
      setSuccess(null);
      console.error(err);
    } finally {
      // Refetch data to ensure consistency. 
      // We refetch both to keep stats and lists in sync.
      await fetchMainData();
      fetchStats();
    }
  };

  // Customer Actions
  const addCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    await handleApiCall(api.addCustomer(customerData), () => {}, 'Cliente adicionado com sucesso!');
  };
  const updateCustomer = async (customerData: Customer) => {
    await handleApiCall(api.updateCustomer(customerData), () => {}, 'Cliente atualizado com sucesso!');
  };
  const deleteCustomer = async (customerId: string) => {
    await handleApiCall(api.deleteCustomer(customerId), () => {}, 'Cliente excluído com sucesso!');
  };

  // Subscription Actions
  const addSubscription = async (subscriptionData: Omit<Subscription, 'id'>) => {
    await handleApiCall(api.addSubscription(subscriptionData), () => {}, 'Assinatura adicionada com sucesso!');
  };
  const updateSubscription = async (subscriptionData: Subscription) => {
    await handleApiCall(api.updateSubscription(subscriptionData), () => {}, 'Assinatura atualizada com sucesso!');
  };
  const deleteSubscription = async (subscriptionId: string) => {
    await handleApiCall(api.deleteSubscription(subscriptionId), () => {}, 'Assinatura excluída com sucesso!');
  };
  const renewSubscription = async (subscriptionId: string, type: 'PAYMENT' | 'TRUST') => {
      const msg = type === 'PAYMENT' ? 'Assinatura renovada (Pagamento)!' : 'Assinatura renovada (Confiança)!';
      await handleApiCall(api.renewSubscription(subscriptionId, type), () => {}, msg);
  }

  // Server Actions
  const addServer = async (serverData: Omit<Server, 'id'>) => {
    await handleApiCall(api.addServer(serverData), () => {}, 'Servidor adicionado com sucesso!');
  };
  const updateServer = async (serverData: Server) => {
    await handleApiCall(api.updateServer(serverData), () => {}, 'Servidor atualizado com sucesso!');
  };
  const deleteServer = async (serverId: string) => {
    await handleApiCall(api.deleteServer(serverId), () => {}, 'Servidor excluído com sucesso!');
  };
  
  // Plan Actions
  const addPlan = async (planData: Omit<Plan, 'id'>) => {
    await handleApiCall(api.addPlan(planData), () => {}, 'Plano adicionado com sucesso!');
  };
  const updatePlan = async (planData: Plan) => {
    await handleApiCall(api.updatePlan(planData), () => {}, 'Plano atualizado com sucesso!');
  };
  const deletePlan = async (planId: string) => {
    await handleApiCall(api.deletePlan(planId), () => {}, 'Plano excluído com sucesso!');
  };

  return { 
    data, 
    dashboardStats,
    loading,
    statsLoading,
    error,
    success,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    renewSubscription,
    addServer,
    updateServer,
    deleteServer,
    addPlan,
    updatePlan,
    deletePlan,
  };
};