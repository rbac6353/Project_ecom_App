
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/modules/app/app.module';
import { DataSource } from 'typeorm';
import { Order } from './src/core/database/entities';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);
    const orderRepo = dataSource.getRepository(Order);

    const trackingNumber = 'KEX7809105S0054';

    console.log('🔍 Finding latest order...');
    const latestOrder = await orderRepo.findOne({
        where: {},
        order: { id: 'DESC' },
    });

    if (!latestOrder) {
        console.error('❌ No orders found in the database. Please create an order first.');
        await app.close();
        process.exit(1);
    }

    console.log(`✅ Found Order ID: ${latestOrder.id}`);
    console.log(`📝 Updating tracking number to: ${trackingNumber}`);

    latestOrder.trackingNumber = trackingNumber;
    // Ensure order is in a state that allows shipping if needed, but for now just updating tracking
    // latestOrder.orderStatus = 'SHIPPED'; // Optional: checking logic might require specific status

    await orderRepo.save(latestOrder);

    console.log('🎉 Update successful!');
    console.log(`👉 You can now scan/enter "${trackingNumber}" in the Courier App.`);

    await app.close();
    process.exit(0);
}

bootstrap();
