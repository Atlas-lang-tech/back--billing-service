import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '../../../generated/prisma/client.js';

interface ErrorEnvelope {
  code: number;
  message: string;
  data: Record<string, unknown>;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const envelope = this.toEnvelope(exception);

    if (envelope.code >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception);
    }

    response.status(envelope.code).json(envelope);
  }

  private toEnvelope(exception: unknown): ErrorEnvelope {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : (((res as Record<string, unknown>).message as string) ??
            exception.message);

      return { code: status, message: this.flatten(message), data: {} };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrisma(exception);
    }

    if (exception instanceof Error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message,
        data: {},
      };
    }

    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      data: {},
    };
  }

  private fromPrisma(
    exception: Prisma.PrismaClientKnownRequestError,
  ): ErrorEnvelope {
    switch (exception.code) {
      case 'P2002':
        return {
          code: HttpStatus.CONFLICT,
          message: 'Unique constraint violation',
          data: {},
        };
      case 'P2025':
        return {
          code: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          data: {},
        };
      default:
        return {
          code: HttpStatus.BAD_REQUEST,
          message: exception.message,
          data: {},
        };
    }
  }

  private flatten(message: string | string[]): string {
    return Array.isArray(message) ? message.join(', ') : message;
  }
}
