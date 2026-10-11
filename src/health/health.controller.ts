import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { HealthResult, HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Health endpoint returning connectivity status across Stellar RPC,
   * Postgres, and Redis.
   *
   * Responds with 200 OK when all systems are healthy, or 503 Service
   * Unavailable if any downstream service is unreachable (making it
   * ideal for Kubernetes readiness probes).
   */
  @Get()
  async getHealth(): Promise<HealthResult> {
    const result = await this.healthService.check();
    if (result.status !== 'ok') {
      throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }
}
