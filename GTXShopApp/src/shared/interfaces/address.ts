export interface Address {
  id: string;
  name: string;       // ชื่อผู้รับ
  phone: string;      // เบอร์โทร
  addressLine: string; // บ้านเลขที่, ซอย, ถนน
  subDistrict: string; // แขวง/ตำบล
  district: string;    // เขต/อำเภอ
  province: string;    // จังหวัด
  postalCode: string;  // รหัสไปรษณีย์
  isDefault: boolean;  // ตั้งเป็นค่าเริ่มต้นหรือไม่
}

