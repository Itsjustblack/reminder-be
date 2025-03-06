import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { RemindersService } from './reminders.service';

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  executionDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Processor('reminder')
export class RemindersConsumer extends WorkerHost {
  private readonly logger = new Logger(RemindersConsumer.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly reminderService: RemindersService,
  ) {
    super();
  }

  @OnWorkerEvent('active')
  onActive(job: Job<Reminder>) {
    console.log(
      `Processing job ${job.id} of type ${job.name} with data ${job.data.title}...`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async process(job: Job<Reminder>): Promise<any> {
    try {
      // Emit an event instead of calling NotificationService directly
      this.eventEmitter.emit('reminder.processed', {
        id: job.id,
        title: job.data.title,
        message: `Reminder: ${job.data.description || 'No description provided'}`,
      });

      await this.reminderService.update(job.data.id, { status: 'COMPLETED' });

      this.logger.log(`Event emitted for job ${job.id}`);
      console.log(`Event emitted for job ${job.id}`);
    } catch (error) {
      // If an error occurs, mark the job as failed
      this.logger.error(`Job ${job.id} failed: ${error.message}`);
      throw error; // Ensures BullMQ marks it as failed
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<Reminder>, error: Error) {
    this.logger.error(`Job ${job.id} failed with error: ${error.message}`);
    console.log(`Job ${job.id} failed with error: ${error.message}`);

    // Decide whether to revert to PENDING or CANCELLED
    const newStatus = job.attemptsMade >= 3 ? 'CANCELLED' : 'PENDING';

    // Update the job status in the database
    await this.reminderService.update(job.id, { status: newStatus });

    // Emit an event for failure handling (useful for UI updates)
    // this.eventEmitter.emit('reminder.failed', {
    //   id: job.id,
    //   title: job.data.title,
    //   error: error.message,
    //   newStatus,
    // });

    this.logger.log(`Job ${job.id} status reverted to ${newStatus}`);
  }
}
