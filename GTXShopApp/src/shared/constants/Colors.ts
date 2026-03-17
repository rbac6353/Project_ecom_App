// 🌅 Night Light / Warm Orange Theme
// สีพื้นหลังส้มอ่อนๆ แบบโหมด Night Light ที่นุ่มนวลต่อสายตา - พื้นหลังอ่อนลง

export const Colors = {
  light: {
    // === พื้นหลังหลัก (Warm Orange Tones) - อ่อนลง ===
    background: '#FFFBF7',        // ส้มอ่อนมาก (พื้นหลังหน้าจอ) - อ่อนลงจาก #FFF5EB
    backgroundSecondary: '#FFF8F3', // ส้มครีม (พื้นหลังส่วนย่อย) - อ่อนลง

    // === Card & Surface - อ่อนลง ===
    card: '#FFFDFB',              // ขาวครีมอุ่น (Card สินค้า) - อ่อนลง
    cardHover: '#FFF8F0',         // ส้มอ่อนเล็กน้อยเมื่อ hover - อ่อนลง

    // === Primary Colors ===
    primary: '#FF8C42',           // สีส้มหลัก (ปุ่ม, ราคา)
    primaryLight: '#FFB574',      // ส้มอ่อน (hover state)
    primaryDark: '#E67A32',       // ส้มเข้ม (pressed state)

    // === Text Colors ===
    text: '#000000',              // สีดำ (ข้อความหลัก)
    subText: '#000000',           // สีดำ (ข้อความรอง)
    textLight: '#000000',         // สีดำ (hint text)

    // === Accent Colors ===
    heart: '#FF6B6B',             // แดงอมส้ม (Heart Icon)
    success: '#FFA94D',           // ส้มทอง (Success state)
    warning: '#FFB84D',           // ส้มเหลือง (Warning)

    // === Borders & Dividers ===
    border: '#FFE4CC',            // ส้มอ่อนมาก (เส้นขอบ) - ไม่คมชัด
    divider: '#FFEBD9',           // ส้มครีม (เส้นแบ่ง)

    // === Shadows ===
    shadow: 'rgba(255, 140, 66, 0.15)',  // เงาส้มอ่อน - ไม่คมชัดจนเกินไป
    shadowLight: 'rgba(255, 140, 66, 0.1)',  // เงาส้มอ่อน
    shadowMedium: 'rgba(255, 140, 66, 0.15)', // เงาส้มปานกลาง
    shadowDark: 'rgba(139, 115, 85, 0.2)',    // เงาน้ำตาล

    // === Input & Search - อ่อนลง ===
    inputBg: '#FFFCF9',           // ขาวครีมอุ่นสำหรับ Input - อ่อนลง
    inputBorder: '#FFE4CC',       // เส้นขอบ Input
    placeholder: '#000000',      // สีข้อความ Placeholder (สีดำ)

    // === Tab & Navigation ===
    tabActive: '#FF8C42',         // สีแท็บที่เลือก
    tabInactive: '#FFD4A8',       // สีแท็บที่ไม่ได้เลือก
    tabBackground: '#FFFBF7',     // พื้นหลังแท็บ - อ่อนลง

    // === Icon Colors ===
    icon: '#000000',              // ไอคอนใช้สีดำ

    // === Status Colors (Warm Tones) ===
    pending: '#FFB366',           // ส้มทอง (รอดำเนินการ)
    processing: '#FFA64D',        // ส้มเข้ม (กำลังดำเนินการ)
    shipped: '#99CC99',           // เขียวอมส้ม (จัดส่งแล้ว)
    delivered: '#85C285',         // เขียวอุ่น (ส่งสำเร็จ)
    cancelled: '#D9A58A',         // น้ำตาลส้ม (ยกเลิก)
  },
  dark: {
    // === พื้นหลังหลัก (Dark Tones) ===
    background: '#121212',
    backgroundSecondary: '#1A1A1A',

    // === Card & Surface ===
    card: '#1E1E1E',
    cardHover: '#2A2A2A',

    // === Primary Colors ===
    primary: '#FF8C42',
    primaryLight: '#FFB574',
    primaryDark: '#E67A32',

    // === Text Colors (สีขาว/สว่าง บนพื้นหลังเข้ม) ===
    text: '#FFFFFF',              // ขาว (ข้อความหลัก)
    subText: '#B0B0B0',           // เทาอ่อน (ข้อความรอง)
    textLight: '#808080',         // เทากลาง (hint text)

    // === Accent Colors ===
    heart: '#FF6B6B',
    success: '#FFA94D',
    warning: '#FFB84D',

    // === Borders & Dividers ===
    border: '#333333',
    divider: '#333333',

    // === Shadows ===
    shadow: 'rgba(0,0,0,0.3)',
    shadowLight: 'rgba(0,0,0,0.2)',
    shadowMedium: 'rgba(0,0,0,0.3)',
    shadowDark: 'rgba(0,0,0,0.4)',

    // === Input & Search ===
    inputBg: '#2A2A2A',
    inputBorder: '#444444',
    placeholder: '#808080',       // เทากลาง (Placeholder)

    // === Tab & Navigation ===
    tabActive: '#FF8C42',
    tabInactive: '#666666',
    tabBackground: '#121212',

    // === Icon Colors ===
    icon: '#FFFFFF',              // ไอคอนสีขาว

    // === Status Colors ===
    pending: '#FFB366',
    processing: '#FFA64D',
    shipped: '#99CC99',
    delivered: '#85C285',
    cancelled: '#D9A58A',
  },
};

