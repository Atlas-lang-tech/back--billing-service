import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

function isEnvelope(value: unknown): value is ResponseEnvelope<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    'data' in value
  );
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ResponseEnvelope<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ResponseEnvelope<T>> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        if (isEnvelope(data)) {
          return data as unknown as ResponseEnvelope<T>;
        }

        return {
          code: response.statusCode,
          message: 'Success',
          data,
        };
      }),
    );
  }
}
