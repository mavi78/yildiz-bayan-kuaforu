import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Logging Interceptor
 *
 * Request ve response'ları loglar, execution time'ı ölçer.
 * FR-060 to FR-065: Audit log gereksinimleri için temel logging
 *
 * @implements {NestInterceptor}
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, params } = request;
    const userAgent = request.get('user-agent') || '';
    const ip = request.ip;

    const now = Date.now();

    this.logger.log(
      `Incoming Request: ${method} ${url} - IP: ${ip} - User Agent: ${userAgent}`,
    );

    // Request body varsa log et (şifre gibi sensitive bilgileri filtrele)
    if (body && Object.keys(body).length > 0) {
      const sanitizedBody = this.sanitizeBody(body);
      this.logger.debug(`Request Body: ${JSON.stringify(sanitizedBody)}`);
    }

    if (query && Object.keys(query).length > 0) {
      this.logger.debug(`Query Params: ${JSON.stringify(query)}`);
    }

    if (params && Object.keys(params).length > 0) {
      this.logger.debug(`Path Params: ${JSON.stringify(params)}`);
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const executionTime = Date.now() - now;
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;

          this.logger.log(
            `Outgoing Response: ${method} ${url} - Status: ${statusCode} - Time: ${executionTime}ms`,
          );

          // Response data'yı log et (sadece debug mode'da)
          if (process.env.NODE_ENV !== 'production' && data) {
            this.logger.debug(
              `Response Data: ${JSON.stringify(data).substring(0, 200)}${
                JSON.stringify(data).length > 200 ? '...' : ''
              }`,
            );
          }
        },
        error: (error) => {
          const executionTime = Date.now() - now;
          this.logger.error(
            `Request Error: ${method} ${url} - Time: ${executionTime}ms - Error: ${error.message}`,
            error.stack,
          );
        },
      }),
    );
  }

  /**
   * Request body'den sensitive bilgileri filtrele
   */
  private sanitizeBody(body: any): any {
    const sensitiveFields = [
      'password',
      'passwordConfirm',
      'currentPassword',
      'newPassword',
      'token',
      'refreshToken',
      'accessToken',
      'secret',
      'apiKey',
    ];

    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
