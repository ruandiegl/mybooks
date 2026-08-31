import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';
import { metrics } from '../observability/metrics.js';

function fromUnknownError(error) {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    const fields = {};
    for (const issue of error.issues) {
      fields[issue.path.join('.') || 'request'] = issue.message;
    }
    return new AppError('Revise os dados enviados.', {
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      fields,
      cause: error
    });
  }

  if (error?.code === 'P2002') {
    return new AppError('Já existe um registro com esses dados.', {
      statusCode: 409,
      code: 'CONFLICT',
      cause: error
    });
  }

  if (error?.code === 'P2025') {
    return new AppError('Recurso não encontrado.', {
      statusCode: 404,
      code: 'NOT_FOUND',
      cause: error
    });
  }

  return new AppError('Não foi possível concluir a operação.', {
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    cause: error
  });
}

export function notFoundHandler(req, _res, next) {
  next(new AppError('Rota não encontrada.', {
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND'
  }));
}

export function errorHandler(error, req, res, _next) {
  const appError = fromUnknownError(error);
  metrics.increment('httpErrors');

  const log = {
    level: appError.statusCode >= 500 ? 'error' : 'warn',
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    code: appError.code,
    message: appError.message
  };

  if (appError.statusCode >= 500 && appError.cause) {
    log.causeType = appError.cause.name || 'Error';
  }

  console[appError.statusCode >= 500 ? 'error' : 'warn'](JSON.stringify(log));

  return res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.fields ? { fields: appError.fields } : {}),
      requestId: req.requestId
    }
  });
}
