import client from '@app/api/client';

// ============================================================
// Types / Interfaces
// ============================================================

export type StoreTransactionType = 'SALE_REVENUE' | 'WITHDRAWAL' | 'ADJUSTMENT';
export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface StoreWallet {
  id: number;
  storeId: number;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoreWalletTransaction {
  id: number;
  walletId: number;
  amount: number;
  type: StoreTransactionType;
  referenceId?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface StoreWithdrawalRequest {
  id: number;
  storeId: number;
  walletId: number;
  amount: number;
  status: WithdrawalStatus;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  proofImage?: string;
  adminNote?: string;
  processedBy?: number;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalRequestDto {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

// ============================================================
// API Functions
// ============================================================

/**
 * ดึงยอดเงินคงเหลือของร้านค้า
 */
export const getStoreWalletBalance = async (
  storeId: number,
): Promise<StoreWallet> => {
  const res = await client.get(`/store-wallet/balance/${storeId}`);
  const data: any = res?.data ?? res;

  return {
    id: data.walletId ?? data.id ?? 0,
    storeId: data.storeId ?? storeId,
    balance: Number(data.balance ?? 0),
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  };
};

/**
 * ดึงประวัติธุรกรรมของร้านค้า
 */
export const getStoreTransactions = async (
  storeId: number,
): Promise<StoreWalletTransaction[]> => {
  const res = await client.get(`/store-wallet/transactions/${storeId}`);
  const list: any[] = Array.isArray(res) ? res : res?.data ?? [];

  return list.map((t) => ({
    id: t.id,
    walletId: t.walletId,
    amount: Number(t.amount ?? 0),
    type: t.type as StoreTransactionType,
    referenceId: t.referenceId ?? null,
    description: t.description ?? null,
    createdAt: t.createdAt ?? new Date().toISOString(),
  }));
};

/**
 * ดึงประวัติคำขอถอนเงินของร้านค้า
 */
export const getStoreWithdrawalRequests = async (
  storeId: number,
): Promise<StoreWithdrawalRequest[]> => {
  const res = await client.get(`/store-wallet/withdrawals/${storeId}`);
  const list: any[] = Array.isArray(res) ? res : res?.data ?? [];

  return list.map((r) => ({
    id: r.id,
    storeId: r.storeId,
    walletId: r.walletId,
    amount: Number(r.amount ?? 0),
    status: r.status as WithdrawalStatus,
    bankName: r.bankName ?? null,
    accountNumber: r.accountNumber ?? null,
    accountName: r.accountName ?? null,
    proofImage: r.proofImage ?? null,
    adminNote: r.adminNote ?? null,
    processedBy: r.processedBy ?? null,
    processedAt: r.processedAt ?? null,
    createdAt: r.createdAt ?? new Date().toISOString(),
    updatedAt: r.updatedAt ?? new Date().toISOString(),
  }));
};

/**
 * ร้านค้าขอถอนเงิน
 */
export const requestWithdrawal = async (
  storeId: number,
  dto: WithdrawalRequestDto,
): Promise<StoreWithdrawalRequest> => {
  const res = await client.post(`/store-wallet/withdraw/${storeId}`, dto);
  const data: any = res?.data ?? res;

  return {
    id: data.id,
    storeId: data.storeId,
    walletId: data.walletId,
    amount: Number(data.amount ?? 0),
    status: data.status as WithdrawalStatus,
    bankName: data.bankName ?? null,
    accountNumber: data.accountNumber ?? null,
    accountName: data.accountName ?? null,
    proofImage: data.proofImage ?? null,
    adminNote: data.adminNote ?? null,
    processedBy: data.processedBy ?? null,
    processedAt: data.processedAt ?? null,
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  };
};

// ============================================================
// Admin API Functions
// ============================================================

// Extended interface with store info for admin
export interface AdminWithdrawalRequest extends StoreWithdrawalRequest {
  store?: {
    id: number;
    name: string;
    logo?: string;
  };
}

/**
 * [Admin] ดึงรายการคำขอถอนเงินทั้งหมด (สามารถ filter ตาม status)
 */
export const getAdminWithdrawalRequests = async (
  status?: WithdrawalStatus,
): Promise<AdminWithdrawalRequest[]> => {
  const params = status ? { status } : {};
  const res = await client.get('/store-wallet/admin/withdrawals', { params });
  const list: any[] = Array.isArray(res) ? res : res?.data ?? [];

  return list.map((r) => ({
    id: r.id,
    storeId: r.storeId,
    walletId: r.walletId,
    amount: Number(r.amount ?? 0),
    status: r.status as WithdrawalStatus,
    bankName: r.bankName ?? null,
    accountNumber: r.accountNumber ?? null,
    accountName: r.accountName ?? null,
    proofImage: r.proofImage ?? null,
    adminNote: r.adminNote ?? null,
    processedBy: r.processedBy ?? null,
    processedAt: r.processedAt ?? null,
    createdAt: r.createdAt ?? new Date().toISOString(),
    updatedAt: r.updatedAt ?? new Date().toISOString(),
    store: r.store
      ? {
          id: r.store.id,
          name: r.store.name,
          logo: r.store.logo ?? null,
        }
      : undefined,
  }));
};

/**
 * [Admin] ดึงรายละเอียดคำขอถอนเงินตาม ID
 */
export const getAdminWithdrawalDetail = async (
  requestId: number,
): Promise<AdminWithdrawalRequest> => {
  const res = await client.get(`/store-wallet/admin/withdrawal/${requestId}`);
  const r: any = res?.data ?? res;

  return {
    id: r.id,
    storeId: r.storeId,
    walletId: r.walletId,
    amount: Number(r.amount ?? 0),
    status: r.status as WithdrawalStatus,
    bankName: r.bankName ?? null,
    accountNumber: r.accountNumber ?? null,
    accountName: r.accountName ?? null,
    proofImage: r.proofImage ?? null,
    adminNote: r.adminNote ?? null,
    processedBy: r.processedBy ?? null,
    processedAt: r.processedAt ?? null,
    createdAt: r.createdAt ?? new Date().toISOString(),
    updatedAt: r.updatedAt ?? new Date().toISOString(),
    store: r.store
      ? {
          id: r.store.id,
          name: r.store.name,
          logo: r.store.logo ?? null,
        }
      : undefined,
  };
};

/**
 * [Admin] อนุมัติคำขอถอนเงิน (พร้อมอัปโหลดรูปสลิป)
 */
export const approveWithdrawal = async (
  requestId: number,
  proofImageUri: string,
): Promise<AdminWithdrawalRequest> => {
  // สร้าง FormData สำหรับอัปโหลดรูปภาพ
  const formData = new FormData();

  // เพิ่มไฟล์รูปภาพ
  const filename = proofImageUri.split('/').pop() || 'proof.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('proofImage', {
    uri: proofImageUri,
    name: filename,
    type,
  } as any);

  const res = await client.put(
    `/store-wallet/admin/withdrawal/${requestId}/approve`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  const r: any = res?.data ?? res;

  return {
    id: r.id,
    storeId: r.storeId,
    walletId: r.walletId,
    amount: Number(r.amount ?? 0),
    status: r.status as WithdrawalStatus,
    bankName: r.bankName ?? null,
    accountNumber: r.accountNumber ?? null,
    accountName: r.accountName ?? null,
    proofImage: r.proofImage ?? null,
    adminNote: r.adminNote ?? null,
    processedBy: r.processedBy ?? null,
    processedAt: r.processedAt ?? null,
    createdAt: r.createdAt ?? new Date().toISOString(),
    updatedAt: r.updatedAt ?? new Date().toISOString(),
    store: r.store
      ? {
          id: r.store.id,
          name: r.store.name,
          logo: r.store.logo ?? null,
        }
      : undefined,
  };
};

/**
 * [Admin] ปฏิเสธคำขอถอนเงิน
 */
export const rejectWithdrawal = async (
  requestId: number,
  reason: string,
): Promise<AdminWithdrawalRequest> => {
  const res = await client.put(
    `/store-wallet/admin/withdrawal/${requestId}/reject`,
    { reason },
  );

  const r: any = res?.data ?? res;

  return {
    id: r.id,
    storeId: r.storeId,
    walletId: r.walletId,
    amount: Number(r.amount ?? 0),
    status: r.status as WithdrawalStatus,
    bankName: r.bankName ?? null,
    accountNumber: r.accountNumber ?? null,
    accountName: r.accountName ?? null,
    proofImage: r.proofImage ?? null,
    adminNote: r.adminNote ?? null,
    processedBy: r.processedBy ?? null,
    processedAt: r.processedAt ?? null,
    createdAt: r.createdAt ?? new Date().toISOString(),
    updatedAt: r.updatedAt ?? new Date().toISOString(),
    store: r.store
      ? {
          id: r.store.id,
          name: r.store.name,
          logo: r.store.logo ?? null,
        }
      : undefined,
  };
};
