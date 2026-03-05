-- ===========================================
-- เพิ่มสินค้าให้ร้านค้า Mall ทั้งหมด (ID 11-20)
-- Mall Store 1 = ID 11, Mall Store 2 = ID 12, ... Mall Store 10 = ID 20
-- ===========================================

-- ดูร้านค้า Mall ที่มี
SELECT id, name, isMall FROM store WHERE isMall = 1;

-- ===========================================
-- เพิ่มสินค้าให้ Mall Store 1 (ID 11)
-- ===========================================
INSERT INTO
    product (
        title,
        description,
        price,
        quantity,
        sold,
        categoryId,
        storeId,
        isActive
    )
VALUES (
        'iPhone 15 Pro Max',
        'สมาร์ทโฟนแอปเปิ้ลรุ่นใหม่ล่าสุด',
        48900.00,
        100,
        50,
        1,
        11,
        1
    ),
    (
        'MacBook Pro M3',
        'แล็ปท็อปสำหรับมืออาชีพ',
        79900.00,
        50,
        20,
        1,
        11,
        1
    ),
    (
        'AirPods Pro 2',
        'หูฟังไร้สายระดับพรีเมียม',
        8990.00,
        200,
        150,
        1,
        11,
        1
    );

-- ===========================================
-- เพิ่มสินค้าให้ Mall Store 2 (ID 12)
-- ===========================================
INSERT INTO
    product (
        title,
        description,
        price,
        quantity,
        sold,
        categoryId,
        storeId,
        isActive
    )
VALUES (
        'Samsung Galaxy S24 Ultra',
        'สมาร์ทโฟนซัมซุงรุ่นท็อป',
        42900.00,
        80,
        35,
        1,
        12,
        1
    ),
    (
        'Samsung Galaxy Watch 6',
        'นาฬิกาอัจฉริยะซัมซุง',
        12900.00,
        60,
        25,
        1,
        12,
        1
    ),
    (
        'Samsung Galaxy Buds Pro',
        'หูฟังไร้สายซัมซุง',
        6990.00,
        100,
        45,
        1,
        12,
        1
    );

-- ===========================================
-- เพิ่มสินค้าให้ Mall Store 3 (ID 13)
-- ===========================================
INSERT INTO
    product (
        title,
        description,
        price,
        quantity,
        sold,
        categoryId,
        storeId,
        isActive
    )
VALUES (
        'Nike Air Max 270',
        'รองเท้าวิ่ง Nike สีขาว-ดำ',
        5990.00,
        50,
        30,
        2,
        13,
        1
    ),
    (
        'Nike Dri-FIT T-Shirt',
        'เสื้อยืดกีฬา Nike',
        1290.00,
        100,
        60,
        2,
        13,
        1
    ),
    (
        'Nike Pro Shorts',
        'กางเกงขาสั้นออกกำลังกาย',
        990.00,
        80,
        40,
        2,
        13,
        1
    );

-- ===========================================
-- เพิ่มสินค้าให้ Mall Store 4 (ID 14)
-- ===========================================
INSERT INTO
    product (
        title,
        description,
        price,
        quantity,
        sold,
        categoryId,
        storeId,
        isActive
    )
VALUES (
        'Adidas Ultraboost 23',
        'รองเท้าวิ่ง Adidas',
        6490.00,
        60,
        25,
        2,
        14,
        1
    ),
    (
        'Adidas Originals Cap',
        'หมวกแก๊ป Adidas',
        890.00,
        100,
        70,
        2,
        14,
        1
    ),
    (
        'Adidas Training Bag',
        'กระเป๋ากีฬา Adidas',
        1890.00,
        40,
        20,
        2,
        14,
        1
    );

-- ===========================================
-- เพิ่มสินค้าให้ Mall Store 5 (ID 15)
-- ===========================================
INSERT INTO
    product (
        title,
        description,
        price,
        quantity,
        sold,
        categoryId,
        storeId,
        isActive
    )
VALUES (
        'Sony WH-1000XM5',
        'หูฟังครอบหู Sony ตัดเสียงรบกวน',
        12990.00,
        40,
        20,
        1,
        15,
        1
    ),
    (
        'Sony PlayStation 5',
        'เครื่องเล่นเกม PS5',
        17990.00,
        30,
        15,
        1,
        15,
        1
    ),
    (
        'Sony SRS-XB43',
        'ลำโพงบลูทูธ Sony',
        5990.00,
        50,
        25,
        1,
        15,
        1
    );

-- ===========================================
-- เพิ่มสินค้าให้ Mall Store 6 (ID 16)
-- ===========================================
INSERT INTO
    product (
        title,
        description,
        price,
        quantity,
        sold,
        categoryId,
        storeId,
        isActive
    )
VALUES (
        'LG OLED TV 55"',
        'ทีวี OLED 4K LG',
        39900.00,
        20,
        10,
        1,
        16,
        1
    ),
    (
        'LG InstaView Refrigerator',
        'ตู้เย็นอัจฉริยะ LG',
        59900.00,
        15,
        8,
        1,
        16,
        1
    ),
    (
        'LG Tone Free Earbuds',
        'หูฟังไร้สาย LG',
        4990.00,
        60,
        35,
        1,
        16,
        1
    );

-- ===========================================
-- เพิ่มสินค้าให้ Mall Store 7 (ID 17)
-- ===========================================
INSERT INTO
    product (
        title,
        description,
        price,
        quantity,
        sold,
        categoryId,
        storeId,
        isActive
    )
VALUES (
        'Xiaomi 14 Pro',
        'สมาร์ทโฟน Xiaomi รุ่นท็อป',
        28900.00,
        70,
        40,
        1,
        17,
        1
    ),
    (
        'Xiaomi Smart Band 8',
        'สายรัดข้อมืออัจฉริยะ',
        1290.00,
        150,
        100,
        1,
        17,
        1
    ),
    (
        'Xiaomi Robot Vacuum',
        'หุ่นยนต์ดูดฝุ่น Xiaomi',
        8990.00,
        40,
        20,
        1,
        17,
        1
    );

-- ===========================================
-- เพิ่มสินค้าให้ Mall Store 8 (ID 18)
-- ===========================================
INSERT INTO
    product (
        title,
        description,
        price,
        quantity,
        sold,
        categoryId,
        storeId,
        isActive
    )
VALUES (
        'Dell XPS 15',
        'แล็ปท็อป Dell พรีเมียม',
        54900.00,
        30,
        15,
        1,
        18,
        1
    ),
    (
        'Dell 27" Monitor 4K',
        'จอมอนิเตอร์ Dell 4K',
        15900.00,
        50,
        25,
        1,
        18,
        1
    ),
    (
        'Dell Wireless Mouse',
        'เมาส์ไร้สาย Dell',
        990.00,
        100,
        60,
        1,
        18,
        1
    );

-- ===========================================
-- เพิ่มสินค้าให้ Mall Store 9 (ID 19)
-- ===========================================
INSERT INTO
    product (
        title,
        description,
        price,
        quantity,
        sold,
        categoryId,
        storeId,
        isActive
    )
VALUES (
        'HP Spectre x360',
        'แล็ปท็อป HP พรีเมียม 2-in-1',
        49900.00,
        25,
        12,
        1,
        19,
        1
    ),
    (
        'HP LaserJet Pro',
        'เครื่องปริ้นเตอร์ HP',
        8990.00,
        40,
        20,
        1,
        19,
        1
    ),
    (
        'HP Wireless Keyboard',
        'คีย์บอร์ดไร้สาย HP',
        1290.00,
        80,
        45,
        1,
        19,
        1
    );

-- ===========================================
-- เพิ่มสินค้าให้ Mall Store 10 (ID 20)
-- ===========================================
INSERT INTO
    product (
        title,
        description,
        price,
        quantity,
        sold,
        categoryId,
        storeId,
        isActive
    )
VALUES (
        'Lenovo ThinkPad X1 Carbon',
        'แล็ปท็อปธุรกิจ Lenovo',
        59900.00,
        20,
        10,
        1,
        20,
        1
    ),
    (
        'Lenovo Legion Gaming Mouse',
        'เมาส์เกมมิ่ง Lenovo',
        1990.00,
        70,
        40,
        1,
        20,
        1
    ),
    (
        'Lenovo Smart Clock',
        'นาฬิกาอัจฉริยะ Lenovo',
        2990.00,
        50,
        30,
        1,
        20,
        1
    );

-- ===========================================
-- ตรวจสอบผลลัพธ์ - ดูสินค้าของร้าน Mall ทั้งหมด
-- ===========================================
SELECT p.id, p.title, p.price, p.storeId, s.name as storeName
FROM product p
    JOIN store s ON p.storeId = s.id
WHERE
    s.isMall = 1
ORDER BY s.id, p.id;