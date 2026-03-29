import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Plain class with class-validator
export class CreatePostDto {
  @ApiProperty({ example: 'Hello World', description: 'Post title' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ example: 'My first post content', description: 'Post content' })
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiPropertyOptional({ example: false, description: 'Whether the post is published' })
  @IsBoolean()
  @IsOptional()
  published?: boolean;

  @ApiPropertyOptional({
    example: ['typescript', 'tutorial'],
    description: 'Tags for the post',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

// Zod schema -> class via nestjs-zod
const updatePostSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  published: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export class UpdatePostDto extends createZodDto(updatePostSchema) {}
