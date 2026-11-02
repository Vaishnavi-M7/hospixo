import type { MenuCatalogItem } from '@/lib/schemas/menu/menuCreationSchema';
import type { BranchMenuItemRecord } from '@/lib/schemas/menu/branchMenuItemsSchema';
import type { MenuItemResponse } from '@/lib/schemas/menu/menuItemsSchema';
import { toMenuCatalogItem } from '@/lib/helpers/menuItemHelpers';

export function branchMenuItemOverlayMap(
  overlays: readonly BranchMenuItemRecord[],
): Map<number, BranchMenuItemRecord> {
  const map = new Map<number, BranchMenuItemRecord>();
  for (const row of overlays) {
    map.set(row.menu_item_id, row);
  }
  return map;
}

/** Attach overlay ids and effective branch availability to company menu item list rows. */
export function mergeMenuItemWithBranchOverlay(
  item: MenuItemResponse,
  categoryNameById: Map<string, string>,
  overlayByMenuItemId: ReadonlyMap<number, BranchMenuItemRecord>,
): MenuCatalogItem & { menuItemId: number; catalogueScope: MenuItemResponse['catalogue_scope']; branchMenuItemId?: number } {
  const catalog = toMenuCatalogItem(item, categoryNameById);
  const overlay = overlayByMenuItemId.get(item.id);
  const status =
    overlay != null
      ? overlay.status === 'active' && overlay.is_available
        ? 'Available'
        : 'Inactive'
      : catalog.status;

  return {
    ...catalog,
    status,
    menuItemId: item.id,
    catalogueScope: item.catalogue_scope,
    ...(overlay != null ? { branchMenuItemId: overlay.id } : {}),
  };
}
