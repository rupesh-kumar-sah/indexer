jest.mock('@stellar/stellar-sdk', () => ({
  rpc: {
    Server: jest.fn().mockImplementation(() => ({
      getHealth: jest.fn(),
      getEvents: jest.fn(),
      getLatestLedger: jest.fn(),
    })),
  },
}));

import { HealthService } from './health.service';
import { StellarService } from '../stellar/stellar.service';
import { PrismaService } from '../db/prisma.service';
import { RedisService } from '../db/redis.service';

describe('HealthService', () => {
  let healthService: HealthService;
  let stellarService: jest.Mocked<Partial<StellarService>>;
  let prismaService: jest.Mocked<Partial<PrismaService>>;
  let redisService: jest.Mocked<Partial<RedisService>>;

  beforeEach(() => {
    stellarService = {
      checkHealth: jest.fn(),
    };
    prismaService = {
      checkHealth: jest.fn(),
    };
    redisService = {
      checkHealth: jest.fn(),
    };

    healthService = new HealthService(
      stellarService as StellarService,
      prismaService as PrismaService,
      redisService as RedisService,
    );
  });

  it('reports status ok when all dependencies are healthy', async () => {
    (stellarService.checkHealth as jest.Mock).mockResolvedValue({
      status: 'up',
      latestLedger: 500,
    });
    (prismaService.checkHealth as jest.Mock).mockResolvedValue({
      status: 'up',
    });
    (redisService.checkHealth as jest.Mock).mockResolvedValue({
      status: 'up',
    });

    const result = await healthService.check();

    expect(result.status).toBe('ok');
    expect(result.services.stellar).toEqual({
      status: 'up',
      latestLedger: 500,
    });
    expect(result.services.postgres).toEqual({ status: 'up' });
    expect(result.services.redis).toEqual({ status: 'up' });
  });

  it('reports status error when Stellar RPC is down', async () => {
    (stellarService.checkHealth as jest.Mock).mockResolvedValue({
      status: 'down',
      error: 'connection refused',
    });
    (prismaService.checkHealth as jest.Mock).mockResolvedValue({
      status: 'up',
    });
    (redisService.checkHealth as jest.Mock).mockResolvedValue({
      status: 'up',
    });

    const result = await healthService.check();

    expect(result.status).toBe('error');
    expect(result.services.stellar.status).toBe('down');
    expect(result.services.stellar.error).toBe('connection refused');
  });

  it('reports status error when Postgres is down', async () => {
    (stellarService.checkHealth as jest.Mock).mockResolvedValue({
      status: 'up',
      latestLedger: 500,
    });
    (prismaService.checkHealth as jest.Mock).mockResolvedValue({
      status: 'down',
      error: 'database unreachable',
    });
    (redisService.checkHealth as jest.Mock).mockResolvedValue({
      status: 'up',
    });

    const result = await healthService.check();

    expect(result.status).toBe('error');
    expect(result.services.postgres.status).toBe('down');
  });

  it('reports status error when Redis is down', async () => {
    (stellarService.checkHealth as jest.Mock).mockResolvedValue({
      status: 'up',
      latestLedger: 500,
    });
    (prismaService.checkHealth as jest.Mock).mockResolvedValue({
      status: 'up',
    });
    (redisService.checkHealth as jest.Mock).mockResolvedValue({
      status: 'down',
      error: 'timeout',
    });

    const result = await healthService.check();

    expect(result.status).toBe('error');
    expect(result.services.redis.status).toBe('down');
  });
});
