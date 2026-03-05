const mysql = require('mysql2');

console.log('🔄 กำลังทดสอบการเชื่อมต่อ...');

const connection = mysql.createConnection({
    host: 'localhost',  // ลองใช้ localhost
    port: 3307,         // พอร์ตที่เราตั้งใน XAMPP
    user: 'root',
    password: '',       // ปกติ XAMPP รหัสจะว่าง
    database: 'ecom1',  // ชื่อฐานข้อมูลของคุณ
    connectTimeout: 10000, // timeout 10 วินาที
});

connection.connect(function (err) {
    if (err) {
        console.error('❌ เชื่อมต่อไม่ได้! สาเหตุ: ' + err.stack);
        return;
    }
    console.log('✅ เย้! เชื่อมต่อ Database สำเร็จแล้ว (Thread ID: ' + connection.threadId + ')');
    console.log('🎉 สรุป: Database ปกติ ปัญหาอยู่ที่ NestJS Config');
    connection.end();
});
