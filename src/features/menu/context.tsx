'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';

import {
  AVAILABILITY_CHANNELS,
  type AvailabilityDietaryFilter,
  type AvailabilityStatusFilter,
} from '@/lib/mocks/menu/useMenuAvailability.mocks';
import type {
  AvailabilityCategory,
  AvailabilityChannel,
  AvailabilityChannelGroup,
  AvailabilityItem,
  ItemAvailabilityMark,
  MenuAvailabilityPageConfig,
} from '@/lib/schemas/menu/menuAvailabilitySchema';
import type { MenuItemListParams, MenuItemResponse } from '@/lib/schemas/menu/menuItemsSchema';
import type { BranchMenuItemRecord } from '@/lib/schemas/menu/branchMenuItemsSchema';
import { showMenuItemWriteSuccessToast } from '@/lib/helpers/menuItemHelpers';
import {
  createCategoryInputSchema,
  type CreateCategoryInput,
  type CreateMenuItemSubmitValues,
  type MenuCatalogItem,
  type MenuCategory,
  type MenuCreationViewMode,
  type MenuPageConfig,
} from '@/lib/schemas/menu/menuCreationSchema';
import { resolveCatalogueContextIds } from '@/lib/helpers/apiContextHeaders';
import { buildCreateMenuCategoryBody } from '@/lib/helpers/menuBranchContext';
import { buildTagNameToIdMap } from '@/lib/helpers/createMenuItemFormData';
import {
  branchMenuItemOverlayMap,
  mergeMenuItemWithBranchOverlay,
} from '@/lib/helpers/menu/mergeBranchMenuItemOverlays';
import { pickActiveBranchMenuAssignment } from '@/lib/helpers/menu/pickActiveBranchMenuAssignment';
import { toCatalogDietary, toMenuCatalogItem } from '@/lib/helpers/menuItemHelpers';
import { useBranchMenuItems } from '@/lib/hooks/menu/useBranchMenuItems';
import { useBranchMenus } from '@/lib/hooks/menu/menus/menusHooks';
import {
  useCreateMenuCategory,
  useMenuCategories,
  useSetMenuCategoryActive,
  useUpdateMenuCategory,
} from '@/lib/hooks/menu/useMenuCategories';
import {
  menuItemQueryKey,
  useCreateMenuItem,
  useDeactivateMenuItem,
  useMenuItems,
  useSetMenuItemActive,
  useUpdateMenuItem,
} from '@/lib/hooks/menu/useMenuItems';
import type { UpdateMenuCategoryBody } from '@/lib/schemas/menu/menuCategoriesSchema';
import {
  pushMenuCreationList,
  pushMenuCreationView,
  readMenuCreationParamsFromLocation,
  replaceMenuCreationCategoryParam,
} from '@/lib/params/menu';
import { useSidebarStore } from '@/stores/sidebarStore';
import { ApiError } from '@/services/api/types';

function toUpdateCategoryBody(
  category: MenuCategory,
  overrides: Partial<{
    name: string;
    description: string;
    status: 'active' | 'inactive';
    display_order: number;
  }> = {},
): UpdateMenuCategoryBody {
  const body: UpdateMenuCategoryBody = {
    name: overrides.name ?? category.name,
    display_order: overrides.display_order ?? category.displayOrder,
    status: overrides.status ?? (category.status === 'Active' ? 'active' : 'inactive'),
  };
  if (overrides.description !== undefined) {
    body.description = overrides.description;
  } else if (category.description) {
    body.description = category.description;
  }
  if (category.parentId != null) body.parent_id = category.parentId;
  return body;
}

/* -------------------------------------------------------------------------- */
/* Menu Creation                                                              */
/* -------------------------------------------------------------------------- */

export interface MenuCreationContextValue {
  pageConfig: MenuPageConfig;
  viewMode: MenuCreationViewMode;
  categories: MenuCategory[];
  items: MenuCatalogItem[];
  filteredItems: MenuCatalogItem[];
  categoryCounts: Record<string, number>;
  totalItemCount: number;
  activeCategoryId: string | null;
  searchQuery: string;
  selectedItem: MenuCatalogItem | null;
  isCategoriesLoading?: boolean;
  categoriesError?: Error | null;
  isItemsLoading?: boolean;
  itemsError?: Error | null;
  refetchCategories?: () => void;
  refetchItems?: () => void;
  setActiveCategoryId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  listPage: number;
  listPageSize: number;
  listTotal: number;
  setListPage: (page: number) => void;
  openCreateCategory: () => void;
  openEditCategory: (category: MenuCategory) => void;
  openCreateItem: () => void;
  openEditItem: (item: MenuCatalogItem) => void;
  openViewItem: (item: MenuCatalogItem) => void;
  backToList: () => void;
  editingCategory: MenuCategory | null;
  /** POST /v1/restaurant/menu/categories */
  addCategory: (input: CreateCategoryInput) => Promise<void>;
  /** PATCH /v1/restaurant/menu/categories/{id} — edit name/description */
  updateCategory: (input: CreateCategoryInput) => Promise<void>;
  /** POST .../activate | .../deactivate */
  toggleCategoryStatus: (categoryId: string, nextActive: boolean) => Promise<void>;
  addItem: (data: CreateMenuItemSubmitValues) => Promise<string | undefined>;
  updateItem: (id: string, data: CreateMenuItemSubmitValues) => Promise<string | undefined>;
  /** Soft-delete via POST .../items/{id}/deactivate */
  deleteItem: (id: string) => Promise<void>;
  /** POST .../items/{id}/activate | .../deactivate */
  toggleItemStatus: (itemId: string, nextActive: boolean) => Promise<void>;
  isDeletingItem?: boolean;
  isUpdatingItemStatus?: boolean;
  isCreatingItem?: boolean;
  isUpdatingItem?: boolean;
  isCreatingCategory?: boolean;
  isUpdatingCategory?: boolean;
}

const MenuCreationContext = createContext<MenuCreationContextValue | null>(null);

const MENU_LIST_PARAMS = { page_size: 100 } as const;
const MENU_ITEMS_PAGE_SIZE = 8;

export function MenuCreationProvider({
  pageConfig,
  initialViewMode = 'list',
  initialItemId,
  initialCategoryId,
  children,
}: Readonly<{
  pageConfig: MenuPageConfig;
  initialViewMode?: MenuCreationViewMode;
  initialItemId?: string;
  initialCategoryId?: string;
  children: ReactNode;
}>) {
  const [localCategories, setLocalCategories] = useState<MenuCategory[]>([]);
  const [localItems, setLocalItems] = useState<MenuCatalogItem[]>([]);
  const [viewMode, setViewMode] = useState<MenuCreationViewMode>(initialViewMode);
  const [selectedItem, setSelectedItem] = useState<MenuCatalogItem | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(() =>
    initialViewMode === 'edit-category' ? (initialCategoryId ?? null) : null,
  );
  const [activeCategoryId, setActiveCategoryIdState] = useState<string | null>(
    () => initialCategoryId ?? null,
  );
  const [searchQuery, setSearchQueryState] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 1500);
  const [listPage, setListPage] = useState(1);
  const setActiveCategoryId = (id: string | null) => {
    setActiveCategoryIdState(id);
    replaceMenuCreationCategoryParam(id);
    setListPage(1);
  };
  const setSearchQuery = (query: string) => {
    setSearchQueryState(query);
    setListPage(1);
  };

  const account = useSidebarStore((state) => state.account);
  const sidebarContext = useSidebarStore((state) => state.context);
  const branchIdForList = useMemo(() => {
    if (pageConfig.scope !== 'branch') return undefined;
    const raw = sidebarContext.branchId ?? account?.branch_id;
    if (raw == null) return undefined;
    const id = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(id) && id > 0 ? id : undefined;
  }, [account?.branch_id, pageConfig.scope, sidebarContext.branchId]);

  const activeCategoryNumericId = useMemo(() => {
    if (!activeCategoryId || !/^\d+$/.test(activeCategoryId)) return undefined;
    const id = Number(activeCategoryId);
    return Number.isFinite(id) && id > 0 ? id : undefined;
  }, [activeCategoryId]);

  const menuListParams = useMemo<MenuItemListParams>(
    () => ({
      page: listPage,
      page_size: MENU_ITEMS_PAGE_SIZE,
      ...(branchIdForList != null ? { branch_id: branchIdForList } : {}),
      ...(activeCategoryNumericId != null ? { category_id: activeCategoryNumericId } : {}),
      ...(debouncedSearchQuery.trim() ? { search: debouncedSearchQuery.trim() } : {}),
    }),
    [activeCategoryNumericId, branchIdForList, debouncedSearchQuery, listPage],
  );

  const catalogListParams = useMemo<MenuItemListParams>(
    () => ({
      page: 1,
      page_size: MENU_LIST_PARAMS.page_size,
      ...(branchIdForList != null ? { branch_id: branchIdForList } : {}),
    }),
    [branchIdForList],
  );

  const queryClient = useQueryClient();
  const branchMenusQuery = useBranchMenus(
    { page: 1, page_size: 50, status: 'active' },
    branchIdForList,
  );
  const branchMenuAssignment = useMemo(
    () =>
      pageConfig.scope === 'branch'
        ? pickActiveBranchMenuAssignment(branchMenusQuery.data?.items ?? [])
        : null,
    [branchMenusQuery.data?.items, pageConfig.scope],
  );
  const branchMenuItemsQuery = useBranchMenuItems(branchIdForList, branchMenuAssignment?.id, {
    page: 1,
    page_size: 500,
  });
  const overlayByMenuItemId = useMemo(
    () => branchMenuItemOverlayMap(branchMenuItemsQuery.data?.items ?? []),
    [branchMenuItemsQuery.data?.items],
  );

  const categoriesQuery = useMenuCategories(MENU_LIST_PARAMS);
  const itemsQuery = useMenuItems(menuListParams);
  const catalogItemsQuery = useMenuItems(catalogListParams);
  const createMenuItem = useCreateMenuItem({ scope: pageConfig.scope });
  const updateMenuItem = useUpdateMenuItem({ scope: pageConfig.scope });
  const deactivateMenuItem = useDeactivateMenuItem({ scope: pageConfig.scope });
  const setMenuItemActive = useSetMenuItemActive({ scope: pageConfig.scope });
  const createMenuCategory = useCreateMenuCategory();
  const updateMenuCategory = useUpdateMenuCategory();
  const setMenuCategoryActive = useSetMenuCategoryActive();

  const apiCategories = categoriesQuery.data?.items;
  const apiItems = itemsQuery.data?.items;
  const isCategoriesLoading = categoriesQuery.isLoading;
  const categoriesError = categoriesQuery.error;
  const isItemsLoading = itemsQuery.isLoading || itemsQuery.isFetching;
  const itemsError = itemsQuery.error;
  const refetchCategories = categoriesQuery.refetch;
  const refetchItems = itemsQuery.refetch;

  const afterMenuItemWrite = useCallback(
    async (options: {
      message: string | null | undefined;
      categoryId: string;
      itemId?: number;
    }) => {
      setLocalItems([]);
      await refetchItems();
      if (options.itemId != null && Number.isFinite(options.itemId) && options.itemId > 0) {
        await queryClient.refetchQueries({ queryKey: menuItemQueryKey(options.itemId) });
      }
      showMenuItemWriteSuccessToast(options.message);
      setActiveCategoryId(options.categoryId);
      setViewMode('list');
      pushMenuCreationList({
        scope: pageConfig.scope,
        cleanPath: true,
        categoryFilterId: options.categoryId,
      });
    },
    [pageConfig.scope, queryClient, refetchItems],
  );

  const categories: MenuCategory[] = useMemo(() => {
    if (localCategories.length > 0) {
      return localCategories;
    }
    return (apiCategories ?? []).map((c): MenuCategory => ({
      id: String(c.id),
      name: c.name,
      status: c.status === 'active' ? 'Active' : 'Inactive',
      description: c.description ?? undefined,
      displayOrder: c.display_order,
      parentId: c.parent_id ?? null,
    }));
  }, [apiCategories, localCategories]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories) {
      map.set(category.id, category.name);
    }
    return map;
  }, [categories]);

  const tagNameToId = useMemo(() => buildTagNameToIdMap(apiItems ?? []), [apiItems]);

  const items: MenuCatalogItem[] = useMemo(() => {
    if (localItems.length > 0) return localItems;
    return (apiItems ?? []).map((item) =>
      pageConfig.scope === 'branch'
        ? mergeMenuItemWithBranchOverlay(item, categoryNameById, overlayByMenuItemId)
        : toMenuCatalogItem(item, categoryNameById),
    );
  }, [apiItems, categoryNameById, localItems, overlayByMenuItemId, pageConfig.scope]);

  // Seed selection once API items arrive for view/edit deep links.
  if (
    (initialViewMode === 'view-item' || initialViewMode === 'edit-item') &&
    selectedItem == null &&
    items.length > 0
  ) {
    const match = (initialItemId ? items.find((i) => i.id === initialItemId) : null) ?? items[0];
    setSelectedItem(match);
    setActiveCategoryId(match.categoryId);
  }

  const editingCategory = useMemo(() => {
    if (viewMode !== 'edit-category') return null;
    const targetId = editingCategoryId ?? initialCategoryId ?? activeCategoryId;
    if (!targetId) return null;
    return categories.find((category) => category.id === targetId) ?? null;
  }, [viewMode, editingCategoryId, initialCategoryId, activeCategoryId, categories]);

  // Handle browser back/forward buttons
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const params = readMenuCreationParamsFromLocation();
      setActiveCategoryIdState(params.categoryFilterId ?? null);

      if (params.viewMode === 'create-item') {
        setSelectedItem(null);
        setViewMode('create-item');
      } else if (params.viewMode === 'edit-item') {
        const item = (params.itemId ? items.find((i) => i.id === params.itemId) : null) ?? items[0];
        setSelectedItem(item);
        if (item) setActiveCategoryIdState(item.categoryId);
        setViewMode('edit-item');
      } else if (params.viewMode === 'view-item') {
        const item = (params.itemId ? items.find((i) => i.id === params.itemId) : null) ?? items[0];
        setSelectedItem(item);
        if (item) setActiveCategoryIdState(item.categoryId);
        setViewMode('view-item');
      } else if (params.viewMode === 'create-category') {
        setEditingCategoryId(null);
        setViewMode('create-category');
      } else if (params.viewMode === 'edit-category') {
        if (params.categoryId) {
          setActiveCategoryIdState(params.categoryId);
          setEditingCategoryId(params.categoryId);
        }
        setViewMode('edit-category');
      } else if (
        window.location.pathname.endsWith('/create-menu-item') ||
        window.location.pathname.endsWith('/menu-creation/create')
      ) {
        setViewMode('create-item');
      } else {
        setSelectedItem(null);
        setEditingCategoryId(null);
        setViewMode('list');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [items]);

  const catalogItems = useMemo(
    () =>
      (catalogItemsQuery.data?.items ?? []).map((item) =>
        toMenuCatalogItem(item, categoryNameById),
      ),
    [catalogItemsQuery.data?.items, categoryNameById],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of catalogItems) {
      counts[item.categoryId] = (counts[item.categoryId] ?? 0) + 1;
    }
    return counts;
  }, [catalogItems]);

  const filteredItems = items;
  const listTotal = itemsQuery.data?.total ?? items.length;
  const totalItemCount = catalogItemsQuery.data?.total ?? catalogItems.length;

  const value = useMemo<MenuCreationContextValue>(
    () => ({
      pageConfig,
      viewMode,
      categories,
      items,
      filteredItems,
      categoryCounts,
      totalItemCount,
      activeCategoryId,
      searchQuery,
      selectedItem,
      isCategoriesLoading,
      categoriesError,
      isItemsLoading,
      itemsError,
      refetchCategories: () => {
        void refetchCategories();
      },
      refetchItems: () => {
        void refetchItems();
      },
      setActiveCategoryId,
      setSearchQuery,
      listPage,
      listPageSize: MENU_ITEMS_PAGE_SIZE,
      listTotal,
      setListPage,
      openCreateCategory: () => {
        setEditingCategoryId(null);
        setViewMode('create-category');
        pushMenuCreationView('create-category');
      },
      openEditCategory: (category) => {
        setEditingCategoryId(category.id);
        setActiveCategoryIdState(category.id);
        setViewMode('edit-category');
        pushMenuCreationView('edit-category', {
          categoryId: category.id,
          categoryFilterId: category.id,
        });
      },
      openCreateItem: () => {
        setSelectedItem(null);
        setViewMode('create-item');
        pushMenuCreationView('create-item');
      },
      openEditItem: (item) => {
        setSelectedItem(item);
        setActiveCategoryIdState(item.categoryId);
        setViewMode('edit-item');
        pushMenuCreationView('edit-item', {
          itemId: item.id,
          categoryFilterId: item.categoryId,
        });
      },
      openViewItem: (item) => {
        setSelectedItem(item);
        setActiveCategoryIdState(item.categoryId);
        setViewMode('view-item');
        pushMenuCreationView('view-item', {
          itemId: item.id,
          categoryFilterId: item.categoryId,
        });
      },
      deleteItem: async (id: string) => {
        const itemId = Number(id);
        if (!Number.isFinite(itemId) || itemId <= 0) {
          throw new Error('Invalid menu item id');
        }

        await deactivateMenuItem.mutateAsync(itemId);

        setLocalItems((prev) => {
          const source = prev.length > 0 ? prev : items;
          return source.filter((item) => item.id !== id);
        });
        setSelectedItem(null);
        setViewMode('list');
        pushMenuCreationList();
      },
      toggleItemStatus: async (itemId, nextActive) => {
        const row = items.find((entry) => entry.id === itemId);
        const numericId = row?.menuItemId ?? Number(itemId);
        if (!Number.isFinite(numericId) || numericId <= 0) {
          throw new ApiError('Invalid menu item id.', 400);
        }

        await setMenuItemActive.mutateAsync({
          itemId: numericId,
          active: nextActive,
          catalogueScope: row?.catalogueScope,
          branchMenuItemId: row?.branchMenuItemId,
          branchId: branchIdForList,
          assignmentId: branchMenuAssignment?.id,
        });

        const nextStatus = nextActive ? 'Available' : 'Inactive';
        setLocalItems((prev) => {
          const source = prev.length > 0 ? prev : items;
          return source.map((item) =>
            item.id === itemId ? { ...item, status: nextStatus } : item,
          );
        });
        await refetchItems();
        setLocalCategories([]);
        setLocalItems([]);
      },
      editingCategory,
      isDeletingItem: deactivateMenuItem.isPending,
      isUpdatingItemStatus: setMenuItemActive.isPending,
      isCreatingItem: createMenuItem.isPending,
      isUpdatingItem: updateMenuItem.isPending,
      isCreatingCategory: createMenuCategory.isPending,
      isUpdatingCategory: updateMenuCategory.isPending || setMenuCategoryActive.isPending,
      backToList: () => {
        setSelectedItem(null);
        setEditingCategoryId(null);
        setViewMode('list');
        pushMenuCreationList({ cleanPath: true });
      },
      addCategory: async (input) => {
        const parsed = createCategoryInputSchema.parse(input);
        const contextIds = resolveCatalogueContextIds(pageConfig.scope);
        const body = buildCreateMenuCategoryBody({
          name: parsed.name,
          description: parsed.description,
          pageScope: pageConfig.scope,
          companyId: contextIds.companyId,
          branchId: contextIds.branchId,
        });

        const created = await createMenuCategory.mutateAsync(body);
        // Drop local overrides so the refreshed API list is the source of truth.
        setLocalCategories([]);
        await refetchCategories();

        const nextId = String(created.id);
        setEditingCategoryId(null);
        setActiveCategoryIdState(nextId);
        setViewMode('list');
        pushMenuCreationList({ categoryFilterId: nextId });
      },
      updateCategory: async (input) => {
        if (!editingCategory) {
          throw new ApiError('No category selected to edit.', 400);
        }
        const parsed = createCategoryInputSchema.parse(input);
        const categoryId = Number(editingCategory.id);
        if (!Number.isFinite(categoryId) || categoryId <= 0) {
          throw new ApiError('Invalid category id.', 400);
        }

        await updateMenuCategory.mutateAsync({
          categoryId,
          body: toUpdateCategoryBody(editingCategory, {
            name: parsed.name,
            description: parsed.description ?? '',
          }),
        });

        const editedId = editingCategory.id;
        setLocalCategories([]);
        await refetchCategories();
        setEditingCategoryId(null);
        setActiveCategoryIdState(editedId);
        setViewMode('list');
        pushMenuCreationList({ categoryFilterId: editedId });
      },
      toggleCategoryStatus: async (categoryId, nextActive) => {
        const category = categories.find((item) => item.id === categoryId);
        if (!category) {
          throw new ApiError('Category not found.', 404);
        }
        const numericId = Number(categoryId);
        if (!Number.isFinite(numericId) || numericId <= 0) {
          throw new ApiError('Invalid category id.', 400);
        }

        await setMenuCategoryActive.mutateAsync({
          categoryId: numericId,
          active: nextActive,
        });

        setLocalCategories([]);
        await refetchCategories();
      },
      addItem: async (data: CreateMenuItemSubmitValues) => {
        const { imageFile, tagIdsByName, ...values } = data;
        if (pageConfig.scope === 'branch' && (branchIdForList == null || branchIdForList <= 0)) {
          throw new ApiError('Branch is required to create a menu item for this account.', 400);
        }

        const created = await createMenuItem.mutateAsync({
          values,
          branchId: branchIdForList,
          imageFile,
          tagNameToId,
          tagIdsByName,
        });

        await afterMenuItemWrite({
          message: created.message,
          categoryId: values.category,
        });

        return created.message ?? undefined;
      },
      updateItem: async (id: string, data: CreateMenuItemSubmitValues) => {
        const itemId = Number(id);
        if (!Number.isFinite(itemId) || itemId <= 0) {
          throw new ApiError('Invalid menu item id.', 400);
        }
        if (!data.initialDetail) {
          throw new ApiError('Menu item details are missing; reload and try again.', 400);
        }
        if (pageConfig.scope === 'branch' && (branchIdForList == null || branchIdForList <= 0)) {
          throw new ApiError('Branch is required to update a menu item for this account.', 400);
        }

        const { imageFile: _imageFile, imageFiles, initialDetail, tagIdsByName, ...values } = data;
        void _imageFile;

        const updated = await updateMenuItem.mutateAsync({
          itemId,
          values,
          initialDetail,
          branchId: branchIdForList,
          imageFiles,
          tagNameToId,
          tagIdsByName,
        });

        await afterMenuItemWrite({
          message: updated.message,
          categoryId: values.category,
          itemId,
        });

        return updated.message ?? undefined;
      },
    }),
    [
      activeCategoryId,
      categories,
      categoryCounts,
      filteredItems,
      items,
      listPage,
      listTotal,
      totalItemCount,
      pageConfig,
      searchQuery,
      selectedItem,
      editingCategory,
      viewMode,
      isCategoriesLoading,
      categoriesError,
      isItemsLoading,
      itemsError,
      refetchCategories,
      refetchItems,
      afterMenuItemWrite,
      deactivateMenuItem,
      setMenuItemActive,
      createMenuItem,
      updateMenuItem,
      branchIdForList,
      tagNameToId,
      createMenuCategory,
      updateMenuCategory,
      setMenuCategoryActive,
    ],
  );

  return <MenuCreationContext.Provider value={value}>{children}</MenuCreationContext.Provider>;
}

export function useMenuCreation(): MenuCreationContextValue {
  const context = useContext(MenuCreationContext);
  if (!context) {
    throw new Error('useMenuCreation must be used within MenuCreationProvider');
  }
  return context;
}

/* -------------------------------------------------------------------------- */
/* Menu Availability                                                          */
/* -------------------------------------------------------------------------- */

export interface MenuAvailabilityContextValue {
  pageConfig: MenuAvailabilityPageConfig;
  categories: AvailabilityCategory[];
  items: AvailabilityItem[];
  filteredItems: AvailabilityItem[];
  channels: AvailabilityChannel[];
  categoryCounts: Record<string, number>;
  totalItemCount: number;
  stats: {
    total: number;
    available: number;
    eightySixCount: number;
    hidden: number;
  };
  activeCategoryId: string | null;
  searchQuery: string;
  channelGroup: AvailabilityChannelGroup;
  activeChannelId: string;
  dietaryFilter: AvailabilityDietaryFilter;
  statusFilter: AvailabilityStatusFilter;
  setActiveCategoryId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  listPage: number;
  listPageSize: number;
  listTotal: number;
  setListPage: (page: number) => void;
  setChannelGroup: (group: AvailabilityChannelGroup) => void;
  setActiveChannelId: (channelId: string) => void;
  setDietaryFilter: (value: AvailabilityDietaryFilter) => void;
  setStatusFilter: (value: AvailabilityStatusFilter) => void;
  /** POST .../activate | .../deactivate — active (true) / inactive (false). */
  toggleItemMark: (itemId: string, nextActive: boolean) => Promise<void>;
  isUpdatingItemStatus?: boolean;
  isCategoriesLoading?: boolean;
  isItemsLoading?: boolean;
  categoriesError?: Error | null;
  itemsError?: Error | null;
}

const MenuAvailabilityContext = createContext<MenuAvailabilityContextValue | null>(null);

function channelsForGroup(group: AvailabilityChannelGroup): AvailabilityChannel[] {
  if (group === 'all') return AVAILABILITY_CHANNELS;
  return AVAILABILITY_CHANNELS.filter((channel) => channel.group === group || channel.id === 'all');
}

function toAvailabilityItem(
  item: MenuItemResponse,
  categoryNameById: Map<string, string>,
  overlay?: BranchMenuItemRecord,
): AvailabilityItem {
  const categoryId = String(item.category_id);
  const isActive =
    overlay != null ? overlay.status === 'active' && overlay.is_available : item.status === 'active';
  const tagNames = item.tags.map((t) => t.name).filter((name) => name.length > 0);
  const primaryTag = tagNames[0] ?? item.code ?? item.name;
  return {
    id: String(item.id),
    name: item.name,
    categoryId,
    categoryName: categoryNameById.get(categoryId) ?? 'Uncategorized',
    dietary: toCatalogDietary(item.dietary_type),
    mark: isActive ? 'available' : '86d',
    isActive,
    visibility: !isActive
      ? 'hidden'
      : item.allow_delivery || item.allow_takeaway
        ? 'online'
        : 'dine-in',
    tag: primaryTag,
    tags: tagNames.length > 0 ? tagNames : [primaryTag],
    isHidden: !isActive,
    menuItemId: item.id,
    catalogueScope: item.catalogue_scope,
    ...(overlay != null ? { branchMenuItemId: overlay.id } : {}),
  };
}

export function MenuAvailabilityProvider({
  pageConfig,
  children,
}: Readonly<{
  pageConfig: MenuAvailabilityPageConfig;
  children: ReactNode;
}>) {
  /** null = All Items (same as Menu Creation). */
  const [activeCategoryId, setActiveCategoryIdState] = useState<string | null>(null);
  const [searchQuery, setSearchQueryState] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 1500);
  const [listPage, setListPage] = useState(1);
  /** Default DineIn QR — All / Online tabs are feature-flagged off for MVP. */
  const [channelGroup, setChannelGroup] = useState<AvailabilityChannelGroup>('dine-in-qr');
  const [activeChannelId, setActiveChannelId] = useState('dine-in-qr');
  const [dietaryFilter, setDietaryFilter] = useState<AvailabilityDietaryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<AvailabilityStatusFilter>('all');
  const [localItems, setLocalItems] = useState<AvailabilityItem[] | null>(null);

  const account = useSidebarStore((state) => state.account);
  const sidebarContext = useSidebarStore((state) => state.context);
  const branchIdForList = useMemo(() => {
    if (pageConfig.scope !== 'branch') return undefined;
    const raw = sidebarContext.branchId ?? account?.branch_id;
    if (raw == null) return undefined;
    const id = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(id) && id > 0 ? id : undefined;
  }, [account?.branch_id, pageConfig.scope, sidebarContext.branchId]);

  const activeCategoryNumericId = useMemo(() => {
    if (!activeCategoryId || !/^\d+$/.test(activeCategoryId)) return undefined;
    const id = Number(activeCategoryId);
    return Number.isFinite(id) && id > 0 ? id : undefined;
  }, [activeCategoryId]);

  const itemListParams = useMemo<MenuItemListParams>(
    () => ({
      page: listPage,
      page_size: MENU_ITEMS_PAGE_SIZE,
      ...(branchIdForList != null ? { branch_id: branchIdForList } : {}),
      ...(activeCategoryNumericId != null ? { category_id: activeCategoryNumericId } : {}),
      ...(debouncedSearchQuery.trim() ? { search: debouncedSearchQuery.trim() } : {}),
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(dietaryFilter !== 'all' ? { dietary_type: dietaryFilter } : {}),
    }),
    [
      activeCategoryNumericId,
      branchIdForList,
      debouncedSearchQuery,
      dietaryFilter,
      listPage,
      statusFilter,
    ],
  );

  const catalogListParams = useMemo<MenuItemListParams>(
    () => ({
      page: 1,
      page_size: MENU_LIST_PARAMS.page_size,
      ...(branchIdForList != null ? { branch_id: branchIdForList } : {}),
    }),
    [branchIdForList],
  );

  const branchMenusQuery = useBranchMenus(
    { page: 1, page_size: 50, status: 'active' },
    branchIdForList,
  );
  const branchMenuAssignment = useMemo(
    () =>
      pageConfig.scope === 'branch'
        ? pickActiveBranchMenuAssignment(branchMenusQuery.data?.items ?? [])
        : null,
    [branchMenusQuery.data?.items, pageConfig.scope],
  );
  const branchMenuItemsQuery = useBranchMenuItems(branchIdForList, branchMenuAssignment?.id, {
    page: 1,
    page_size: 500,
  });
  const overlayByMenuItemId = useMemo(
    () => branchMenuItemOverlayMap(branchMenuItemsQuery.data?.items ?? []),
    [branchMenuItemsQuery.data?.items],
  );

  // Same list APIs as Menu Creation: GET categories + GET menu items (with status / dietary filters).
  const categoriesQuery = useMenuCategories(MENU_LIST_PARAMS);
  const itemsQuery = useMenuItems(itemListParams);
  const catalogItemsQuery = useMenuItems(catalogListParams);
  const setMenuItemActive = useSetMenuItemActive({ scope: pageConfig.scope });

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categoriesQuery.data?.items ?? []) {
      map.set(String(category.id), category.name);
    }
    return map;
  }, [categoriesQuery.data?.items]);

  const apiCategories = useMemo<AvailabilityCategory[]>(
    () =>
      (categoriesQuery.data?.items ?? []).map((category) => ({
        id: String(category.id),
        name: category.name,
        displayOrder: category.display_order,
        status: category.status,
      })),
    [categoriesQuery.data?.items],
  );

  const apiItems = useMemo(
    () =>
      (itemsQuery.data?.items ?? []).map((item) =>
        toAvailabilityItem(
          item,
          categoryNameById,
          pageConfig.scope === 'branch' ? overlayByMenuItemId.get(item.id) : undefined,
        ),
      ),
    [itemsQuery.data?.items, categoryNameById, overlayByMenuItemId, pageConfig.scope],
  );

  const categories = apiCategories;
  const items = localItems ?? apiItems;

  const channels = useMemo(() => channelsForGroup(channelGroup), [channelGroup]);

  const catalogItems = useMemo(
    () =>
      (catalogItemsQuery.data?.items ?? []).map((item) =>
        toAvailabilityItem(item, categoryNameById),
      ),
    [catalogItemsQuery.data?.items, categoryNameById],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of catalogItems) {
      counts[item.categoryId] = (counts[item.categoryId] ?? 0) + 1;
    }
    return counts;
  }, [catalogItems]);

  const filteredItems = items;
  const listTotal = itemsQuery.data?.total ?? items.length;
  const totalItemCount = catalogItemsQuery.data?.total ?? catalogItems.length;

  const setActiveCategoryId = (id: string | null) => {
    setActiveCategoryIdState(id);
    setListPage(1);
  };
  const setSearchQuery = (query: string) => {
    setSearchQueryState(query);
    setListPage(1);
  };

  const stats = useMemo(() => {
    let available = 0;
    let eightySixCount = 0;
    let hidden = 0;
    for (const item of catalogItems) {
      if (item.mark === 'available') available += 1;
      if (item.mark === '86d') eightySixCount += 1;
      if (item.isHidden || item.visibility === 'hidden') hidden += 1;
    }
    return {
      total: totalItemCount,
      available,
      eightySixCount,
      hidden,
    };
  }, [catalogItems, totalItemCount]);

  const value = useMemo<MenuAvailabilityContextValue>(
    () => ({
      pageConfig,
      categories,
      items,
      filteredItems,
      channels,
      categoryCounts,
      totalItemCount,
      stats,
      activeCategoryId,
      searchQuery,
      channelGroup,
      activeChannelId,
      dietaryFilter,
      statusFilter,
      setActiveCategoryId,
      setSearchQuery,
      listPage,
      listPageSize: MENU_ITEMS_PAGE_SIZE,
      listTotal,
      setListPage,
      setChannelGroup: (group) => {
        setChannelGroup(group);
        const nextChannels = channelsForGroup(group);
        const stillValid = nextChannels.some((channel) => channel.id === activeChannelId);
        if (!stillValid) {
          setActiveChannelId(nextChannels[0]?.id ?? 'all');
        }
      },
      setActiveChannelId,
      setDietaryFilter: (next) => {
        setDietaryFilter(next);
        setLocalItems(null);
        setListPage(1);
      },
      setStatusFilter: (next) => {
        setStatusFilter(next);
        setLocalItems(null);
        setListPage(1);
      },
      toggleItemMark: async (itemId, nextActive) => {
        const row = items.find((entry) => entry.id === itemId);
        const numericId = row?.menuItemId ?? Number(itemId);
        if (!Number.isFinite(numericId) || numericId <= 0) {
          throw new ApiError('Invalid menu item id.', 400);
        }

        await setMenuItemActive.mutateAsync({
          itemId: numericId,
          active: nextActive,
          catalogueScope: row?.catalogueScope,
          branchMenuItemId: row?.branchMenuItemId,
          branchId: branchIdForList,
          assignmentId: branchMenuAssignment?.id,
        });

        const nextMark: ItemAvailabilityMark = nextActive ? 'available' : '86d';
        setLocalItems((prev) => {
          const source = prev ?? items;
          return source.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  mark: nextMark,
                  isActive: nextActive,
                  isHidden: !nextActive,
                  visibility: nextActive ? item.visibility : 'hidden',
                }
              : item,
          );
        });
        await Promise.all([itemsQuery.refetch(), catalogItemsQuery.refetch()]);
        setLocalItems(null);
      },
      isUpdatingItemStatus: setMenuItemActive.isPending,
      isCategoriesLoading: categoriesQuery.isLoading,
      isItemsLoading: itemsQuery.isLoading || itemsQuery.isFetching,
      categoriesError: categoriesQuery.error,
      itemsError: itemsQuery.error,
    }),
    [
      activeCategoryId,
      activeChannelId,
      categories,
      categoryCounts,
      channelGroup,
      channels,
      dietaryFilter,
      filteredItems,
      items,
      listPage,
      listTotal,
      totalItemCount,
      pageConfig,
      searchQuery,
      stats,
      statusFilter,
      setMenuItemActive,
      catalogItemsQuery,
      categoriesQuery.isLoading,
      categoriesQuery.error,
      itemsQuery,
    ],
  );

  return (
    <MenuAvailabilityContext.Provider value={value}>{children}</MenuAvailabilityContext.Provider>
  );
}

export function useMenuAvailability(): MenuAvailabilityContextValue {
  const context = useContext(MenuAvailabilityContext);
  if (!context) {
    throw new Error('useMenuAvailability must be used within MenuAvailabilityProvider');
  }
  return context;
}
