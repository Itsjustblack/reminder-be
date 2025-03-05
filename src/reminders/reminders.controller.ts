import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotificationService } from 'src/notification/notification.service';
import { PushSubscription } from 'web-push';
import { RemindersService } from './reminders.service';

@Controller('reminders')
export class RemindersController {
  constructor(
    private readonly remindersService: RemindersService,
    private readonly notificationService: NotificationService,
  ) {}

  @Post('create')
  create(@Body() createReminderDto: Prisma.ReminderCreateInput) {
    return this.remindersService.create(createReminderDto);
  }

  @Get()
  findAll() {
    return this.remindersService.findAll();
  }

  @Post('subscribe')
  subscribeToNotificationService(
    @Body()
    subscription: PushSubscription,
  ) {
    return this.notificationService.subscribeToPushNotification(subscription);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateReminderDto: Prisma.ReminderUpdateInput,
  ) {
    return this.remindersService.update(id, updateReminderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.remindersService.delete(id);
  }
}
