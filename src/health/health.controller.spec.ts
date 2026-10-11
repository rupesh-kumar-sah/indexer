jest.mock('@stellar/stellar-sdk', () => ({
  rpc: {
    Server: jest.fn().mockImplementation(() => ({
      getHealth: jest.fn(),
      getEvents: jest.fn(),
      getLatestLedger: jest.fn(),
    })),
  },
}));

import { HttpException, HttpStatus } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthResult, HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: jest.Mocked<Partial<HealthService>>;

  beforeEach(() => {
    healthService = {
      check: jest.fn(),
    };
    controller = new HealthController(healthService as HealthService);
  });

  it('returns health payload when all dependencies are healthy', async () => {
    const successResult: HealthResult = {
      status: 'ok',
      services: {
        stellar: { status: 'up', latestLedger: 100 },
        postgres: { status: 'up' },
        redis: { status: 'up' },
      },
    };
    (healthService.check as jest.Mock).mockResolvedValue(successResult);

    const res = await controller.getHealth();
    expect(res).toEqual(successResult);
  });

  it('throws HttpException with 503 Service Unavailable when any dependency fails', async () => {
    const failureResult: HealthResult = {
      status: 'error',
      services: {
        stellar: { status: 'down', error: 'unreachable' },
        postgres: { status: 'up' },
        redis: { status: 'up' },
      },
    };
    (healthService.check as jest.Mock).mockResolvedValue(failureResult);

    try {
      await controller.getHealth();
      fail('expected HttpException to be thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(httpErr.getResponse()).toEqual(failureResult);
    }
  });
});
