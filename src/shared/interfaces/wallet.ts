export type WalletStatus = 'ACTIVE' | 'FROZEN';

export enum WalletTransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
}

export interface Wallet {
  userId: number;
  balance: number;
  status: WalletStatus;
}

export interface WalletTransaction {
  id: number;
  walletId: number;
  amount: number;
  type: WalletTransactionType;
  referenceId?: string | null;
  description?: string | null;
  createdAt: string;
}

