import { z } from 'zod';

import { statusBasicSchema } from '@/lib/schemas/menu/menuCategoriesSchema';
import { ApiError } from '@/services/api/types';

const nullableText = z.string().nullable().optional();

export const branchMenuItemMenuSummarySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  code: nullableText,
  category_id: z.number().int(),
  base_price: z.number(),
  status: statusBasicSchema,
});

/** Branch menu item overlay from GET …/branches/{branch_id}/menus/{assignment_id}/items */
export const branchMenuItemRecordSchema = z.object({
  id: z.number().int(),
  organization_id: z.number().int(),
  company_id: z.number().int(),
  branch_id: z.number().int(),
  branch_menu_id: z.number().int(),
  menu_item_id: z.number().int(),
  selling_price: z.number().nullable().optional(),
  effective_price: z.number(),
  is_available: z.boolean(),
  allow_dine_in: z.boolean(),
  allow_takeaway: z.boolean(),
  allow_delivery: z.boolean(),
  display_order: z.number().int(),
  status: statusBasicSchema,
  menu_item: branchMenuItemMenuSummarySchema,
});

export type BranchMenuItemRecord = z.infer<typeof branchMenuItemRecordSchema>;

export type BranchMenuItemListParams = Readonly<{
  page?: number;
  page_size?: number;
  status?: 'active' | 'inactive';
  search?: string;
}>;

const pagedBranchMenuItemsSchema = z.object({
  items: z.array(branchMenuItemRecordSchema),
  total: z.number().int(),
  page: z.number().int(),
  page_size: z.number().int(),
});

export function parseBranchMenuItemList(payload: unknown): z.infer<typeof pagedBranchMenuItemsSchema> {
  const envelope = z
    .object({
      success: z.literal(true),
      data: pagedBranchMenuItemsSchema,
      message: z.string().optional(),
    })
    .safeParse(payload);

  if (!envelope.success) {
    throw new ApiError('Invalid branch menu items response.', 502);
  }

  return envelope.data.data;
}
