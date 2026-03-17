import client from '@app/api/client';
import {
  Wallet,
  WalletTransaction,
  WalletTransactionType,
} from '@shared/interfaces/wallet';

export const getMyWallet = async (): Promise<Wallet> => {
  const res = await client.get('/wallet/balance');
  const data: any = (res as any)?.data ?? res;

  return {
    userId: data.userId,
    balance: Number(data.balance ?? 0),
    status: data.status,
  };
};

export const getTransactions = async (): Promise<WalletTransaction[]> => {
  const res = await client.get('/wallet/transactions');
  const list: any[] = Array.isArray(res) ? res : (res as any)?.data ?? [];

  return list.map((t) => ({
    id: t.id,
    walletId: t.walletId,
    amount: Number(t.amount ?? 0),
    type: t.type as WalletTransactionType,
    referenceId: t.referenceId ?? null,
    description: t.description ?? null,
    createdAt: t.createdAt ?? new Date().toISOString(),
  }));
};

