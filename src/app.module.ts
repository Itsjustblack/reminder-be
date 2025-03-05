import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { NotificationModule } from './notification/notification.module';
import { RemindersModule } from './reminders/reminders.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot(),
    BullModule.forRoot({
      connection: {
        url: 'rediss://default:AVNS_-eRz5o8Rhg_LbdPCrOo@valkey-284f87c7-jason-3bf6.c.aivencloud.com:16175',
      },
    }),
    RemindersModule,
    DatabaseModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
