import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Thin wrapper around the generated Prisma client, managing the
 * connection lifecycle alongside Nest's module lifecycle.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connected to Postgres');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Reports the current connectivity status of Postgres via a lightweight ping.
   */
  async checkHealth(): Promise<{ status: 'up' | 'down'; error?: string }> {
    try {
      await this.$queryRaw`SELECT 1`;
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
