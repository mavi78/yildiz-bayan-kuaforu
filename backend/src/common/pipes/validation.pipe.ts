import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * Global Validation Pipe
 *
 * DTO'ları class-validator dekoratörleri ile valide eder.
 * FR-004: Kayıt sırasında e-posta ve telefon benzersizliği kontrolü
 *
 * @implements {PipeTransform}
 */
@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    // Metatype yoksa veya validate edilemez bir tip ise bypass et
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Plain object'i class instance'a çevir
    const object = plainToInstance(metatype, value);

    // Validation yap
    const errors = await validate(object);

    if (errors.length > 0) {
      // Hata mesajlarını topla
      const messages = errors.map((error) => {
        const constraints = error.constraints;
        return constraints
          ? Object.values(constraints).join(', ')
          : 'Validation failed';
      });

      throw new BadRequestException({
        statusCode: 400,
        message: messages,
        error: 'Validation Error',
      });
    }

    return value;
  }

  /**
   * Verilen metatype'ın validate edilip edilemeyeceğini kontrol et
   */
  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
