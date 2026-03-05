import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DefaultNamingStrategy } from 'typeorm';
import * as entities from './entities';

// Custom naming strategy ที่ไม่แปลง camelCase เป็น snake_case
class CamelCaseNamingStrategy extends DefaultNamingStrategy {
  columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
    // ถ้ามี customName (name option) ให้ใช้ customName
    if (customName) {
      return customName;
    }
    // ถ้าไม่มี customName ให้ใช้ propertyName ตามเดิม (ไม่แปลงเป็น snake_case)
    return propertyName;
  }
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Extract all entity classes from the entities object
        const entityClasses = Object.values(entities).filter(
          (entity) => typeof entity === 'function' && entity.prototype?.constructor?.name
        ) as any[];

        return {
          type: 'mysql',
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_DATABASE'),
          entities: entityClasses,
          synchronize: configService.get<boolean>('DB_SYNCHRONIZE', true),
          logging: false,
          namingStrategy: new CamelCaseNamingStrategy(), // ใช้ custom naming strategy
        };
      },
    }),
  ],
})
export class DatabaseModule { }

