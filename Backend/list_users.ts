import * as mysql from 'mysql2/promise';

async function listUsers() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'ecom1'
    });

    try {
        const [rows] = await connection.execute('SELECT id, email, role, password FROM user');
        console.log('Users in DB:');
        (rows as any[]).forEach(u => {
            console.log(`ID: ${u.id}, Email: ${u.email}, Role: ${u.role}, Pwd: ${u.password ? 'HASHED' : 'NULL'}`);
        });
    } catch (err) {
        console.error('Error fetching users:', err);
    } finally {
        await connection.end();
    }
}

listUsers();
