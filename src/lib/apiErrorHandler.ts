import logger from './logger'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function badRequest(message: string): ApiError {
  return new ApiError(400, message)
}

export function unauthorized(message = 'Unauthorized'): ApiError {
  return new ApiError(401, message)
}

export function forbidden(message = 'Forbidden'): ApiError {
  return new ApiError(403, message)
}

export function notFound(message = 'Not found'): ApiError {
  return new ApiError(404, message)
}

export function apiErrorHandler(err: unknown): { status: number; body: { error: string } } {
  if (err instanceof ApiError) {
    return { status: err.status, body: { error: err.message } }
  }

  if (err instanceof Error) {
    logger.error('Unhandled error', { message: err.message, stack: err.stack })
    return { status: 500, body: { error: 'Internal Server Error' } }
  }

  logger.error('Unknown error', { error: String(err) })
  return { status: 500, body: { error: 'Internal Server Error' } }
}
