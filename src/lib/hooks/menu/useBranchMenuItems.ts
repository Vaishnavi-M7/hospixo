'use client';

import { useQuery } from '@/lib/hooks/api/useQuery';

import {
  parseBranchMenuItemList,
  type BranchMenuItemListParams,
} from '@/lib/schemas/menu/branchMenuItemsSchema';
import { api } from '@/services/api/browserClient';
import { restaurantBranchMenuItemsPath } from '@/services/api/ApiUrlsV1';

export const branchMenuItemsQueryKey = (
  branchId: number | undefined,
  assignmentId: number | undefined,
  params?: BranchMenuItemListParams,
) => ['restaurant', 'branch-menu-items', branchId, assignmentId, params ?? {}] as const;

function listParams(params?: BranchMenuItemListParams) {
  return {
    page: params?.page ?? 1,
    page_size: params?.page_size ?? 500,
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.search?.trim() ? { search: params.search.trim() } : {}),
  };
}

/**
 * List branch menu item overlays for a branch menu assignment.
 * GET /v1/restaurant/branches/{branch_id}/menus/{assignment_id}/items
 */
export function useBranchMenuItems(
  branchId: number | undefined,
  assignmentId: number | undefined,
  params?: BranchMenuItemListParams,
) {
  const enabled =
    branchId != null &&
    branchId > 0 &&
    assignmentId != null &&
    assignmentId > 0;

  return useQuery({
    queryKey: branchMenuItemsQueryKey(branchId, assignmentId, params),
    enabled,
    queryFn: async ({ signal }) => {
      const payload = await api.get(
        restaurantBranchMenuItemsPath(branchId as number, assignmentId as number),
        listParams(params),
        signal,
      );
      return parseBranchMenuItemList(payload);
    },
  });
}
