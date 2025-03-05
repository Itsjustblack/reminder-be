import { Injectable, OnModuleInit } from '@nestjs/common';
import { RemindersService } from './reminders/reminders.service';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(private readonly remindersService: RemindersService) {}

  async onModuleInit() {
    await this.remindersService.handleMissedReminders();
  }
}
