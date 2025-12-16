import { useState, useEffect, useCallback } from 'react';
import { IptvData, Customer, Subscription, Server } from '../types';
import * as api from '../services/mockApi';

export const useIptvData = () => {
  const [data, setData] = useState<IptvData>({
    customers: [],
    servers: [],
    plans: [],
    subscriptions: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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

  useEffect(() => {
    fetchData();
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
      // Refetch data to ensure consistency
      await fetchData();
    }
  };

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    await handleApiCall(
        api.addCustomer(customerData), 
        () => {}, // Optimistic update could be handled here
        'Cliente adicionado com sucesso!'
    );
  };

  const updateCustomer = async (customerData: Customer) => {
    await handleApiCall(
        api.updateCustomer(customerData), 
        () => {},
        'Cliente atualizado com sucesso!'
    );
  };

  const deleteCustomer = async (customerId: string) => {
    await handleApiCall(
        api.deleteCustomer(customerId), 
        () => {},
        'Cliente excluído com sucesso!'
    );
  };

  const addSubscription = async (subscriptionData: Omit<Subscription, 'id'>) => {
    await handleApiCall(
        api.addSubscription(subscriptionData), 
        () => {},
        'Assinatura adicionada com sucesso!'
    );
  };

  const updateSubscription = async (subscriptionData: Subscription) => {
    await handleApiCall(
        api.updateSubscription(subscriptionData), 
        () => {},
        'Assinatura atualizada com sucesso!'
    );
  };
  
  const deleteSubscription = async (subscriptionId: string) => {
    await handleApiCall(
        api.deleteSubscription(subscriptionId), 
        () => {},
        'Assinatura excluída com sucesso!'
    );
  };

  const addServer = async (serverData: Omit<Server, 'id'>) => {
    await handleApiCall(
        api.addServer(serverData), 
        () => {},
        'Servidor adicionado com sucesso!'
    );
  };

  const updateServer = async (serverData: Server) => {
    await handleApiCall(
        api.updateServer(serverData), 
        () => {},
        'Servidor atualizado com sucesso!'
    );
  };

  const deleteServer = async (serverId: string) => {
    await handleApiCall(
        api.deleteServer(serverId), 
        () => {},
        'Servidor excluído com sucesso!'
    );
  };

  return { 
    data, 
    loading, 
    error,
    success,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    addServer,
    updateServer,
    deleteServer,
  };
};