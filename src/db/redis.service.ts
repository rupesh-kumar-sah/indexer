import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Thin wrapper around the ioredis client, managing the connection
 * lifecycle alongside Nest's module lifecycle. Canvas-specific encoding
 * lives in `CanvasCacheService`, not here — this is just the connection.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(config: ConfigService) {
    const url = config.getOrThrow<string>('REDIS_URL');
    this.client = new Redis(url, { lazyConnect: true });
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    this.logger.log('Connected to Redis');
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }

  /**
   * Reports the current connectivity status of Redis via ping.
   */
  async checkHealth(): Promise<{ status: 'up' | 'down'; error?: string }> {
    try {
      await this.client.ping();
      return { status: 'up' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        status: 'down',
        error: message,
      };
    }
  }
}
