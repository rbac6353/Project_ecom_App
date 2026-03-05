import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Order } from '@core/database/entities';

@Injectable()
export class InvoiceService {
  // ฟังก์ชันสร้าง PDF Stream
  async generateInvoice(order: Order): Promise<Buffer> {
    const pdfBuffer: Buffer = await new Promise((resolve) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      // --- เริ่มวาด PDF ---

      // 1. Header
      doc.fontSize(20).text('INVOICE / RECEIPT', { align: 'center' });
      doc.moveDown();

      // 2. ข้อมูลร้านค้า & ลูกค้า
      doc.fontSize(10).text('GTXShop Co., Ltd.', 50, 100);
      doc.text('123 Tech Road, Bangkok, Thailand');
      doc.text('Tel: 02-123-4567 | Email: info@gtxshop.com');
      doc.moveDown();

      const customerName =
        (order.orderedBy as any)?.name ||
        (order.orderedBy as any)?.email ||
        'Customer';
      doc.text(`Customer: ${customerName}`, { align: 'right' });
      doc.text(`Order ID: #${order.id}`, { align: 'right' });
      doc.text(
        `Date: ${new Date(order.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`,
        { align: 'right' },
      );

      doc.moveDown();

      // 3. เส้นคั่น
      doc.moveTo(50, 200).lineTo(550, 200).stroke();
      doc.moveDown();

      // 4. รายการสินค้า (Table Header)
      let y = 230;
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('Item', 50, y);
      doc.text('Qty', 350, y, { width: 90, align: 'right' });
      doc.text('Price', 440, y, { width: 90, align: 'right' });
      doc.font('Helvetica').fontSize(10);

      y += 20;

      // 5. Loop สินค้า
      const items = order.productOnOrders || [];
      items.forEach((item: any) => {
        const productName =
          item.product?.title || item.product?.name || 'Unknown Product';
        const variantName = item.variant ? ` (${item.variant.name})` : '';
        const fullName = productName + variantName;

        // แบ่งข้อความถ้ายาวเกิน
        const maxWidth = 280;
        const lines = doc.heightOfString(fullName, { width: maxWidth });
        if (lines > 1) {
          doc.text(fullName, 50, y, { width: maxWidth });
        } else {
          doc.text(fullName, 50, y);
        }

        doc.text(item.count.toString(), 350, y, {
          width: 90,
          align: 'right',
        });
        doc.text(`฿${Number(item.price).toFixed(2)}`, 440, y, {
          width: 90,
          align: 'right',
        });

        // คำนวณ y สำหรับบรรทัดถัดไป (ถ้ามีหลายบรรทัด)
        y += Math.max(20, lines * 15);
      });

      // 6. เส้นรวมเงิน
      doc.moveTo(50, y + 10).lineTo(550, y + 10).stroke();
      y += 30;

      // 7. สรุปยอด
      const subtotal = order.cartTotal || 0;
      const discount = order.discountAmount || 0;
      const shipping = 0; // รวมในราคาแล้ว
      const grandTotal = subtotal - discount + shipping;

      doc.font('Helvetica').fontSize(10);
      doc.text(`Subtotal: ฿${subtotal.toFixed(2)}`, 300, y, {
        align: 'right',
      });
      if (discount > 0) {
        y += 15;
        doc.text(`Discount: -฿${discount.toFixed(2)}`, 300, y, {
          align: 'right',
        });
      }
      if (shipping > 0) {
        y += 15;
        doc.text(`Shipping: ฿${shipping.toFixed(2)}`, 300, y, {
          align: 'right',
        });
      }
      y += 15;
      doc.moveTo(300, y).lineTo(550, y).stroke();
      y += 10;

      // 8. ยอดรวม
      doc.font('Helvetica-Bold').fontSize(14);
      doc.text(`Grand Total: ฿${grandTotal.toFixed(2)}`, 300, y, {
        align: 'right',
      });

      // 9. ข้อมูลการจัดส่ง
      y += 40;
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('Shipping Address:', 50, y);
      y += 15;
      doc.font('Helvetica').fontSize(9);
      if (order.shippingAddress) {
        doc.text(order.shippingAddress, 50, y, { width: 500 });
        y += 15;
      }
      if (order.shippingPhone) {
        doc.text(`Phone: ${order.shippingPhone}`, 50, y);
        y += 15;
      }

      // 10. Footer
      doc.fontSize(10).text(
        'Thank you for your business!',
        50,
        700,
        { align: 'center', width: 500 },
      );
      doc.fontSize(8).text(
        'This is an automated invoice. For inquiries, please contact support@gtxshop.com',
        50,
        720,
        { align: 'center', width: 500 },
      );

      doc.end();
    });

    return pdfBuffer;
  }
}

