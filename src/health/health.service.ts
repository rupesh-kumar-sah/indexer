import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { RedisService } from '../db/redis.service';
import { StellarService } from '../stellar/stellar.service';

export interface ServiceHealth {
  status: 'up' | 'down';
  latestLedger?: number;
  error?: string;
}

export interface HealthResult {
  status: 'ok' | 'error';
  services: {
    stellar: ServiceHealth;
    postgres: ServiceHealth;
    redis: ServiceHealth;
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly stellarService: StellarService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Evaluates the connectivity of all required downstream systems:
   * Stellar RPC, Postgres via Prisma, and Redis.
   */
  async check(): Promise<HealthResult> {
    const [stellar, postgres, redis] = await Promise.all([
      this.stellarService.checkHealth(),
      this.prismaService.checkHealth(),
      this.redisService.checkHealth(),
    ]);

    const isHealthy =
      stellar.status === 'up' &&
      postgres.status === 'up' &&
      redis.status === 'up';

    return {
      status: isHealthy ? 'ok' : 'error',
      services: {
        stellar,
        postgres,
        redis,
      },
    };
  }
}
