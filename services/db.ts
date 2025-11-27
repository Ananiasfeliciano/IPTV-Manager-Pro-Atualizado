import { Customer, Server, Plan, Subscription, SubscriptionStatus } from '../types';

const DB_NAME = 'IptvManagerDB';
const DB_VERSION = 2; // Incremented for indices

// Seed Data
const initialCustomers: Customer[] = [
  { id: 'c1', name: 'João da Silva', phone: '(11) 99999-1111', appName: 'App TV Pro', mac: '00:1A:2B:3C:4D:5E', key: 'XYZ123ABC', notes: 'Cliente antigo.', createdAt: new Date('2023-10-25T10:00:00Z').toISOString() },
  { id: 'c2', name: 'Maria Oliveira', phone: '(21) 98888-2222', appName: 'Play TV', mac: 'F8:E7:D6:C5:B4:A3', key: 'DEF456GHI', createdAt: new Date('2023-11-15T14:30:00Z').toISOString() },
  { id: 'c3', name: 'Pedro Souza', phone: '(31) 97777-3333', appName: 'Ultra Play', mac: '12:34:56:78:90:AB', key: 'JKL789MNO', createdAt: new Date('2024-01-05T09:00:00Z').toISOString() },
  { id: 'c4', name: 'Ana Pereira', phone: '(41) 96666-4444', appName: 'App TV Pro', mac: 'CD:EF:01:23:45:67', key: 'PQR012STU', notes: 'Pagamento atrasado em Setembro.', createdAt: new Date('2024-02-20T18:45:00Z').toISOString() },
];

const initialServers: Server[] = [
  { id: 's3', name: 'Live 21', url: 'http://live21.servidor.iptv', maxConnections: 300, creditCost: 4.00 },
  { id: 's4', name: 'Ultron', url: 'http://ultron.servidor.iptv', maxConnections: 400, creditCost: 4.50 },
  { id: 's5', name: 'Elite', url: 'http://elite.servidor.iptv', maxConnections: 350, creditCost: 3.50 },
];

const initialPlans: Plan[] = [
  { id: 'p1', name: 'Plano Básico', price: 29.90, durationDays: 30 },
  { id: 'p2', name: 'Plano Premium', price: 49.90, durationDays: 30 },
  { id: 'p3', name: 'Plano Trimestral', price: 129.90, durationDays: 90 },
];

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
const today = new Date();

const initialSubscriptions: Subscription[] = [
  { id: 'sub1', customerId: 'c1', planId: 'p2', serverId: 's3', startDate: addDays(today, -20).toISOString(), endDate: addDays(today, 10).toISOString(), status: SubscriptionStatus.ACTIVE, isTrustActivation: false },
  { id: 'sub2', customerId: 'c2', planId: 'p1', serverId: 's3', startDate: addDays(today, -40).toISOString(), endDate: addDays(today, -10).toISOString(), status: SubscriptionStatus.OVERDUE, isTrustActivation: false },
  { id: 'sub3', customerId: 'c3', planId: 'p3', serverId: 's3', startDate: addDays(today, -5).toISOString(), endDate: addDays(today, 85).toISOString(), status: SubscriptionStatus.ACTIVE, isTrustActivation: false },
  { id: 'sub4', customerId: 'c4', planId: 'p1', serverId: 's3', startDate: addDays(today, 0).toISOString(), endDate: addDays(today, 30).toISOString(), status: SubscriptionStatus.TRUST, isTrustActivation: true },
];

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB Error:", (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = (event.target as IDBOpenDBRequest).transaction;

      // Customers
      if (!db.objectStoreNames.contains('customers')) {
        const store = db.createObjectStore('customers', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        initialCustomers.forEach(c => store.add(c));
      } else if (transaction) {
         const store = transaction.objectStore('customers');
         if (!store.indexNames.contains('createdAt')) store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Servers
      if (!db.objectStoreNames.contains('servers')) {
        const store = db.createObjectStore('servers', { keyPath: 'id' });
        initialServers.forEach(s => store.add(s));
      }

      // Plans
      if (!db.objectStoreNames.contains('plans')) {
        const store = db.createObjectStore('plans', { keyPath: 'id' });
        initialPlans.forEach(p => store.add(p));
      }

      // Subscriptions
      if (!db.objectStoreNames.contains('subscriptions')) {
        const store = db.createObjectStore('subscriptions', { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('endDate', 'endDate', { unique: false });
        store.createIndex('startDate', 'startDate', { unique: false });
        initialSubscriptions.forEach(s => store.add(s));
      } else if (transaction) {
         const store = transaction.objectStore('subscriptions');
         if (!store.indexNames.contains('status')) store.createIndex('status', 'status', { unique: false });
         if (!store.indexNames.contains('endDate')) store.createIndex('endDate', 'endDate', { unique: false });
         if (!store.indexNames.contains('startDate')) store.createIndex('startDate', 'startDate', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
  });
};

// Generic CRUD Operations

export const dbGetAll = async <T>(storeName: string): Promise<T[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Optimized: Get All items matching a specific index value (e.g., status = 'active')
export const dbGetAllFromIndex = async <T>(storeName: string, indexName: string, query: IDBValidKey | IDBKeyRange): Promise<T[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(query);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const dbGetById = async <T>(storeName: string, id: string): Promise<T | undefined> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
  
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
};

// Optimized: Get count without loading objects
export const dbCount = async (storeName: string, indexName?: string, query?: IDBValidKey | IDBKeyRange): Promise<number> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        let request;
        
        if (indexName) {
            const index = store.index(indexName);
            request = index.count(query);
        } else {
            request = store.count(query);
        }

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Optimized: Get by Range (e.g., Dates)
export const dbGetRange = async <T>(storeName: string, indexName: string, range: IDBKeyRange): Promise<T[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(range);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Optimized: Get recent items (Limit + Sort Desc)
export const dbGetRecent = async <T>(storeName: string, indexName: string, limit: number): Promise<T[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.openCursor(null, 'prev'); // 'prev' for descending order
        
        const results: T[] = [];
        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor && results.length < limit) {
                results.push(cursor.value);
                cursor.continue();
            } else {
                resolve(results);
            }
        };
        request.onerror = () => reject(request.error);
    });
};


export const dbAdd = async <T>(storeName: string, item: T): Promise<T> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(item);

    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
};

export const dbUpdate = async <T>(storeName: string, item: T): Promise<T> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item); 

    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
};

export const dbDelete = async (storeName: string, id: string): Promise<string> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
};