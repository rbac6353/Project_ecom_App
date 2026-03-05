import { WalletTransactionType } from '@core/database/entities';

export class CreditWalletDto {
  amount: number;
  type: WalletTransactionType;
  referenceId?: string;
  description?: string;
}

