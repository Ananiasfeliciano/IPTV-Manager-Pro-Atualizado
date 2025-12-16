import React, { useState, useMemo, Suspense, lazy, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { useIptvData } from './hooks/useIptvData';
import { Toast } from './components/Toast';

type View = 'dashboard' | 'customers' | 'subscriptions' | 'plansAndServers' | 'expenses' | 'automation';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Customers = lazy(() => import('./pages/Customers').then(m => ({ default: m.Customers })));
const Subscriptions = lazy(() => import('./pages/Subscriptions').then(m => ({ default: m.Subscriptions })));
const PlansAndServers = lazy(() => import('./pages/PlansAndServers').then(m => ({ default: m.PlansAndServers })));
const Expenses = lazy(() => import('./pages/Expenses').then(m => ({ default: m.Expenses })));
const Automation = lazy(() => import('./pages/Automation').then(m => ({ default: m.Automation })));


const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
);

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { 
    data, 
    dashboardStats,
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
    addPlan,
    updatePlan,
    deletePlan,
    renewSubscription,
  } = useIptvData();

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (success) {
      setToast({ message: success, type: 'success' });
    }
  }, [success]);

  useEffect(() => {
    // Only show toast for errors that occur after the initial load.
    if (error && !isInitialLoad) {
      setToast({ message: error, type: 'error' });
    }
  }, [error, isInitialLoad]);
  
  useEffect(() => {
    if (!loading && (data.customers.length > 0 || error)) {
        setIsInitialLoad(false);
    }
  }, [loading, data, error]);

  // Close sidebar on mobile when view changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [activeView]);


  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard data={data} stats={dashboardStats} />;
      case 'customers':
        return <Customers data={data} actions={{ addCustomer, updateCustomer, deleteCustomer }} />;
      case 'subscriptions':
        return <Subscriptions data={data} actions={{ addSubscription, updateSubscription, deleteSubscription, renewSubscription }} />;
      case 'plansAndServers':
        return <PlansAndServers data={data} actions={{ addServer, updateServer, deleteServer, addPlan, updatePlan, deletePlan }} />;
      case 'expenses':
        return <Expenses data={data} />;
      case 'automation':
        return <Automation data={data} />;
      default:
        return <Dashboard data={data} stats={dashboardStats} />;
    }
  };
  
  const pageTitle = useMemo(() => {
    const titles: Record<View, string> = {
        dashboard: 'Dashboard Geral',
        customers: 'Gerenciamento de Clientes',
        subscriptions: 'Gerenciamento de Assinaturas',
        plansAndServers: 'Planos & Servidores',
        expenses: 'Análise de Custos',
        automation: 'Automação & WhatsApp Bot',
    };
    return titles[activeView];
  }, [activeView]);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100">
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        isOpen={sidebarOpen}
        closeMobileSidebar={() => setSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <Header 
            title={pageTitle} 
            onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-900 p-4 sm:p-6 lg:p-8 w-full">
          {isInitialLoad && loading ? (
            <LoadingSpinner />
          ) : isInitialLoad && error ? (
            <div className="bg-red-900/50 border border-red-600 text-red-200 px-4 py-3 rounded-lg relative" role="alert">
              <strong className="font-bold">Erro: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          ) : (
            <Suspense fallback={<LoadingSpinner />}>
              {renderView()}
            </Suspense>
          )}
        </main>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}