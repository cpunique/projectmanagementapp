import { z } from 'zod';

export const BoardNameSchema = z.string()
  .min(1, 'Board name is required')
  .max(100, 'Board name must be less than 100 characters')
  .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Board name can only contain letters, numbers, spaces, hyphens, and underscores');

export const ColumnTitleSchema = z.string()
  .min(1, 'Column title is required')
  .max(50, 'Column title must be less than 50 characters');

export const CardTitleSchema = z.string()
  .min(1, 'Card title is required')
  .max(200, 'Card title must be less than 200 characters');

export const CardDescriptionSchema = z.string()
  .max(1000, 'Description must be less than 1000 characters')
  .optional();

export const TagSchema = z.string()
  .max(50, 'Tag must be less than 50 characters');

export const TagsArraySchema = z.array(TagSchema)
  .max(20, 'Maximum 20 tags allowed');
