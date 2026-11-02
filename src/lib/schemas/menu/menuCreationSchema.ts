import type { z as Zod } from 'zod';
import { z } from 'zod';

import type { MenuItemResponse } from '@/lib/schemas/menu/menuItemsSchema';

/** Category and menu session names must be longer than 3 characters (min 4 after trim). */
export const CATALOGUE_NAME_MIN_LENGTH = 4;

export const catalogueNameSchema = z
  .string()
  .trim()
  .min(CATALOGUE_NAME_MIN_LENGTH, 'Name must be more than 3 characters');

/** Menu item online display name must be longer than 2 characters (min 3 after trim). */
export const MENU_ITEM_ONLINE_DISPLAY_NAME_MIN_LENGTH = 3;

export const menuItemOnlineDisplayNameSchema = z
  .string()
  .trim()
  .min(
    MENU_ITEM_ONLINE_DISPLAY_NAME_MIN_LENGTH,
    'Online Display Name must be more than 2 characters',
  );

/** Menu / session title — more than 2 characters (min 3 after trim). */
export const menuSessionNameSchema = z
  .string()
  .trim()
  .min(MENU_ITEM_ONLINE_DISPLAY_NAME_MIN_LENGTH, 'Session name must be more than 2 characters');

export const menuCreationScopeSchema = z.enum(['company', 'branch', 'organization']);

export const menuCategoryStatusSchema = z.enum(['Active', 'Inactive']);

export const dietaryTypeSchema = z.enum(['Veg', 'Non-Veg', 'Egg', 'Vegan']);

export const menuItemStatusSchema = z.enum([
  'Available',
  'Out of Stock',
  'Hidden',
  'Active',
  'Inactive',
]);

export const menuCreationViewModeSchema = z.enum([
  'list',
  'create-category',
  'edit-category',
  'create-item',
  'edit-item',
  'view-item',
]);

export const menuCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: menuCategoryStatusSchema,
  description: z.string().optional(),
  displayOrder: z.number().int(),
  parentId: z.number().int().nullable().optional(),
});

export const menuCatalogItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  categoryId: z.string().min(1),
  categoryName: z.string().min(1),
  basePrice: z.number().min(0),
  dietary: dietaryTypeSchema,
  status: menuItemStatusSchema,
  code: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  orderTypes: z.array(z.string()),
  tags: z.array(z.string()).default([]),
  /** Company master id (same as `id` for company list; explicit for branch merge). */
  menuItemId: z.number().int().positive().optional(),
  /** BranchMenuItem overlay id — use for branch activate/deactivate on inherited company items. */
  branchMenuItemId: z.number().int().positive().optional(),
  catalogueScope: z.enum(['company', 'branch']).optional(),
});

export const menuPageConfigSchema = z.object({
  scope: menuCreationScopeSchema,
  canManageCategories: z.boolean(),
  homeHref: z.string().min(1),
  pageTitle: z.string().min(1),
  pageSubtitle: z.string().min(1),
});

export const createCategoryInputSchema = z.object({
  name: catalogueNameSchema,
  description: z.string().trim().optional(),
});

export const variantItemSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, 'Variant name is required'),
  price: z.number().min(0, 'Price must be positive'),
});

export const modifierItemSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, 'Modifier name is required'),
  price: z.number().min(0, 'Price must be positive'),
  /** v1 create path: existing modifier group id when linking. */
  modifierGroupId: z.number().int().positive().optional(),
});

/** Configuration card fields validated on blur and submit (create / edit item). */
export const menuItemConfigurationSchema = z.object({
  category: z.string().trim().min(1, 'Please select a category'),
  name: catalogueNameSchema,
  onlineDisplayName: menuItemOnlineDisplayNameSchema,
  code: z.string().trim().min(1, 'Item code is required'),
  itemPrice: z
    .string()
    .trim()
    .refine((val) => {
      const priceNum = parseFloat(val);
      return !Number.isNaN(priceNum) && priceNum >= 0;
    }, 'Valid item price is required'),
  gst: z
    .string()
    .trim()
    .refine((val) => {
      const gstId = Number(val);
      return val.length > 0 && Number.isFinite(gstId) && gstId > 0;
    }, 'Select a GST rate'),
  orderTypes: z.array(z.string()).min(1, 'Select at least one order type'),
});

export type MenuItemConfigurationField = keyof z.infer<typeof menuItemConfigurationSchema>;

export const createMenuItemFormSchema = z.object({
  category: z.string().trim().min(1, 'Category is required'),
  name: catalogueNameSchema,
  onlineDisplayName: menuItemOnlineDisplayNameSchema,
  code: z.string().trim().min(1, 'Item code is required'),
  itemPrice: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseFloat(val) || 0 : val))
    .refine((val) => !isNaN(val) && val >= 0, 'Item price must be 0 or greater'),
  profitMargin: z.string().trim().optional(),
  gst: z.string().trim().optional(),
  description: z.string().trim().optional(),
  dietaryType: z.enum(['Veg', 'Non-Veg', 'Egg']),
  orderTypes: z.array(z.string()).min(1, 'Select at least one order type'),
  exposedIn: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  variants: z.array(variantItemSchema).default([]),
  modifiers: z.array(modifierItemSchema).default([]),
});

export type MenuCreationScope = z.infer<typeof menuCreationScopeSchema>;
export type MenuCreationViewMode = z.infer<typeof menuCreationViewModeSchema>;
export type MenuCategory = z.infer<typeof menuCategorySchema>;
export type MenuCatalogItem = z.infer<typeof menuCatalogItemSchema>;
export type MenuPageConfig = z.infer<typeof menuPageConfigSchema>;
export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;
export type VariantItem = z.infer<typeof variantItemSchema>;
export type ModifierItem = z.infer<typeof modifierItemSchema>;

/** Variant or modifier row from the add/edit option modal. */
export type ItemOptionFormPayload = {
  name: string;
  price: number;
};

export type CreateMenuItemFormValues = z.infer<typeof createMenuItemFormSchema>;

/** Create-item submit payload (form + optional upload file). */
export type CreateMenuItemSubmitValues = CreateMenuItemFormValues & {
  imageFile?: File | null;
  /** New uploads for PATCH multipart (v2 update). */
  imageFiles?: File[];
  /** Lowercase tag label → tag definition id (from POST item-tags or existing items). */
  tagIdsByName?: Record<string, number>;
  /** GET item body for PATCH v2 (expected_updated_at + nested sync). */
  initialDetail?: MenuItemResponse;
};

/** First Zod issue message for a top-level field key (menu form blur validation). */
export function zodFieldMessage(
  schema: Zod.ZodType,
  data: unknown,
  field: PropertyKey,
): string | undefined {
  const parsed = schema.safeParse(data);
  if (parsed.success) return undefined;
  const issue = parsed.error.issues.find((entry) => entry.path[0] === field);
  return issue?.message;
}
