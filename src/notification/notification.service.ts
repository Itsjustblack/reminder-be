import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as webpush from 'web-push';

const vapidKeys = {
  publicKey: process.env.PUBLIC_KEY,
  privateKey: process.env.PRIVATE_KEY,
};

interface NotificationPayload {
  id: string;
  title: string;
  message: string;
}

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);

  subscriptions: PushSubscription[] = [];
  pendingNotifications: NotificationPayload[] = [];

  onModuleInit() {
    if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
      throw new Error('Missing VAPID keys in environment variables');
    }

    webpush.setVapidDetails(
      'mailto:webPushV1@mailinator.com',
      vapidKeys.publicKey,
      vapidKeys.privateKey,
    );
  }

  /**
   * Handles new push subscription
   */
  subscribeToPushNotification(subscription: PushSubscription) {
    if (!subscription) throw new BadRequestException('Subscription required');

    this.subscriptions.push(subscription);
    this.logger.log(`New subscription added: ${subscription.endpoint}`);

    // If there are pending notifications, send them
    if (this.pendingNotifications.length > 0) {
      this.logger.log(
        `Sending ${this.pendingNotifications.length} pending notifications...`,
      );
      for (const notification of this.pendingNotifications) {
        this.sendPushNotification(notification);
      }
      this.pendingNotifications = []; // Clear queue after sending
    }

    return { status: 'success', message: 'Subscription Successful' };
  }

  /**
   * Sends push notifications
   */
  @OnEvent('reminder.processed')
  async sendPushNotification(payload: NotificationPayload) {
    this.logger.log(`Received notification event: ${payload.message}`);

    if (this.subscriptions.length === 0) {
      this.logger.warn(
        'No active subscriptions. Storing notification in queue.',
      );
      this.pendingNotifications.push(payload); // Store in queue
      return;
    }

    const notificationPayload = JSON.stringify({ ...payload });

    for (const subscription of this.subscriptions) {
      try {
        await webpush.sendNotification(subscription, notificationPayload);
        this.logger.log(`Push notification sent to ${subscription.endpoint}`);
      } catch (error) {
        this.logger.error(`Failed to send push notification: ${error.message}`);
      }
    }
  }
}
