import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { RemindersController } from './reminders.controller';
import { RemindersConsumer } from './reminders.processor';
import { RemindersService } from './reminders.service';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'reminder',
      defaultJobOptions: {
        removeOnComplete: true,
      },
    }),
    NotificationModule,
  ],
  providers: [RemindersService, RemindersConsumer],
  controllers: [RemindersController],
  exports: [RemindersService],
})
export class RemindersModule {}
