import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

import {
  STORE_STATUSES,
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  DEFAULT_COUNTRY,
  DEFAULT_ORDER_PREFIX,
  FREE_SHIPPING_THRESHOLD,
  type StoreStatus,
} from '../config/constants';

/** Public branding & commerce settings — safe for storefront APIs. */
export interface StorePublicConfig {
  displayName: string;
  logo?: string;
  currency: string;
  locale: string;
  timezone: string;
  country: string;
  orderPrefix: string;
  freeShippingThreshold: number;
  shippingMethods: Array<{
    code: string;
    label: string;
    baseFee: number;
  }>;
}

/**
 * Private operational config — never returned on public storefront endpoints.
 * Secrets live in env/secret managers referenced by these keys, not inline.
 */
export interface StorePrivateConfig {
  payment: {
    provider: 'none' | 'zarinpal' | 'stripe' | 'custom';
    /** Opaque reference / merchant account id — not a raw secret. */
    merchantRef?: string;
    /** Secret material must live outside Mongo (env / vault); never API-readable. */
    credentialsConfigured: boolean;
  };
  notification: {
    provider: 'none' | 'sms' | 'email' | 'custom';
    channelRef?: string;
    credentialsConfigured: boolean;
  };
}

export interface StoreAttrs {
  name: string;
  slug: string;
  status: StoreStatus;
  displayName: string;
  logo?: string;
  domain?: string;
  subdomain?: string;
  currency: string;
  timezone: string;
  locale: string;
  country: string;
  publicConfig: StorePublicConfig;
  privateConfig: StorePrivateConfig;
  createdAt: Date;
  updatedAt: Date;
}

const shippingMethodSchema = new Schema(
  {
    code: { type: String, required: true, trim: true, maxlength: 40 },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    baseFee: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const publicConfigSchema = new Schema<StorePublicConfig>(
  {
    displayName: { type: String, required: true, trim: true, maxlength: 160 },
    logo: { type: String, trim: true, maxlength: 1000 },
    currency: { type: String, required: true, maxlength: 32, default: DEFAULT_CURRENCY },
    locale: { type: String, required: true, maxlength: 16, default: DEFAULT_LOCALE },
    timezone: { type: String, required: true, maxlength: 64, default: DEFAULT_TIMEZONE },
    country: { type: String, required: true, maxlength: 8, default: DEFAULT_COUNTRY },
    orderPrefix: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 12,
      default: DEFAULT_ORDER_PREFIX,
    },
    freeShippingThreshold: {
      type: Number,
      required: true,
      min: 0,
      default: FREE_SHIPPING_THRESHOLD,
    },
    shippingMethods: { type: [shippingMethodSchema], default: [] },
  },
  { _id: false },
);

const privateConfigSchema = new Schema<StorePrivateConfig>(
  {
    payment: {
      provider: {
        type: String,
        enum: ['none', 'zarinpal', 'stripe', 'custom'],
        default: 'none',
      },
      merchantRef: { type: String, trim: true, maxlength: 200 },
      credentialsConfigured: { type: Boolean, default: false },
    },
    notification: {
      provider: {
        type: String,
        enum: ['none', 'sms', 'email', 'custom'],
        default: 'none',
      },
      channelRef: { type: String, trim: true, maxlength: 200 },
      credentialsConfigured: { type: Boolean, default: false },
    },
  },
  { _id: false },
);

const storeSchema = new Schema<StoreAttrs>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: 80,
    },
    status: {
      type: String,
      enum: STORE_STATUSES,
      required: true,
      default: 'active',
      index: true,
    },
    displayName: { type: String, required: true, trim: true, maxlength: 160 },
    logo: { type: String, trim: true, maxlength: 1000 },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 253,
      sparse: true,
      unique: true,
    },
    subdomain: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 63,
      sparse: true,
      unique: true,
    },
    currency: { type: String, required: true, default: DEFAULT_CURRENCY, maxlength: 32 },
    timezone: { type: String, required: true, default: DEFAULT_TIMEZONE, maxlength: 64 },
    locale: { type: String, required: true, default: DEFAULT_LOCALE, maxlength: 16 },
    country: { type: String, required: true, default: DEFAULT_COUNTRY, maxlength: 8 },
    publicConfig: { type: publicConfigSchema, required: true },
    privateConfig: { type: privateConfigSchema, required: true },
  },
  { timestamps: true },
);

storeSchema.index({ status: 1, slug: 1 });

export type StoreDocument = HydratedDocument<StoreAttrs>;
export type StoreId = Types.ObjectId | string;

export const Store = model<StoreAttrs>('Store', storeSchema);

export function defaultPublicConfig(
  overrides: Partial<StorePublicConfig> = {},
): StorePublicConfig {
  return {
    displayName: overrides.displayName ?? 'Luxora',
    logo: overrides.logo,
    currency: overrides.currency ?? DEFAULT_CURRENCY,
    locale: overrides.locale ?? DEFAULT_LOCALE,
    timezone: overrides.timezone ?? DEFAULT_TIMEZONE,
    country: overrides.country ?? DEFAULT_COUNTRY,
    orderPrefix: overrides.orderPrefix ?? DEFAULT_ORDER_PREFIX,
    freeShippingThreshold:
      overrides.freeShippingThreshold ?? FREE_SHIPPING_THRESHOLD,
    shippingMethods: overrides.shippingMethods ?? [
      { code: 'standard', label: 'ارسال عادی', baseFee: 0 },
    ],
  };
}

export function defaultPrivateConfig(
  overrides: Partial<StorePrivateConfig> = {},
): StorePrivateConfig {
  return {
    payment: {
      provider: overrides.payment?.provider ?? 'none',
      merchantRef: overrides.payment?.merchantRef,
      credentialsConfigured: overrides.payment?.credentialsConfigured ?? false,
    },
    notification: {
      provider: overrides.notification?.provider ?? 'none',
      channelRef: overrides.notification?.channelRef,
      credentialsConfigured:
        overrides.notification?.credentialsConfigured ?? false,
    },
  };
}
