import { Types, type SortOrder } from 'mongoose';

import type { ProductSortOption } from '../config/constants';
import { Product, type ProductAttrs, type ProductDocument } from '../models/Product';
import { Category } from '../models/Category';
import {
  parseOrThrow,
  productCreateSchema,
  productUpdateSchema,
  productQuerySchema,
  type ProductCreateInput,
  type ProductUpdateInput,
  type ProductQueryInput,
} from '../validators/catalog.validators';
import {
  conflict,
  notFound,
  validationError,
  badRequest,
} from '../utils/AppError';
import { logger } from '../utils/logger';
import { normalizeSlug } from '../utils/slug';
import {
  toPublicProduct,
  toProductListItem,
  type PublicProduct,
} from './catalog.mapper';
import { buildProductSearchFilter } from './catalogSearch.service';
import { getCategoryDocumentById } from './category.service';

type ProductFilter = Record<string, unknown>;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductListResult {
  items: PublicProduct[];
  pagination: PaginationMeta;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}

function duplicateFieldMessage(error: unknown): { field: string; message: string } {
  const keyValue =
    typeof error === 'object' &&
    error !== null &&
    'keyValue' in error
      ? (error as { keyValue?: Record<string, unknown> }).keyValue
      : undefined;

  if (keyValue?.sku != null) {
    return { field: 'sku', message: 'این کد کالا قبلاً ثبت شده است.' };
  }
  if (keyValue?.slug != null) {
    return { field: 'slug', message: 'این اسلاگ قبلاً ثبت شده است.' };
  }
  return { field: '_form', message: 'رکورد تکراری است.' };
}

async function assertUniqueProductIdentity(
  fields: { slug?: string; sku?: string },
  excludeId?: string,
): Promise<void> {
  if (fields.slug) {
    const existing = await Product.findOne({
      slug: fields.slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).lean();
    if (existing) {
      throw conflict('این اسلاگ قبلاً ثبت شده است.', {
        slug: 'این اسلاگ قبلاً ثبت شده است.',
      });
    }
  }
  if (fields.sku) {
    const existing = await Product.findOne({
      sku: fields.sku,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).lean();
    if (existing) {
      throw conflict('این کد کالا قبلاً ثبت شده است.', {
        sku: 'این کد کالا قبلاً ثبت شده است.',
      });
    }
  }
}

function normalizeImageList(
  images: ProductCreateInput['images'] | ProductUpdateInput['images'],
): ProductAttrs['images'] {
  if (!images) return [];
  const prepared = images.map((image, index) => ({
    url: image.url,
    alt: image.alt,
    isPrimary: Boolean(image.isPrimary),
    sortOrder: image.sortOrder ?? index,
  }));
  if (prepared.length > 0 && !prepared.some((image) => image.isPrimary)) {
    prepared[0].isPrimary = true;
  }
  return prepared;
}

function assertPricing(price: number, salePrice?: number | null): void {
  if (price < 0) {
    throw validationError('قیمت نمی‌تواند منفی باشد.', {
      price: 'قیمت نمی‌تواند منفی باشد.',
    });
  }
  if (salePrice != null && salePrice < 0) {
    throw validationError('قیمت فروش ویژه نمی‌تواند منفی باشد.', {
      salePrice: 'قیمت فروش ویژه نمی‌تواند منفی باشد.',
    });
  }
  if (salePrice != null && salePrice > price) {
    throw validationError('قیمت فروش ویژه نمی‌تواند از قیمت اصلی بیشتر باشد.', {
      salePrice: 'قیمت فروش ویژه نمی‌تواند از قیمت اصلی بیشتر باشد.',
    });
  }
}

function sortSpec(sort: ProductSortOption): Record<string, SortOrder> {
  switch (sort) {
    case 'oldest':
      return { createdAt: 1 };
    case 'price_asc':
      return { price: 1, createdAt: -1 };
    case 'price_desc':
      return { price: -1, createdAt: -1 };
    case 'name_asc':
      return { name: 1 };
    case 'name_desc':
      return { name: -1 };
    case 'newest':
    default:
      return { createdAt: -1 };
  }
}

function buildPriceFilter(
  minPrice?: number,
  maxPrice?: number,
): ProductFilter | undefined {
  if (minPrice == null && maxPrice == null) return undefined;

  const clauses: ProductFilter[] = [];
  if (minPrice != null) {
    clauses.push({
      $expr: {
        $gte: [{ $ifNull: ['$salePrice', '$price'] }, minPrice],
      },
    });
  }
  if (maxPrice != null) {
    clauses.push({
      $expr: {
        $lte: [{ $ifNull: ['$salePrice', '$price'] }, maxPrice],
      },
    });
  }
  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}

async function resolveCategoryFilter(
  categorySlugOrId?: string,
): Promise<ProductFilter | undefined> {
  if (!categorySlugOrId) return undefined;
  const value = categorySlugOrId.trim();
  if (/^[a-fA-F0-9]{24}$/.test(value)) {
    return { category: value };
  }
  const slug = normalizeSlug(value);
  const category = await Category.findOne({ slug }).select('_id').lean();
  if (!category) {
    // Unknown category → empty result set (not an error for list browsing).
    return { category: { $in: [] } };
  }
  return { category: category._id };
}

export async function createProduct(raw: unknown): Promise<PublicProduct> {
  const input: ProductCreateInput = parseOrThrow(productCreateSchema, raw);
  await getCategoryDocumentById(input.categoryId);
  await assertUniqueProductIdentity({ slug: input.slug, sku: input.sku });
  assertPricing(input.price, input.salePrice);

  try {
    const product = await Product.create({
      name: input.name,
      slug: input.slug,
      sku: input.sku,
      shortDescription: input.shortDescription,
      description: input.description,
      category: input.categoryId,
      productKind: input.productKind ?? 'other',
      price: input.price,
      salePrice: input.salePrice ?? undefined,
      currency: input.currency,
      images: normalizeImageList(input.images),
      colors: input.colors ?? [],
      sizes: input.sizes ?? [],
      stock: input.stock ?? 0,
      lowStockThreshold: input.lowStockThreshold ?? 5,
      status: input.status ?? 'draft',
      featured: input.featured ?? false,
      badge: input.badge,
      tags: input.tags ?? [],
      material: input.material,
      brand: input.brand,
    });

    await product.populate('category', 'name slug');
    logger.info('product.created', {
      id: String(product._id),
      slug: product.slug,
      sku: product.sku,
    });
    return toPublicProduct(product);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const dup = duplicateFieldMessage(error);
      throw conflict(dup.message, { [dup.field]: dup.message });
    }
    throw error;
  }
}

export async function getProductById(id: string): Promise<PublicProduct> {
  const product = await Product.findById(id).populate('category', 'name slug');
  if (!product) throw notFound('محصول یافت نشد.');
  return toPublicProduct(product);
}

export async function getPublicProductBySlug(slug: string): Promise<PublicProduct> {
  const normalized = normalizeSlug(slug);
  const product = await Product.findOne({
    slug: normalized,
    status: 'active',
  }).populate('category', 'name slug');
  if (!product) throw notFound('محصول یافت نشد.');
  return toPublicProduct(product);
}

export async function updateProduct(
  id: string,
  raw: unknown,
): Promise<PublicProduct> {
  const input: ProductUpdateInput = parseOrThrow(productUpdateSchema, raw);
  const product = await Product.findById(id);
  if (!product) throw notFound('محصول یافت نشد.');

  if (input.categoryId) {
    await getCategoryDocumentById(input.categoryId);
    product.category = new Types.ObjectId(input.categoryId);
  }

  if (input.slug && input.slug !== product.slug) {
    await assertUniqueProductIdentity({ slug: input.slug }, id);
    product.slug = input.slug;
  }
  if (input.sku && input.sku !== product.sku) {
    await assertUniqueProductIdentity({ sku: input.sku }, id);
    product.sku = input.sku;
  }

  if (input.name !== undefined) product.name = input.name;
  if (input.shortDescription !== undefined) {
    product.shortDescription = input.shortDescription ?? undefined;
  }
  if (input.description !== undefined) {
    product.description = input.description ?? undefined;
  }
  if (input.productKind !== undefined) product.productKind = input.productKind;
  if (input.currency !== undefined) product.currency = input.currency;
  if (input.colors !== undefined) product.colors = input.colors;
  if (input.sizes !== undefined) product.sizes = input.sizes;
  if (input.stock !== undefined) product.stock = input.stock;
  if (input.lowStockThreshold !== undefined) {
    product.lowStockThreshold = input.lowStockThreshold;
  }
  if (input.status !== undefined) product.status = input.status;
  if (input.featured !== undefined) product.featured = input.featured;
  if (input.badge !== undefined) product.badge = input.badge ?? undefined;
  if (input.tags !== undefined) product.tags = input.tags;
  if (input.material !== undefined) product.material = input.material ?? undefined;
  if (input.brand !== undefined) product.brand = input.brand ?? undefined;
  if (input.images !== undefined) product.images = normalizeImageList(input.images);

  const nextPrice = input.price ?? product.price;
  const nextSale =
    input.salePrice === undefined ? product.salePrice : input.salePrice ?? undefined;
  assertPricing(nextPrice, nextSale);
  if (input.price !== undefined) product.price = input.price;
  if (input.salePrice !== undefined) {
    product.salePrice = input.salePrice ?? undefined;
  }

  try {
    await product.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const dup = duplicateFieldMessage(error);
      throw conflict(dup.message, { [dup.field]: dup.message });
    }
    throw error;
  }

  await product.populate('category', 'name slug');
  logger.info('product.updated', {
    id: String(product._id),
    slug: product.slug,
    status: product.status,
  });
  return toPublicProduct(product);
}

/** Soft archive — preferred over hard delete for commerce history. */
export async function archiveProduct(id: string): Promise<PublicProduct> {
  const result = await updateProduct(id, { status: 'archived' });
  logger.info('product.archived', { id, slug: result.slug });
  return result;
}

export async function listProducts(
  rawQuery: unknown,
  options: { publicOnly: boolean },
): Promise<ProductListResult> {
  const query: ProductQueryInput = parseOrThrow(productQuerySchema, rawQuery);

  const filters: ProductFilter[] = [];

  if (options.publicOnly) {
    filters.push({ status: 'active' });
  } else if (query.status) {
    filters.push({ status: query.status });
  }

  const categoryFilter = await resolveCategoryFilter(query.category);
  if (categoryFilter) filters.push(categoryFilter);

  const searchFilter = buildProductSearchFilter(query.search);
  if (searchFilter) filters.push(searchFilter);

  const priceFilter = buildPriceFilter(query.minPrice, query.maxPrice);
  if (priceFilter) filters.push(priceFilter);

  if (query.featured === true) filters.push({ featured: true });
  if (query.featured === false) filters.push({ featured: false });
  if (query.kind) filters.push({ productKind: query.kind });
  if (query.inStock === true) filters.push({ stock: { $gt: 0 } });
  if (query.inStock === false) filters.push({ stock: { $lte: 0 } });

  const mongoFilter: ProductFilter =
    filters.length === 0 ? {} : filters.length === 1 ? filters[0]! : { $and: filters };

  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const [total, docs] = await Promise.all([
    Product.countDocuments(mongoFilter),
    Product.find(mongoFilter)
      .sort(sortSpec(query.sort))
      .skip(skip)
      .limit(limit)
      .populate('category', 'name slug')
      .lean(),
  ]);

  return {
    items: docs.map((doc) => toProductListItem(doc as ProductDocument)),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

export function parsePublicQuery(raw: unknown): ProductQueryInput {
  const parsed = parseOrThrow(productQuerySchema, raw);
  // Public clients cannot request non-active statuses.
  if (parsed.status && parsed.status !== 'active') {
    throw badRequest('فیلتر وضعیت برای کاتالوگ عمومی مجاز نیست.');
  }
  return parsed;
}
