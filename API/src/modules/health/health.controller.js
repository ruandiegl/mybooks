import { prisma } from '../../shared/database/prisma.js';
import { metrics } from '../../shared/observability/metrics.js';

export async function health(_req, res) {
  return res.status(200).json({
    data: {
      status: 'ok',
      service: 'mybooks-api',
      timestamp: new Date().toISOString(),
      metrics: metrics.snapshot()
    }
  });
}

export async function readiness(_req, res) {
  await prisma.$queryRaw`SELECT 1`;
  return res.status(200).json({
    data: {
      status: 'ready',
      database: 'reachable'
    }
  });
}
