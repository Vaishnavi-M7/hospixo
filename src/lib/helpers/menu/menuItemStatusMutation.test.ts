import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { planMenuItemStatusMutation } from '@/lib/helpers/menu/menuItemStatusMutation';

describe('planMenuItemStatusMutation', () => {
  it('uses branch overlay deactivate for inherited company items at branch scope', () => {
    const plan = planMenuItemStatusMutation({
      pageScope: 'branch',
      active: false,
      itemId: 900,
      catalogueScope: 'company',
      branchMenuItemId: 42,
      branchId: 5,
      assignmentId: 11,
    });

    assert.equal(plan.kind, 'branch-overlay');
    assert.equal(
      plan.path,
      '/v1/restaurant/branches/5/menus/11/items/42/deactivate',
    );
  });

  it('uses branch overlay activate for inherited company items at branch scope', () => {
    const plan = planMenuItemStatusMutation({
      pageScope: 'branch',
      active: true,
      itemId: 900,
      catalogueScope: 'company',
      branchMenuItemId: 42,
      branchId: 5,
      assignmentId: 11,
    });

    assert.equal(plan.kind, 'branch-overlay');
    assert.equal(plan.path, '/v1/restaurant/branches/5/menus/11/items/42/activate');
  });

  it('keeps company master endpoints for company scope', () => {
    const plan = planMenuItemStatusMutation({
      pageScope: 'company',
      active: true,
      itemId: 12,
      catalogueScope: 'company',
    });

    assert.equal(plan.kind, 'company-master');
    assert.equal(plan.path, '/v1/restaurant/menu/items/12/activate');
    assert.deepEqual(plan.body, {});
  });

  it('uses company master endpoints for branch-owned items at branch scope', () => {
    const plan = planMenuItemStatusMutation({
      pageScope: 'branch',
      active: false,
      itemId: 77,
      catalogueScope: 'branch',
      branchId: 5,
      assignmentId: 11,
    });

    assert.equal(plan.kind, 'company-master');
    assert.equal(plan.path, '/v1/restaurant/menu/items/77/deactivate');
    assert.deepEqual(plan.body, { branch_id: 5 });
  });
});
