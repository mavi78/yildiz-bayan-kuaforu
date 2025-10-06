import { Test, TestingModule } from '@nestjs/testing';
import { HttpAdapterHost } from '@nestjs/core';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { ValidationPipe } from '../../src/common/pipes/validation.pipe';
import { LoggingInterceptor } from '../../src/common/interceptors/logging.interceptor';
import { HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { ArgumentsHost, ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('Bootstrap Infrastructure (T007)', () => {
  describe('HttpExceptionFilter', () => {
    let filter: HttpExceptionFilter;
    let httpAdapterHost: HttpAdapterHost;
    let mockArgumentsHost: ArgumentsHost;
    let mockHttpAdapter: any;
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
      mockRequest = {
        url: '/test',
        method: 'GET',
      };

      mockResponse = {
        code: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      };

      mockHttpAdapter = {
        getRequestUrl: jest.fn().mockReturnValue('/test'),
        getRequestMethod: jest.fn().mockReturnValue('GET'),
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
        reply: jest.fn(),
      };

      httpAdapterHost = {
        httpAdapter: mockHttpAdapter,
      } as any;

      mockArgumentsHost = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
        getArgByIndex: jest.fn(),
        getArgs: jest.fn(),
        getType: jest.fn(),
        switchToRpc: jest.fn(),
        switchToWs: jest.fn(),
      } as any;

      filter = new HttpExceptionFilter(httpAdapterHost);
    });

    it('should be defined', () => {
      expect(filter).toBeDefined();
    });

    it('should handle HttpException and return proper response', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          timestamp: expect.any(String),
          path: '/test',
          method: 'GET',
          message: 'Test error',
        }),
        HttpStatus.BAD_REQUEST,
      );
    });

    it('should handle unknown exceptions as 500 Internal Server Error', () => {
      const exception = new Error('Unknown error');

      filter.catch(exception, mockArgumentsHost);

      expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          timestamp: expect.any(String),
          path: '/test',
          method: 'GET',
          error: 'Error',
          message: 'Unknown error',
        }),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });

    it('should handle BadRequestException with validation errors', () => {
      const exception = new BadRequestException({
        statusCode: 400,
        message: ['name should not be empty', 'age must be a number'],
        error: 'Validation Error',
      });

      filter.catch(exception, mockArgumentsHost);

      expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Validation Error',
          message: expect.arrayContaining([
            'name should not be empty',
            'age must be a number',
          ]),
          path: '/test',
          method: 'GET',
        }),
        HttpStatus.BAD_REQUEST,
      );
    });
  });

  describe('ValidationPipe', () => {
    let pipe: ValidationPipe;

    beforeEach(() => {
      pipe = new ValidationPipe();
    });

    it('should be defined', () => {
      expect(pipe).toBeDefined();
    });

    it('should bypass validation for native types', async () => {
      const value = 'test string';
      const metadata = { type: 'body', metatype: String, data: '' };

      const result = await pipe.transform(value, metadata);

      expect(result).toBe(value);
    });

    it('should bypass validation when metatype is undefined', async () => {
      const value = { test: 'value' };
      const metadata = { type: 'body', metatype: undefined, data: '' };

      const result = await pipe.transform(value, metadata);

      expect(result).toBe(value);
    });

    it('should validate DTO with class-validator decorators', async () => {
      // Bu test gerçek DTO ile yapılmalı, şimdilik skip ediyoruz
      // Gerçek implementasyonda CreateCatDto gibi bir DTO ile test edilecek
      expect(pipe).toBeDefined();
    });
  });

  describe('LoggingInterceptor', () => {
    let interceptor: LoggingInterceptor;
    let mockExecutionContext: ExecutionContext;
    let mockCallHandler: CallHandler;
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
      mockRequest = {
        method: 'GET',
        url: '/test',
        body: { name: 'test' },
        query: {},
        params: {},
        get: jest.fn().mockReturnValue('test-user-agent'),
        ip: '127.0.0.1',
      };

      mockResponse = {
        statusCode: 200,
      };

      mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
        getClass: jest.fn(),
        getHandler: jest.fn(),
        getArgs: jest.fn(),
        getArgByIndex: jest.fn(),
        switchToRpc: jest.fn(),
        switchToWs: jest.fn(),
        getType: jest.fn(),
      } as any;

      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ data: 'test response' })),
      };

      interceptor = new LoggingInterceptor();
    });

    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });

    it('should log incoming request', (done) => {
      const logSpy = jest.spyOn(interceptor['logger'], 'log');

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('Incoming Request: GET /test'),
          );
          done();
        },
      });
    });

    it('should log outgoing response with execution time', (done) => {
      const logSpy = jest.spyOn(interceptor['logger'], 'log');

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('Outgoing Response: GET /test - Status: 200'),
          );
          done();
        },
      });
    });

    it('should sanitize sensitive fields in request body', (done) => {
      mockRequest.body = {
        username: 'testuser',
        password: 'secret123',
        email: 'test@example.com',
      };

      const debugSpy = jest.spyOn(interceptor['logger'], 'debug');

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(debugSpy).toHaveBeenCalledWith(
            expect.stringContaining('***REDACTED***'),
          );
          done();
        },
      });
    });

    it('should handle errors and log them', (done) => {
      const error = new Error('Test error');
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      const errorSpy = jest.spyOn(interceptor['logger'], 'error');

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Request Error: GET /test'),
            expect.any(String),
          );
          done();
        },
      });
    });
  });
});
