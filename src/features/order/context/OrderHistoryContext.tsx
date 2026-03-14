import React, { createContext, useContext, useState, useCallback } from 'react';
import * as orderService from '@app/services/orderService';

type OrderHistoryContextValue = {
  orders: any[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
};

const OrderHistoryContext = createContext<OrderHistoryContextValue | null>(null);

export function OrderHistoryProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orderService.getMyOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <OrderHistoryContext.Provider value={{ orders, loading, error, refresh }}>
      {children}
    </OrderHistoryContext.Provider>
  );
}

export function useOrderHistory() {
  const ctx = useContext(OrderHistoryContext);
  return ctx;
}
