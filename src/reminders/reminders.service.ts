import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { DatabaseService } from 'src/database/database.service';
import { ReminderJob } from './reminders.processor';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    @InjectQueue('reminder') private readonly remindersQueue: Queue,
  ) {}

  // Reminder Queue Methods
  private async _addJobToQueue(reminder: ReminderJob): Promise<void> {
    const delay = new Date(reminder.executionDate).getTime() - Date.now();
    await this.remindersQueue.add('reminder', reminder, {
      jobId: reminder.id,
      attempts: 1,
      delay: Math.max(delay, 0),
    });
  }

  private async _updateJobInQueue(reminder: ReminderJob): Promise<void> {
    const jobExists = await this.remindersQueue.getJob(reminder.id);

    if (jobExists) {
      const removed = await this._removeJobFromQueue(reminder);
      if (removed) {
        await this._addJobToQueue(reminder);
      } else {
        this.logger.error(`Unable to update Job => Job Id: ${reminder.id}`);
      }
    } else {
      this.logger.warn(`Job not found in queue => Job Id: ${reminder.id}`);
    }
  }

  private async _removeJobFromQueue(reminder: ReminderJob): Promise<boolean> {
    const removed = await this.remindersQueue.remove(reminder.id);

    if (removed) {
      this.logger.log(`Removed a Job => Job Id: ${reminder.id}`);
    } else {
      this.logger.error(`Unable to remove a Job => Job Id: ${reminder.id}`);
    }

    return Boolean(removed);
  }

  // Handle missed reminders
  async handleMissedReminders(): Promise<void> {
    const missedReminders = await this.databaseService.reminder.findMany({
      where: {
        executionDate: { lte: new Date() },
        status: 'PENDING',
      },
    });

    for (const reminder of missedReminders) {
      this.logger.log(
        `Missed Reminder: ${reminder.title} => ${new Date(reminder.executionDate).toUTCString()}`,
      );
      await this.remindersQueue.add(reminder.title, reminder, { delay: 0 });
    }
  }

  // CRUD Operations
  async create(createReminderDto: Prisma.ReminderCreateInput) {
    if (new Date(createReminderDto.executionDate) < new Date()) {
      throw new BadRequestException('Reminder Date cannot be in the Past');
    }

    const newReminder = await this.databaseService.reminder.create({
      data: createReminderDto,
    });

    await this._addJobToQueue(newReminder);

    return newReminder;
  }

  async update(id: string, updateReminderDto: Prisma.ReminderUpdateInput) {
    const updatedReminder = await this.databaseService.reminder.update({
      where: { id },
      data: updateReminderDto,
    });

    await this._updateJobInQueue(updatedReminder);

    return updatedReminder;
  }

  async findAll() {
    return this.databaseService.reminder.findMany();
  }

  async findById(id: string) {
    return this.databaseService.reminder.findUnique({
      where: { id },
    });
  }

  async delete(id: string) {
    const deletedReminder = await this.databaseService.reminder.delete({
      where: { id },
    });

    await this._removeJobFromQueue(deletedReminder);
  }
}
