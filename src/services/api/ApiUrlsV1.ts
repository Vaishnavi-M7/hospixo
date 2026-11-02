/**
 * Version 1 endpoint catalog.
 * Paths mirror src/features/<domain>/<module>/<screen>.
 * This file is the only place those paths are defined.
 */

import ApiUrlsV2 from './ApiUrlsV2';

type EndpointResource = {
  list: string;
  create: string;
  detail: (id: string) => string;
  update: (id: string) => string;
  remove: (id: string) => string;
};

function resource(path: string): EndpointResource {
  const item = (id: string) => `${path}/${encodeURIComponent(id)}`;

  return {
    list: path,
    create: path,
    detail: item,
    update: item,
    remove: item,
  };
}

const ApiUrlsV1 = {
  auth: {
    login: '/v1/auth/login',
    logout: '/v1/auth/logout',
    me: '/v1/auth/me',
    changePassword: '/v1/auth/change-password',
  },
  invitations: {
    accept: '/v1/invitations/accept',
    reject: '/v1/invitations/reject',
  },
  pos: {
    pointOfSale: {
      /** GET/POST /v1/branches/{branch_id}/orders — All Orders list + create + detail + items + submit */
      allOrders: {
        list: (branchId: number | string) => branchOrdersPath(branchId),
        create: (branchId: number | string) => branchOrdersPath(branchId),
        detail: (branchId: number | string, orderId: number | string) =>
          branchOrderDetailPath(branchId, orderId),
        /** POST /v1/branches/{branch_id}/orders/{order_id}/items */
        items: (branchId: number | string, orderId: number | string) =>
          branchOrderItemsPath(branchId, orderId),
        /** DELETE /v1/branches/{branch_id}/orders/{order_id}/items/{item_id} */
        item: (branchId: number | string, orderId: number | string, itemId: number | string) =>
          branchOrderItemPath(branchId, orderId, itemId),
        /** POST /v1/branches/{branch_id}/orders/{order_id}/submit */
        submit: (branchId: number | string, orderId: number | string) =>
          branchOrderSubmitPath(branchId, orderId),
        /** POST /v1/branches/{branch_id}/orders/{order_id}/pay/razorpay/order */
        razorpayOrder: (branchId: number | string, orderId: number | string) =>
          branchOrderRazorpayOrderPath(branchId, orderId),
        /** POST /v1/branches/{branch_id}/orders/{order_id}/pay/razorpay/confirm */
        razorpayConfirm: (branchId: number | string, orderId: number | string) =>
          branchOrderRazorpayConfirmPath(branchId, orderId),
        /** GET /v1/branches/{branch_id}/orders/{order_id}/bill */
        bill: (branchId: number | string, orderId: number | string) =>
          branchOrderBillPath(branchId, orderId),
        /** GET /v1/branches/{branch_id}/orders/{order_id}/receipt */
        receipt: (branchId: number | string, orderId: number | string) =>
          branchOrderReceiptPath(branchId, orderId),
      },
      cashAndShift: {
        ...resource('/v1/pos/point-of-sale/cash-and-shift'),
        /** GET /v1/branches/{branch_id}/shifts/current */
        current: (branchId: number | string) => branchShiftsCurrentPath(branchId),
      },
      /** Cash Counter UI — live paths under /v1/branches/{branch_id}/cash-registers */
      cashCounter: {
        list: (branchId: number | string) => branchCashRegistersPath(branchId),
        create: (branchId: number | string) => branchCashRegistersPath(branchId),
        detail: (branchId: number | string, registerId: number | string) =>
          branchCashRegisterPath(branchId, registerId),
        update: (branchId: number | string, registerId: number | string) =>
          branchCashRegisterPath(branchId, registerId),
      },
      dashboard: resource('/v1/pos/point-of-sale/dashboard'),
      dineIn: resource('/v1/pos/point-of-sale/dine-in'),
      duePayments: resource('/v1/pos/point-of-sale/due-payments'),
      readyList: resource('/v1/pos/point-of-sale/ready-list'),
      reservation: resource('/v1/pos/point-of-sale/reservation'),
      tables: resource('/v1/pos/point-of-sale/tables'),
      takeaway: resource('/v1/pos/point-of-sale/takeaway'),
      kitchenDisplay: resource('/v1/kitchen-display'),
    },
  },
  operations: {
    kitchenDisplay: resource('/v1/operations/kitchen-display'),
  },

  /** Live Swagger user APIs; feature UI is under `features/employees/user-roles`. */
  users: resource('/v1/users'),
  roles: {
    ...resource('/v1/roles'),
    templates: '/v1/roles/templates',
  },
  permissions: {
    grouped: '/v1/permissions/grouped',
  },
  dashboard: {
    organization: resource('/v1/dashboard/organization'),
    company: resource('/v1/dashboard/company'),
    branch: resource('/v1/dashboard/branch'),
    branchDetail: (branchId: number | string) =>
      `${ApiUrlsV1.restaurant.branches}/${encodeURIComponent(String(branchId))}/dashboard`,
    /** GET /v1/companies/{company_id}/dashboard */
    companyDetail: (companyId: number | string) =>
      `${ApiUrlsV1.organization.companies}/${encodeURIComponent(String(companyId))}/dashboard`,
    /** GET /v1/organizations/{organization_id}/dashboard — allowlist pattern (BFF). */
    organizationDetailPath: '/v1/organizations/{organization_id}/dashboard',
    organizationDetail: (organizationId: number | string) =>
      `/v1/organizations/${encodeURIComponent(String(organizationId))}/dashboard`,
  },
  organization: {
    companies: '/v1/companies',
    platformOrganizations: '/v1/platform/organizations',
    platformOrganizationsV2: '/v2/platform/organizations',
    platformOrganizationCompaniesV2: '/v2/platform/organizations/{organization_id}/companies',
  },
  restaurant: {
    branches: '/v1/branches',
    branchMenuAssignments: '/v1/restaurant/branches',
    preparationStations: '/v1/restaurant/preparation-stations',
    gstRates: '/v1/restaurant/gst-rates',
    menuCategories: resource('/v1/restaurant/menu/categories'),
    menuItems: resource('/v1/restaurant/menu/items'),
    /** POST /v1/restaurant/menu/item-tags */
    menuItemTags: {
      list: '/v1/restaurant/menu/item-tags',
      create: '/v1/restaurant/menu/item-tags',
    },
    /** GET /v1/restaurant/branches/{branch_id}/menus — restaurant branch menus list */
    branchMenus: {
      /** Prefix for session-bearer matching and nested branch menu paths. */
      root: '/v1/restaurant/branches',
      list: (branchId: number | string) => restaurantBranchMenusPath(branchId),
    },
    /** GET/POST /v1/restaurant/menus */
    menus: {
      list: '/v1/restaurant/menus',
      create: '/v1/restaurant/menus',
      /** GET /v1/restaurant/menus/{menu_id}/tree — BFF allowlist pattern. */
      companyTree: '/v1/restaurant/menus/{menu_id}/tree',
    },
  },
  public: {
    restaurantMenu: '/v1/public/restaurant/menu',
  },
  kitchen: {
    kitchenBoard: resource('/v1/kitchen-display'),
    branchBoard: (branchId: number | string) => branchKitchenBoardPath(branchId),
    branchStatus: (branchId: number | string, orderId: number | string) =>
      branchKitchenStatusPath(branchId, orderId),
  },
};

export function userAssignmentsPath(userId: number | string): string {
  return `${ApiUrlsV1.users.list}/${encodeURIComponent(String(userId))}/assignments`;
}

export function userStatusPath(userId: number | string): string {
  return `${ApiUrlsV1.users.list}/${encodeURIComponent(String(userId))}/status`;
}

export function userRolesPath(userId: number | string): string {
  return `${ApiUrlsV1.users.list}/${encodeURIComponent(String(userId))}/roles`;
}

export function userRolePath(userId: number | string, userRoleId: number | string): string {
  return `${userRolesPath(userId)}/${encodeURIComponent(String(userRoleId))}`;
}

export function userRolePermissionsPath(
  userId: number | string,
  userRoleId: number | string,
): string {
  return `${userRolePath(userId, userRoleId)}/permissions`;
}

export function rolePermissionsPath(roleId: number | string): string {
  return `${ApiUrlsV1.roles.detail(String(roleId))}/permissions`;
}

export function branchKitchenBoardPath(branchId: number | string): string {
  return `${ApiUrlsV1.restaurant.branches}/${encodeURIComponent(String(branchId))}/kitchen-board`;
}

/** WebSocket path for branch POS order events (browser uses SSE relay). */
export function branchOrderEventsWsPath(branchId: number | string): string {
  return `/v1/ws/branches/${encodeURIComponent(String(branchId))}/orders`;
}

export function buildBranchOrderEventsWsUrl(apiBaseUrl: string, branchId: number | string): string {
  const httpBase = apiBaseUrl.replace(/\/+$/, '');
  const wsBase = httpBase.replace(/^http/i, 'ws');
  return `${wsBase}/api${branchOrderEventsWsPath(branchId)}`;
}

export function branchKitchenStatusPath(
  branchId: number | string,
  orderId: number | string,
): string {
  return `${ApiUrlsV1.restaurant.branches}/${encodeURIComponent(String(branchId))}/orders/${encodeURIComponent(String(orderId))}/kitchen-status`;
}

/** GET/POST /v1/branches/{branch_id}/orders */
export function branchOrdersPath(branchId: number | string): string {
  return `${ApiUrlsV1.restaurant.branches}/${encodeURIComponent(String(branchId))}/orders`;
}

/** GET /v1/branches/{branch_id}/orders/{order_id} */
export function branchOrderDetailPath(branchId: number | string, orderId: number | string): string {
  return `${branchOrdersPath(branchId)}/${encodeURIComponent(String(orderId))}`;
}

/** POST /v1/branches/{branch_id}/orders/{order_id}/items */
export function branchOrderItemsPath(branchId: number | string, orderId: number | string): string {
  return `${branchOrderDetailPath(branchId, orderId)}/items`;
}

/** DELETE /v1/branches/{branch_id}/orders/{order_id}/items/{item_id} */
export function branchOrderItemPath(
  branchId: number | string,
  orderId: number | string,
  itemId: number | string,
): string {
  return `${branchOrderItemsPath(branchId, orderId)}/${encodeURIComponent(String(itemId))}`;
}

/** POST /v1/branches/{branch_id}/orders/{order_id}/submit */
export function branchOrderSubmitPath(branchId: number | string, orderId: number | string): string {
  return `${branchOrderDetailPath(branchId, orderId)}/submit`;
}

/** POST /v1/branches/{branch_id}/orders/{order_id}/pay/razorpay/order */
export function branchOrderRazorpayOrderPath(
  branchId: number | string,
  orderId: number | string,
): string {
  return `${branchOrderDetailPath(branchId, orderId)}/pay/razorpay/order`;
}

/** POST /v1/branches/{branch_id}/orders/{order_id}/pay/razorpay/confirm */
export function branchOrderRazorpayConfirmPath(
  branchId: number | string,
  orderId: number | string,
): string {
  return `${branchOrderDetailPath(branchId, orderId)}/pay/razorpay/confirm`;
}

/** GET /v1/branches/{branch_id}/orders/{order_id}/bill */
export function branchOrderBillPath(branchId: number | string, orderId: number | string): string {
  return `${branchOrderDetailPath(branchId, orderId)}/bill`;
}

/** GET /v1/branches/{branch_id}/orders/{order_id}/receipt */
export function branchOrderReceiptPath(
  branchId: number | string,
  orderId: number | string,
): string {
  return `${branchOrderDetailPath(branchId, orderId)}/receipt`;
}

/** GET/POST /v1/branches/{branch_id}/meal-sessions */
export function branchMealSessionsPath(branchId: number | string): string {
  return `${ApiUrlsV1.restaurant.branches}/${encodeURIComponent(String(branchId))}/meal-sessions`;
}

/** PATCH /v1/branches/{branch_id}/meal-sessions/{session_id} */
export function branchMealSessionPath(
  branchId: number | string,
  sessionId: number | string,
): string {
  return `${branchMealSessionsPath(branchId)}/${encodeURIComponent(String(sessionId))}`;
}

/** GET /v1/branches/{branch_id}/tables/availability */
export function branchTablesAvailabilityPath(branchId: number | string): string {
  return `${ApiUrlsV1.restaurant.branches}/${encodeURIComponent(String(branchId))}/tables/availability`;
}

/** GET /v1/branches/{branch_id}/shifts/current */
export function branchShiftsCurrentPath(branchId: number | string): string {
  return `${ApiUrlsV1.restaurant.branches}/${encodeURIComponent(String(branchId))}/shifts/current`;
}

/** GET/POST /v1/branches/{branch_id}/cash-registers */
export function branchCashRegistersPath(branchId: number | string): string {
  return `${ApiUrlsV1.restaurant.branches}/${encodeURIComponent(String(branchId))}/cash-registers`;
}

/** GET/PATCH /v1/branches/{branch_id}/cash-registers/{register_id} */
export function branchCashRegisterPath(
  branchId: number | string,
  registerId: number | string,
): string {
  return `${branchCashRegistersPath(branchId)}/${encodeURIComponent(String(registerId))}`;
}

/** GET /v1/branches/{branch_id}/reports/overview */
export function branchReportsOverviewPath(branchId: number | string): string {
  return `${ApiUrlsV1.restaurant.branches}/${encodeURIComponent(String(branchId))}/reports/overview`;
}

/** GET /v1/branches/{branch_id}/reports/sales */
export function branchReportsSalesPath(branchId: number | string): string {
  return `${ApiUrlsV1.restaurant.branches}/${encodeURIComponent(String(branchId))}/reports/sales`;
}

/** GET /v1/branches/{branch_id}/reports/orders/summary */
export function branchReportsOrdersSummaryPath(branchId: number | string): string {
  return `${ApiUrlsV1.restaurant.branches}/${encodeURIComponent(String(branchId))}/reports/orders/summary`;
}

/** GET /v1/branches/{branch_id}/reports/orders */
export function branchReportsOrdersPath(branchId: number | string): string {
  return `${ApiUrlsV1.restaurant.branches}/${encodeURIComponent(String(branchId))}/reports/orders`;
}

/** GET /v1/branches/{branch_id}/reports/sessions */
export function branchReportsSessionsPath(branchId: number | string): string {
  return `${ApiUrlsV1.restaurant.branches}/${encodeURIComponent(String(branchId))}/reports/sessions`;
}

/** GET /v1/branches/{branch_id}/reports/payments */
export function branchReportsPaymentsPath(branchId: number | string): string {
  return `${ApiUrlsV1.restaurant.branches}/${encodeURIComponent(String(branchId))}/reports/payments`;
}

/** GET /v1/branches/{branch_id}/reports/users-logs */
export function branchReportsUsersLogsPath(branchId: number | string): string {
  return `${ApiUrlsV1.restaurant.branches}/${encodeURIComponent(String(branchId))}/reports/users-logs`;
}

/** GET /v2/platform/organizations/{organization_id}/companies */
export function organizationCompaniesPath(organizationId: number | string): string {
  return ApiUrlsV1.organization.platformOrganizationCompaniesV2.replace(
    '{organization_id}',
    encodeURIComponent(String(organizationId)),
  );
}

/** GET /v1/restaurant/branches/{branch_id}/menus — restaurant branch menus list */
export function restaurantBranchMenusPath(branchId: number | string): string {
  return `${ApiUrlsV1.restaurant.branchMenus.root}/${encodeURIComponent(String(branchId))}/menus`;
}

/** POST /v1/restaurant/branches/{branch_id}/menus/{assignment_id}/activate | .../deactivate */
export function restaurantBranchMenuAssignmentPath(
  branchId: number | string,
  assignmentId: number | string,
): string {
  return `${restaurantBranchMenusPath(branchId)}/${encodeURIComponent(String(assignmentId))}`;
}

export function restaurantBranchMenuActivatePath(
  branchId: number | string,
  assignmentId: number | string,
): string {
  return `${restaurantBranchMenuAssignmentPath(branchId, assignmentId)}/activate`;
}

export function restaurantBranchMenuDeactivatePath(
  branchId: number | string,
  assignmentId: number | string,
): string {
  return `${restaurantBranchMenuAssignmentPath(branchId, assignmentId)}/deactivate`;
}

/** GET/POST /v1/restaurant/menus */
export function restaurantMenusPath(): string {
  return ApiUrlsV1.restaurant.menus.create;
}

/** GET/PATCH /v1/restaurant/menus/{menu_id} */
export function restaurantMenuPath(menuId: number | string): string {
  return `${restaurantMenusPath()}/${encodeURIComponent(String(menuId))}`;
}

/** POST /v1/restaurant/menus/{menu_id}/activate */
export function restaurantMenuActivatePath(menuId: number | string): string {
  return `${restaurantMenuPath(menuId)}/activate`;
}

/** POST /v1/restaurant/menus/{menu_id}/deactivate */
export function restaurantMenuDeactivatePath(menuId: number | string): string {
  return `${restaurantMenuPath(menuId)}/deactivate`;
}

/** POST /v1/restaurant/menus/{menu_id}/category-assignments */
export function restaurantMenuCategoryAssignmentsPath(menuId: number | string): string {
  return `${restaurantMenuPath(menuId)}/category-assignments`;
}

/** GET /v1/restaurant/branches/{branch_id}/menus/{assignment_id}/tree */
export function restaurantBranchMenuTreePath(
  branchId: number | string,
  assignmentId: number | string,
): string {
  return `${restaurantBranchMenuAssignmentPath(branchId, assignmentId)}/tree`;
}

/** GET/PATCH …/branches/{branch_id}/menus/{assignment_id}/items */
export function restaurantBranchMenuItemsPath(
  branchId: number | string,
  assignmentId: number | string,
): string {
  return `${restaurantBranchMenuAssignmentPath(branchId, assignmentId)}/items`;
}

export function restaurantBranchMenuItemPath(
  branchId: number | string,
  assignmentId: number | string,
  branchMenuItemId: number | string,
): string {
  return `${restaurantBranchMenuItemsPath(branchId, assignmentId)}/${encodeURIComponent(String(branchMenuItemId))}`;
}

/** POST …/items/{branch_menu_item_id}/activate | …/deactivate */
export function restaurantBranchMenuItemActivatePath(
  branchId: number | string,
  assignmentId: number | string,
  branchMenuItemId: number | string,
): string {
  return `${restaurantBranchMenuItemPath(branchId, assignmentId, branchMenuItemId)}/activate`;
}

export function restaurantBranchMenuItemDeactivatePath(
  branchId: number | string,
  assignmentId: number | string,
  branchMenuItemId: number | string,
): string {
  return `${restaurantBranchMenuItemPath(branchId, assignmentId, branchMenuItemId)}/deactivate`;
}

/** GET/POST /v1/restaurant/gst-rates */
export function restaurantGstRatesPath(): string {
  return ApiUrlsV1.restaurant.gstRates;
}

/** GET /v1/restaurant/gst-rates/{gst_rate_id} */
export function restaurantGstRatePath(gstRateId: number | string): string {
  return `${restaurantGstRatesPath()}/${encodeURIComponent(String(gstRateId))}`;
}

/** GET/POST /v1/restaurant/menu/categories */
export function restaurantMenuCategoriesPath(): string {
  return ApiUrlsV1.restaurant.menuCategories.list;
}

/** GET/PATCH /v1/restaurant/menu/categories/{category_id} */
export function restaurantMenuCategoryPath(categoryId: number | string): string {
  return ApiUrlsV1.restaurant.menuCategories.detail(String(categoryId));
}

/** POST /v1/restaurant/menu/categories/{category_id}/activate */
export function restaurantMenuCategoryActivatePath(categoryId: number | string): string {
  return `${restaurantMenuCategoryPath(categoryId)}/activate`;
}

/** POST /v1/restaurant/menu/categories/{category_id}/deactivate */
export function restaurantMenuCategoryDeactivatePath(categoryId: number | string): string {
  return `${restaurantMenuCategoryPath(categoryId)}/deactivate`;
}

/** POST /v1/restaurant/menu/item-tags */
export function restaurantMenuItemTagsPath(): string {
  return ApiUrlsV1.restaurant.menuItemTags.create;
}

/** GET/POST /v1/restaurant/menu/items */
export function restaurantMenuItemsPath(): string {
  return ApiUrlsV1.restaurant.menuItems.list;
}

/** GET /v1/restaurant/menu/items/{item_id} */
export function restaurantMenuItemPath(itemId: number | string): string {
  return ApiUrlsV1.restaurant.menuItems.detail(String(itemId));
}

/** POST /v1/restaurant/menu/items/{item_id}/activate */
export function restaurantMenuItemActivatePath(itemId: number | string): string {
  return `${restaurantMenuItemPath(itemId)}/activate`;
}

/** POST /v1/restaurant/menu/items/{item_id}/deactivate */
export function restaurantMenuItemDeactivatePath(itemId: number | string): string {
  return `${restaurantMenuItemPath(itemId)}/deactivate`;
}

export function restaurantFloorsPath(branchId: number): string {
  return `${ApiUrlsV1.restaurant.branches}/${branchId}/floors`;
}

export function restaurantFloorPath(branchId: number, floorId: number): string {
  return `${restaurantFloorsPath(branchId)}/${floorId}`;
}

export function restaurantFloorArchivePath(branchId: number, floorId: number): string {
  return `${restaurantFloorPath(branchId, floorId)}/archive`;
}

export function restaurantFloorRestorePath(branchId: number, floorId: number): string {
  return `${restaurantFloorPath(branchId, floorId)}/restore`;
}

export function restaurantFloorSectionsPath(branchId: number, floorId: number): string {
  return `${restaurantFloorPath(branchId, floorId)}/sections`;
}

export function restaurantFloorSectionPath(
  branchId: number,
  floorId: number,
  sectionId: number,
): string {
  return `${restaurantFloorSectionsPath(branchId, floorId)}/${sectionId}`;
}

export function restaurantFloorSectionArchivePath(
  branchId: number,
  floorId: number,
  sectionId: number,
): string {
  return `${restaurantFloorSectionPath(branchId, floorId, sectionId)}/archive`;
}

export function restaurantSectionTablesPath(
  branchId: number,
  floorId: number,
  sectionId: number,
): string {
  return `${restaurantFloorSectionPath(branchId, floorId, sectionId)}/tables`;
}

export function restaurantSectionTablesBulkPath(
  branchId: number,
  floorId: number,
  sectionId: number,
): string {
  return `${restaurantSectionTablesPath(branchId, floorId, sectionId)}/bulk`;
}

export function restaurantSectionFloorMapPath(
  branchId: number,
  floorId: number,
  sectionId: number,
): string {
  return `${restaurantFloorSectionPath(branchId, floorId, sectionId)}/floor-map`;
}

export function restaurantSectionTablePath(
  branchId: number,
  floorId: number,
  sectionId: number,
  tableId: number,
): string {
  return `${restaurantSectionTablesPath(branchId, floorId, sectionId)}/${tableId}`;
}

export function restaurantSectionTableMovePath(
  branchId: number,
  floorId: number,
  sectionId: number,
  tableId: number,
): string {
  return `${restaurantSectionTablePath(branchId, floorId, sectionId, tableId)}/move`;
}

export function restaurantSectionTableArchivePath(
  branchId: number,
  floorId: number,
  sectionId: number,
  tableId: number,
): string {
  return `${restaurantSectionTablePath(branchId, floorId, sectionId, tableId)}/archive`;
}

export function restaurantSectionTableRestorePath(
  branchId: number,
  floorId: number,
  sectionId: number,
  tableId: number,
): string {
  return `${restaurantSectionTablePath(branchId, floorId, sectionId, tableId)}/restore`;
}

export function restaurantFloorSectionRestorePath(
  branchId: number,
  floorId: number,
  sectionId: number,
): string {
  return `${restaurantFloorSectionPath(branchId, floorId, sectionId)}/restore`;
}

/** BFF allowlist: v1 catalog + explicit v2 paths (see ApiUrlsV2). */
const ENDPOINT_PREFIXES = [...collectStaticPaths(ApiUrlsV1), ...collectStaticPaths(ApiUrlsV2)];

const PUBLIC_ENDPOINTS = new Set<string>([
  ApiUrlsV1.auth.login,
  ApiUrlsV1.invitations.accept,
  ApiUrlsV1.invitations.reject,
  ApiUrlsV1.public.restaurantMenu,
]);

export function isPublicEndpoint(path: string): boolean {
  return PUBLIC_ENDPOINTS.has(path);
}

export function isAllowedEndpoint(path: string): boolean {
  const normalized = normalizeEndpointPath(path);
  if (!normalized) return false;

  return ENDPOINT_PREFIXES.some((prefix) => matchesEndpoint(normalized, prefix));
}

/** `{organization_id}` in a catalog path matches one URL segment. */
function matchesEndpoint(path: string, pattern: string): boolean {
  if (!pattern.includes('{')) {
    return path === pattern || path.startsWith(`${pattern}/`);
  }

  const expression = new RegExp(
    `^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{[^}]+\\\}/g, '[^/]+')}(?:/|$)`,
  );
  return expression.test(path);
}

function collectStaticPaths(node: unknown, paths: string[] = []): string[] {
  if (typeof node === 'string') {
    paths.push(node);
    return paths;
  }

  if (!node || typeof node !== 'object') {
    return paths;
  }

  for (const value of Object.values(node)) {
    collectStaticPaths(value, paths);
  }

  return paths;
}

function normalizeEndpointPath(path: string): string | null {
  if (!path.startsWith('/') || path.includes('\\') || path.includes('//')) {
    return null;
  }

  const segments = path.split('/');
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    return null;
  }

  return path;
}

export default ApiUrlsV1;
