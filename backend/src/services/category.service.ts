import { Category, type CategoryDocument } from '../models/Category';
import {
  parseOrThrow,
  categoryCreateSchema,
  categoryUpdateSchema,
  type CategoryCreateInput,
  type CategoryUpdateInput,
} from '../validators/catalog.validators';
import { conflict, notFound } from '../utils/AppError';
import { logger } from '../utils/logger';
import { normalizeSlug } from '../utils/slug';
import { toPublicCategory, type PublicCategory } from './catalog.mapper';

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}

async function assertUniqueCategorySlug(
  slug: string,
  excludeId?: string,
): Promise<void> {
  const existing = await Category.findOne({
    slug,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).lean();
  if (existing) {
    throw conflict('این اسلاگ دسته‌بندی قبلاً ثبت شده است.', {
      slug: 'این اسلاگ دسته‌بندی قبلاً ثبت شده است.',
    });
  }
}

export async function createCategory(raw: unknown): Promise<PublicCategory> {
  const input: CategoryCreateInput = parseOrThrow(categoryCreateSchema, raw);
  await assertUniqueCategorySlug(input.slug);

  try {
    const category = await Category.create({
      name: input.name,
      slug: input.slug,
      description: input.description,
      image: input.image,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    });
    logger.info('category.created', { id: String(category._id), slug: category.slug });
    return toPublicCategory(category);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw conflict('این اسلاگ دسته‌بندی قبلاً ثبت شده است.', {
        slug: 'این اسلاگ دسته‌بندی قبلاً ثبت شده است.',
      });
    }
    throw error;
  }
}

export async function listPublicCategories(): Promise<PublicCategory[]> {
  const categories = await Category.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .lean();
  return categories.map((category) => toPublicCategory(category as CategoryDocument));
}

export async function listAdminCategories(): Promise<PublicCategory[]> {
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
  return categories.map((category) => toPublicCategory(category as CategoryDocument));
}

export async function getCategoryBySlug(
  slug: string,
  options?: { publicOnly?: boolean },
): Promise<PublicCategory> {
  const normalized = normalizeSlug(slug);
  const filter: Record<string, unknown> = { slug: normalized };
  if (options?.publicOnly) filter.isActive = true;

  const category = await Category.findOne(filter).lean();
  if (!category) throw notFound('دسته‌بندی یافت نشد.');
  return toPublicCategory(category as CategoryDocument);
}

export async function getCategoryById(id: string): Promise<PublicCategory> {
  const category = await Category.findById(id).lean();
  if (!category) throw notFound('دسته‌بندی یافت نشد.');
  return toPublicCategory(category as CategoryDocument);
}

export async function getCategoryDocumentById(id: string): Promise<CategoryDocument> {
  const category = await Category.findById(id);
  if (!category) throw notFound('دسته‌بندی یافت نشد.');
  return category;
}

export async function updateCategory(
  id: string,
  raw: unknown,
): Promise<PublicCategory> {
  const input: CategoryUpdateInput = parseOrThrow(categoryUpdateSchema, raw);
  const category = await Category.findById(id);
  if (!category) throw notFound('دسته‌بندی یافت نشد.');

  if (input.slug && input.slug !== category.slug) {
    await assertUniqueCategorySlug(input.slug, id);
    category.slug = input.slug;
  }
  if (input.name !== undefined) category.name = input.name;
  if (input.description !== undefined) category.description = input.description;
  if (input.image !== undefined) category.image = input.image;
  if (input.isActive !== undefined) category.isActive = input.isActive;
  if (input.sortOrder !== undefined) category.sortOrder = input.sortOrder;

  try {
    await category.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw conflict('این اسلاگ دسته‌بندی قبلاً ثبت شده است.', {
        slug: 'این اسلاگ دسته‌بندی قبلاً ثبت شده است.',
      });
    }
    throw error;
  }

  logger.info('category.updated', {
    id: String(category._id),
    slug: category.slug,
    isActive: category.isActive,
  });
  return toPublicCategory(category);
}

/** Soft-deactivate — never cascade-deletes products. */
export async function deactivateCategory(id: string): Promise<PublicCategory> {
  return updateCategory(id, { isActive: false });
}
