import { registerEnumType } from '@nestjs/graphql';

export enum FilterMode {
  default = 'default',
  insensitive = 'insensitive',
}

registerEnumType(FilterMode, {
  name: 'FilterMode',
  description: 'String filter case sensitivity mode',
});
