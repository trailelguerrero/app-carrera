/**
 * usePushNotifications.ts — tipos sobre usePushNotifications.js
 */
import { usePushNotifications as _usePushNotifications } from './usePushNotifications.js';

export type NotificationPermission = 'default' | 'granted' | 'denied';

export interface NotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: unknown;
}

export interface UsePushNotificationsReturn {
  supported: boolean;
  enabled: boolean;
  permission: NotificationPermission;
  loading: boolean;
  error: string | null;
  toggle: () => Promise<void>;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  notifyLocal: (title: string, options?: NotificationOptions) => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  return _usePushNotifications() as UsePushNotificationsReturn;
}
