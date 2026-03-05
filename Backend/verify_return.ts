import axios, { AxiosError } from 'axios';

const BASE_URL = 'http://localhost:3000';
const CUSTOMER_EMAIL = 'user@gmail.com';
const CUSTOMER_PASS = '12345678';
const SELLER_EMAIL = 'seller1@gmail.com';
const SELLER_PASS = '12345678';

async function login(email: string, password: string): Promise<string | null> {
    try {
        console.log(`Trying to login as ${email}...`);
        const res = await axios.post(`${BASE_URL}/auth/login`, { email, password });
        console.log(`Login success for ${email}`);
        // console.log('Response keys:', Object.keys(res.data)); 
        const token = res.data.access_token || res.data.data?.access_token;
        if (!token) console.log('⚠️ No access_token found in response:', JSON.stringify(res.data).substring(0, 100));
        return token;
    } catch (err) {
        const error = err as AxiosError<{ message?: string }>;
        console.log(`❌ Login failed for ${email}: STATUS=${error.response?.status} MSG=${error.response?.data?.message || error.message}`);
        return null;
    }
}

async function runTest() {
    console.log('🚀 Starting Return Flow Verification (Manual Run)...');

    // 1. Login
    const userToken = await login(CUSTOMER_EMAIL, CUSTOMER_PASS);
    const sellerToken = await login(SELLER_EMAIL, SELLER_PASS);

    if (!userToken || !sellerToken) {
        console.error('❌ Login failed. Cannot proceed.');
        return;
    }
    console.log('✅ Logged in successfully.');

    // 2. Find eligible order
    let orderId = null;
    let orderItemId = null;
    try {
        const ordersRes = await axios.get(`${BASE_URL}/orders`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        const orders = ordersRes.data.data || ordersRes.data;

        // Find COMPLETED order first, or any order with items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const order = orders.find((o: any) => o.items && o.items.length > 0 && (o.status === 'COMPLETED' || o.status === 'SHIPPED'));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyOrder = orders.find((o: any) => o.items && o.items.length > 0);

        const targetOrder = order || anyOrder;

        if (targetOrder) {
            orderId = targetOrder.id;
            orderItemId = targetOrder.items[0].id; // productOnOrder ID
            console.log(`✅ Using Order #${orderId} (Status: ${targetOrder.status})`);
        } else {
            console.log('⚠️ No eligible order found. Create one manually first in the App.');
            return;
        }
    } catch (err) {
        const error = err as Error;
        console.error('❌ Failed to fetch orders:', error.message);
        return;
    }

    // 3. Request Return
    let returnId = null;
    try {
        console.log(`📦 Requesting return for Order #${orderId}...`);
        const returnRes = await axios.post(`${BASE_URL}/orders/${orderId}/returns`, {
            reasonCode: 'WRONG_ITEM',
            reasonText: 'User verified return ' + new Date().toLocaleTimeString(),
            items: [{ orderItemId: orderItemId, quantity: 1 }]
        }, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log('✅ Return Requested. ID:', returnRes.data.id);
        returnId = returnRes.data.id;
    } catch (err) {
        const error = err as AxiosError<{ message?: string }>;
        if (error.response?.data?.message?.includes('Duplicate') || error.response?.status === 400) {
            console.log('⚠️ Return request failed (might be duplicate). Checking existing...');
            try {
                const myReturns = await axios.get(`${BASE_URL}/orders/${orderId}/returns`, {
                    headers: { Authorization: `Bearer ${userToken}` }
                });
                const existing = myReturns.data.find((r: { status: string, id: number }) => r.status === 'REQUESTED');
                if (existing) {
                    returnId = existing.id;
                    console.log(`✅ Found existing PENDING return #${returnId}`);
                } else {
                    console.log('❌ No PENDING returns found for this order.');
                }
            } catch (e) { console.error('Error finding existing return', (e as Error).message) }
        } else {
            console.error('❌ Request Return Failed:', error.response?.data || error.message);
        }
    }

    // 4. Seller Approve
    if (returnId) {
        try {
            console.log(`📝 Seller Approving Return #${returnId}...`);
            const approveRes = await axios.patch(`${BASE_URL}/seller/returns/${returnId}/status`, {
                status: 'APPROVED',
                note: 'Approved by manual script run'
            }, {
                headers: { Authorization: `Bearer ${sellerToken}` }
            });
            console.log('✅ SUCCESS: Return status changed to:', approveRes.data.status);
        } catch (err) {
            const error = err as AxiosError<{ message?: string }>;
            console.error('❌ Approval Failed:', error.response?.data || error.message);
        }
    }
}

runTest();
