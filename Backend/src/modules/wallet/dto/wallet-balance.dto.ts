import { WalletStatus } from '@core/database/entities';

export class WalletBalanceResponseDto {
  userId: number;
  balance: string;
  status: WalletStatus;
}

