import type { MenuCataloguePageScope } from '@/lib/helpers/menuBranchContext';
import type { CatalogueScope } from '@/lib/schemas/menu/menuCategoriesSchema';
import { ApiError } from '@/services/api/types';
import {
  restaurantBranchMenuItemActivatePath,
  restaurantBranchMenuItemDeactivatePath,
  restaurantMenuItemActivatePath,
  restaurantMenuItemDeactivatePath,
} from '@/services/api/ApiUrlsV1';

export type MenuItemStatusMutationInput = Readonly<{
  pageScope: MenuCataloguePageScope | undefined;
  active: boolean;
  itemId: number;
  catalogueScope?: CatalogueScope;
  branchMenuItemId?: number;
  branchId?: number;
  assignmentId?: number;
}>;

export type MenuItemStatusMutationPlan =
  | Readonly<{ kind: 'company-master'; path: string; body: Record<string, never> | { branch_id: number } }>
  | Readonly<{ kind: 'branch-overlay'; path: string; body: Record<string, never> }>;

/** Choose company master vs branch overlay activate/deactivate endpoints. */
export function planMenuItemStatusMutation(input: MenuItemStatusMutationInput): MenuItemStatusMutationPlan {
  const { pageScope, active, itemId, catalogueScope, branchMenuItemId, branchId, assignmentId } = input;

  if (pageScope === 'branch' && catalogueScope === 'company') {
    if (
      branchMenuItemId == null ||
      branchMenuItemId <= 0 ||
      branchId == null ||
      branchId <= 0 ||
      assignmentId == null ||
      assignmentId <= 0
    ) {
      throw new ApiError(
        'Branch menu item overlay id is required to update availability for inherited company items.',
        400,
      );
    }

    const path = active
      ? restaurantBranchMenuItemActivatePath(branchId, assignmentId, branchMenuItemId)
      : restaurantBranchMenuItemDeactivatePath(branchId, assignmentId, branchMenuItemId);

    return { kind: 'branch-overlay', path, body: {} };
  }

  const path = active
    ? restaurantMenuItemActivatePath(itemId)
    : restaurantMenuItemDeactivatePath(itemId);

  const body: Record<string, never> | { branch_id: number } =
    pageScope === 'branch' && branchId != null && branchId > 0 ? { branch_id: branchId } : {};

  return { kind: 'company-master', path, body };
}
