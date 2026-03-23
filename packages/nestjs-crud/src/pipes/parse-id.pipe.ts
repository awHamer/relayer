import { BadRequestException, type PipeTransform } from '@nestjs/common';

export class ParseIdPipe implements PipeTransform {
  constructor(private readonly idType: 'number' | 'string' | 'uuid' = 'number') {}

  transform(value: string): string | number {
    if (this.idType === 'number') {
      const num = parseInt(value, 10);
      if (isNaN(num)) {
        throw new BadRequestException(`Invalid ID: "${value}" is not a valid number`);
      }
      return num;
    }

    if (this.idType === 'uuid') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new BadRequestException(`Invalid ID: "${value}" is not a valid UUID`);
      }
    }

    return value;
  }
}
