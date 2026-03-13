export type OrderReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'REFUNDED'
  | 'CANCELLED';

export interface OrderReturnItem {
  id: number;
  orderReturnId: number;
  orderItemId: number;
  quantity: number;
  unitPrice: number;
  // ข้อมูลสินค้า (optional – ขึ้นกับ backend จะส่ง relations มาด้วยหรือไม่)
  productName?: string;
  productImageUrl?: string;
  // raw relation จาก backend เผื่อใช้ในกรณีพิเศษ
  orderItem?: any;
}

export interface OrderReturn {
  id: number;
  orderId: number;
  userId: number;
  status: OrderReturnStatus;

  reasonCode: string | null;
  reasonText: string | null;

  // ใน DB เป็น TEXT เก็บ JSON string → ฝั่ง client ใช้ string[] เสมอ
  images: string[];

  refundAmount: number | null;
  adminNote: string | null;
  resolvedAt: string | null;

  createdAt: string;
  updatedAt: string;

  // สรุปคำสั่งซื้อแบบย่อ (ถ้า backend ส่ง relation order มาด้วย)
  orderSummary?: {
    code?: string;
    total?: number;
  };

  // ชื่อลูกค้า (ถ้ามี relation user)
  userName?: string;

  items?: OrderReturnItem[];
}

// payload ที่ client ใช้ตอนยิง request คืนสินค้า
export interface CreateReturnPayloadItem {
  orderItemId: number;
  quantity: number;
}

export interface CreateReturnPayload {
  reasonCode: string;
  reasonText?: string;
  images?: string[]; // URL หรือ path ที่จะส่งไป backend
  items?: CreateReturnPayloadItem[];
}

export interface UpdateReturnStatusPayload {
  status: OrderReturnStatus;
  refundAmount?: number;
  note?: string;
}

// helper ช่วยแปลง field images จาก raw JSON/STRING → string[]
export function safeParseImages(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === 'string');
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((v) => typeof v === 'string')
        : [value];
    } catch {
      // ถ้า parse ไม่ได้ ให้ถือว่าเป็น single URL
      return [value];
    }
  }
  return [];
}

export function mapOrderReturn(raw: any): OrderReturn {
  const items: OrderReturnItem[] | undefined = Array.isArray(raw?.items)
    ? raw.items.map((it: any) => ({
        id: it.id,
        orderReturnId: it.orderReturnId,
        orderItemId: it.orderItemId,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        productName:
          it.productName ||
          it.orderItem?.product?.title ||
          it.orderItem?.product?.name,
        productImageUrl:
          it.productImageUrl ||
          it.orderItem?.product?.imageUrl ||
          (it.orderItem?.product?.images &&
            it.orderItem.product.images.length > 0
            ? it.orderItem.product.images[0]
            : undefined),
        orderItem: it.orderItem,
      }))
    : undefined;

  const orderSummary = raw.order
    ? {
        code: raw.order.code ?? undefined,
        total:
          raw.order.total != null
            ? Number(raw.order.total)
            : raw.order.cartTotal != null
            ? Number(raw.order.cartTotal)
            : undefined,
      }
    : undefined;

  return {
    id: raw.id,
    orderId: raw.orderId,
    userId: raw.userId,
    status: raw.status,
    reasonCode: raw.reasonCode ?? null,
    reasonText: raw.reasonText ?? null,
    images: raw.images ? safeParseImages(raw.images) : [],
    refundAmount:
      raw.refundAmount != null ? Number(raw.refundAmount) : null,
    adminNote: raw.adminNote ?? null,
    resolvedAt: raw.resolvedAt ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    orderSummary,
    userName: raw.user?.name ?? undefined,
    items,
  };
}

export function mapOrderReturns(list: any[]): OrderReturn[] {
  return Array.isArray(list) ? list.map(mapOrderReturn) : [];
}

