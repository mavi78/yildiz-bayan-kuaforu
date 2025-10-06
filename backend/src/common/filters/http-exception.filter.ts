import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

/**
 * Global HTTP Exception Filter
 *
 * Tüm HTTP exception'ları yakalar ve standart bir hata response formatı döner.
 * FR-006 to FR-009: Güvenlik ve hata yönetimi gereksinimleri
 *
 * @implements {ExceptionFilter}
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // HttpAdapter'ı al (platform-agnostic)
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();
    const request = httpAdapter.getRequest(ctx);
    const response = httpAdapter.getResponse(ctx);

    // HTTP status code belirle
    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Exception mesajını al
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        error = (exceptionResponse as any).error || exception.name;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    // Response body
    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(request),
      method: httpAdapter.getRequestMethod(request),
      error,
      message,
    };

    // Log hatayı (production'da detaylı log)
    if (httpStatus >= 500) {
      this.logger.error(
        `${httpAdapter.getRequestMethod(request)} ${httpAdapter.getRequestUrl(request)} - ${httpStatus}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `${httpAdapter.getRequestMethod(request)} ${httpAdapter.getRequestUrl(request)} - ${httpStatus}: ${message}`,
      );
    }

    // Response döndür
    httpAdapter.reply(response, responseBody, httpStatus);
  }
}
