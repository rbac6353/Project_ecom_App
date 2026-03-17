/**
 * formatters.ts
 * Helper functions สำหรับจัดรูปแบบการแสดงผล (Currency, Date, Status)
 */

// ============================================================
// Currency Formatting
// ============================================================

/**
 * จัดรูปแบบตัวเลขเป็นสกุลเงินบาทไทย
 * @param amount - จำนวนเงิน (number หรือ string)
 * @param showSymbol - แสดงสัญลักษณ์ ฿ หรือไม่ (default: true)
 * @returns string เช่น "฿1,250.00" หรือ "1,250.00"
 */
export const formatCurrency = (
  amount: number | string | null | undefined,
  showSymbol: boolean = true,
): string => {
  const numAmount = Number(amount ?? 0);

  if (isNaN(numAmount)) {
    return showSymbol ? '฿0.00' : '0.00';
  }

  const formatted = numAmount.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return showSymbol ? `฿${formatted}` : formatted;
};

/**
 * จัดรูปแบบตัวเลขเป็นสกุลเงินพร้อมเครื่องหมาย +/-
 * @param amount - จำนวนเงิน
 * @returns string เช่น "+฿500.00" หรือ "-฿200.00"
 */
export const formatCurrencyWithSign = (
  amount: number | string | null | undefined,
): string => {
  const numAmount = Number(amount ?? 0);

  if (isNaN(numAmount)) {
    return '฿0.00';
  }

  const formatted = Math.abs(numAmount).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (numAmount > 0) {
    return `+฿${formatted}`;
  } else if (numAmount < 0) {
    return `-฿${formatted}`;
  }
  return `฿${formatted}`;
};

// ============================================================
// Date Formatting (Thai)
// ============================================================

// เดือนภาษาไทยแบบย่อ
const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

// เดือนภาษาไทยแบบเต็ม
const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

// วันในสัปดาห์ภาษาไทย
const THAI_DAYS = [
  'อาทิตย์',
  'จันทร์',
  'อังคาร',
  'พุธ',
  'พฤหัสบดี',
  'ศุกร์',
  'เสาร์',
];

/**
 * จัดรูปแบบวันที่เป็นภาษาไทยแบบย่อ
 * @param dateString - วันที่ในรูปแบบ ISO string
 * @returns string เช่น "20 มี.ค. 67 14:30"
 */
export const formatThaiDate = (
  dateString: string | Date | null | undefined,
): string => {
  if (!dateString) return '-';

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return '-';
    }

    const day = date.getDate();
    const month = THAI_MONTHS_SHORT[date.getMonth()];
    const year = (date.getFullYear() + 543) % 100; // พ.ศ. แบบย่อ
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day} ${month} ${year} ${hours}:${minutes}`;
  } catch {
    return '-';
  }
};

/**
 * จัดรูปแบบวันที่เป็นภาษาไทยแบบเต็ม
 * @param dateString - วันที่ในรูปแบบ ISO string
 * @returns string เช่น "วันจันทร์ที่ 20 มีนาคม 2567 เวลา 14:30 น."
 */
export const formatThaiDateFull = (
  dateString: string | Date | null | undefined,
): string => {
  if (!dateString) return '-';

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return '-';
    }

    const dayName = THAI_DAYS[date.getDay()];
    const day = date.getDate();
    const month = THAI_MONTHS_FULL[date.getMonth()];
    const year = date.getFullYear() + 543; // พ.ศ.
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `วัน${dayName}ที่ ${day} ${month} ${year} เวลา ${hours}:${minutes} น.`;
  } catch {
    return '-';
  }
};

/**
 * จัดรูปแบบวันที่เป็นภาษาไทยแบบกลาง (ไม่มีเวลา)
 * @param dateString - วันที่ในรูปแบบ ISO string
 * @returns string เช่น "20 มีนาคม 2567"
 */
export const formatThaiDateMedium = (
  dateString: string | Date | null | undefined,
): string => {
  if (!dateString) return '-';

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return '-';
    }

    const day = date.getDate();
    const month = THAI_MONTHS_FULL[date.getMonth()];
    const year = date.getFullYear() + 543; // พ.ศ.

    return `${day} ${month} ${year}`;
  } catch {
    return '-';
  }
};

// ============================================================
// Status Helpers
// ============================================================

export type WithdrawalStatusType = 'PENDING' | 'APPROVED' | 'REJECTED';
export type TransactionType = 'SALE_REVENUE' | 'WITHDRAWAL' | 'ADJUSTMENT';

export interface StatusStyle {
  label: string;
  color: string;
  bgColor: string;
  icon?: string;
}

/**
 * รับข้อมูล style สำหรับ Withdrawal Status
 */
export const getWithdrawalStatusStyle = (status: WithdrawalStatusType): StatusStyle => {
  switch (status) {
    case 'PENDING':
      return {
        label: 'รออนุมัติ',
        color: '#E65100', // Dark Orange
        bgColor: '#FFF3E0', // Light Orange
        icon: 'time',
      };
    case 'APPROVED':
      return {
        label: 'อนุมัติแล้ว',
        color: '#1B5E20', // Dark Green
        bgColor: '#E8F5E9', // Light Green
        icon: 'checkmark-circle',
      };
    case 'REJECTED':
      return {
        label: 'ปฏิเสธ',
        color: '#B71C1C', // Dark Red
        bgColor: '#FFEBEE', // Light Red
        icon: 'close-circle',
      };
    default:
      return {
        label: status,
        color: '#616161', // Grey
        bgColor: '#F5F5F5', // Light Grey
        icon: 'help-circle',
      };
  }
};

/**
 * รับข้อมูล style สำหรับ Transaction Type
 */
export const getTransactionTypeStyle = (type: TransactionType): StatusStyle => {
  switch (type) {
    case 'SALE_REVENUE':
      return {
        label: 'รายได้จากการขาย',
        color: '#00796B', // Teal
        bgColor: '#E0F2F1', // Light Teal
        icon: 'arrow-down',
      };
    case 'WITHDRAWAL':
      return {
        label: 'ถอนเงิน',
        color: '#C62828', // Dark Red
        bgColor: '#FFEBEE', // Light Red
        icon: 'arrow-up',
      };
    case 'ADJUSTMENT':
      return {
        label: 'ปรับยอด',
        color: '#1565C0', // Blue
        bgColor: '#E3F2FD', // Light Blue
        icon: 'swap-horizontal',
      };
    default:
      return {
        label: type,
        color: '#616161', // Grey
        bgColor: '#F5F5F5', // Light Grey
        icon: 'help-circle',
      };
  }
};

/**
 * รับสีสำหรับ Amount (บวก/ลบ)
 */
export const getAmountColor = (amount: number | string): string => {
  const numAmount = Number(amount ?? 0);
  if (numAmount > 0) return '#2E7D32'; // Green
  if (numAmount < 0) return '#C62828'; // Red
  return '#616161'; // Grey
};
