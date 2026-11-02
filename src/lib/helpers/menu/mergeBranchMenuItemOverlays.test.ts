import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  branchMenuItemOverlayMap,
  mergeMenuItemWithBranchOverlay,
} from '@/lib/helpers/menu/mergeBranchMenuItemOverlays';
import type { BranchMenuItemRecord } from '@/lib/schemas/menu/branchMenuItemsSchema';
import type { MenuItemResponse } from '@/lib/schemas/menu/menuItemsSchema';

const companyItem = {
  id: 900,
  organization_id: 1,
  company_id: 2,
  catalogue_scope: 'company',
  branch_id: null,
  category_id: 10,
  taxes: [],
  preparation_stations: [],
  modifier_groups: [],
  name: 'Inherited Biryani',
  code: 'BIR900',
  description: null,
  base_price: 350,
  dietary_type: 'non_veg',
  allow_dine_in: true,
  allow_takeaway: true,
  allow_delivery: false,
  expose_captain_app: false,
  is_favorite: false,
  is_combo: false,
  status: 'active',
  tags: [],
  variants: [],
  images: [],
} satisfies MenuItemResponse;

const overlay = {
  id: 42,
  organization_id: 1,
  company_id: 2,
  branch_id: 5,
  branch_menu_id: 11,
  menu_item_id: 900,
  effective_price: 350,
  is_available: false,
  allow_dine_in: true,
  allow_takeaway: true,
  allow_delivery: false,
  display_order: 0,
  status: 'inactive',
  menu_item: {
    id: 900,
    name: 'Inherited Biryani',
    code: 'BIR900',
    category_id: 10,
    base_price: 350,
    status: 'active',
  },
} satisfies BranchMenuItemRecord;

describe('mergeBranchMenuItemOverlays', () => {
  it('maps menu_item_id to overlay and exposes branchMenuItemId on catalog rows', () => {
    const map = branchMenuItemOverlayMap([overlay]);
    const merged = mergeMenuItemWithBranchOverlay(companyItem, new Map([['10', 'Mains']]), map);

    assert.equal(merged.id, '900');
    assert.equal(merged.menuItemId, 900);
    assert.equal(merged.branchMenuItemId, 42);
    assert.equal(merged.catalogueScope, 'company');
    assert.equal(merged.status, 'Inactive');
  });

  it('falls back to master status when no overlay exists', () => {
    const merged = mergeMenuItemWithBranchOverlay(companyItem, new Map(), new Map());

    assert.equal(merged.branchMenuItemId, undefined);
    assert.equal(merged.status, 'Available');
  });
});
