import { v4 as uuidv4 } from 'uuid';
import {
  isGasEnabled,
  gasGetLocations,
  gasSaveLocation,
  gasDeleteLocation,
  gasGetLocationProducts,
  gasSetLocationProducts,
} from '../lib/gasApi';
import type {
  Location,
  Category,
  BusinessPartner,
  LocationProduct,
  PartnerProduct,
  PartnerRole,
} from '../types/inventory';

const LOCATIONS_KEY = 'inventory_locations';
const CATEGORIES_KEY = 'inventory_categories';
const PARTNERS_KEY = 'inventory_partners';
const LOCATION_PRODUCTS_KEY = 'inventory_location_products';
const PARTNER_PRODUCTS_KEY = 'inventory_partner_products';

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function optionalGrid(n: number | undefined | null): number | undefined {
  if (n == null || Number.isNaN(Number(n))) return undefined;
  const v = Math.round(Number(n));
  return v >= 1 ? v : undefined;
}

function optionalPositive(n: number | undefined | null): number | undefined {
  if (n == null || Number.isNaN(Number(n))) return undefined;
  const v = Number(n);
  return v > 0 ? v : undefined;
}

export function formatMapPosition(loc: {
  gridRow?: number;
  gridCol?: number;
  shelf?: number;
}): string {
  if (loc.gridRow == null || loc.gridCol == null) {
    return loc.shelf != null ? `,,${loc.shelf}` : '';
  }
  const parts = [String(loc.gridRow), String(loc.gridCol)];
  if (loc.shelf != null) parts.push(String(loc.shelf));
  return parts.join(',');
}

export function parseMapPosition(raw?: string | null): {
  gridRow?: number;
  gridCol?: number;
  shelf?: number;
} {
  if (!raw || !String(raw).trim()) return {};
  const parts = String(raw).split(',');
  const num = (s?: string) => {
    if (s == null || !String(s).trim()) return undefined;
    const n = Number(String(s).trim());
    return Number.isFinite(n) && n >= 1 ? Math.round(n) : undefined;
  };
  return {
    gridRow: num(parts[0]),
    gridCol: num(parts[1]),
    shelf: num(parts[2]),
  };
}

export function getLocations(): Location[] {
  return loadLocal<Location[]>(LOCATIONS_KEY, []).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export function getLocationById(id: string): Location | undefined {
  return getLocations().find((l) => l.id === id);
}

export async function hydrateMastersFromGas(): Promise<Location[]> {
  return hydrateLocationsFromGas();
}

/**
 * Pull Locations + LocationProducts from Google Sheet into localStorage.
 * When GAS is enabled, failures throw (so Settings / Masters can show the real error).
 * Typical failure: old Code.gs without getLocations → "Unknown action: getLocations".
 */
export async function hydrateLocationsFromGas(): Promise<Location[]> {
  if (!isGasEnabled()) return getLocations();

  const remote = await gasGetLocations();
  const now = new Date().toISOString();
  const mapped: Location[] = remote.map((r) => {
    const fromCsv = parseMapPosition(r.mapPosition);
    return {
      id: String(r.id),
      name: r.name || '',
      code: r.code || undefined,
      notes: r.notes || undefined,
      gridRow: r.gridRow ?? fromCsv.gridRow,
      gridCol: r.gridCol ?? fromCsv.gridCol,
      shelf: r.shelf ?? fromCsv.shelf,
      maxQty: (r as { maxQty?: number }).maxQty,
      createdAt: r.createdAt || now,
      updatedAt: r.updatedAt || now,
    };
  });
  saveLocal(LOCATIONS_KEY, mapped);

  try {
    const links = await gasGetLocationProducts();
    saveLocal(
      LOCATION_PRODUCTS_KEY,
      links.map((l) => ({
        locationId: String(l.locationId),
        productId: String(l.productId),
        weightage:
          l.weightage != null && Number(l.weightage) > 0
            ? Number(l.weightage)
            : undefined,
      }))
    );
  } catch (e) {
    console.warn('getLocationProducts failed (locations still loaded)', e);
  }

  return mapped.sort((a, b) => a.name.localeCompare(b.name));
}

export function saveLocation(
  data: Omit<Location, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Location {
  const list = loadLocal<Location[]>(LOCATIONS_KEY, []);
  const now = new Date().toISOString();
  const gridRow = optionalGrid(data.gridRow);
  const gridCol = optionalGrid(data.gridCol);
  const shelf = optionalGrid(data.shelf);
  const maxQty = optionalPositive(data.maxQty);

  if (data.id) {
    const idx = list.findIndex((l) => l.id === data.id);
    if (idx === -1) throw new Error('Location not found');
    const updated: Location = {
      ...list[idx],
      ...data,
      id: data.id,
      name: data.name.trim(),
      code: data.code?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      gridRow,
      gridCol,
      shelf,
      maxQty,
      updatedAt: now,
    };
    list[idx] = updated;
    saveLocal(LOCATIONS_KEY, list);
    return updated;
  }

  const created: Location = {
    name: data.name.trim(),
    code: data.code?.trim() || undefined,
    notes: data.notes?.trim() || undefined,
    gridRow,
    gridCol,
    shelf,
    maxQty,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  list.push(created);
  saveLocal(LOCATIONS_KEY, list);
  return created;
}

async function pushLocationToGas_(
  loc: Location
): Promise<{ ok: boolean; error?: string }> {
  if (!isGasEnabled()) {
    return {
      ok: false,
      error: 'GAS not configured (VITE_GAS_WEB_APP_URL missing at build)',
    };
  }
  try {
    await gasSaveLocation({
      id: loc.id,
      name: loc.name,
      code: loc.code || '',
      notes: loc.notes || '',
      gridRow: loc.gridRow,
      gridCol: loc.gridCol,
      shelf: loc.shelf,
      maxQty: loc.maxQty,
      mapPosition: formatMapPosition(loc),
      createdAt: loc.createdAt,
      updatedAt: loc.updatedAt,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('gasSaveLocation failed', e);
    return { ok: false, error: msg };
  }
}

/** Save locally then wait for sheet write. Throws if GAS is on and write fails. */
export async function saveLocationAndSync(
  data: Omit<Location, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<Location> {
  const loc = saveLocation(data);
  if (isGasEnabled()) {
    const result = await pushLocationToGas_(loc);
    if (!result.ok) {
      throw new Error(
        result.error ||
          'Failed to write location to Google Sheet. Update Code.gs and redeploy the web app if you see Unknown action.'
      );
    }
  }
  return loc;
}

export function deleteLocation(id: string): void {
  saveLocal(
    LOCATIONS_KEY,
    loadLocal<Location[]>(LOCATIONS_KEY, []).filter((l) => l.id !== id)
  );
  saveLocal(
    LOCATION_PRODUCTS_KEY,
    loadLocal<LocationProduct[]>(LOCATION_PRODUCTS_KEY, []).filter(
      (lp) => lp.locationId !== id
    )
  );
  if (isGasEnabled()) {
    void gasDeleteLocation(id).catch((e) =>
      console.warn('gasDeleteLocation failed', e)
    );
  }
}

export function getProductsForLocation(locationId: string): string[] {
  return loadLocal<LocationProduct[]>(LOCATION_PRODUCTS_KEY, [])
    .filter((lp) => lp.locationId === locationId)
    .map((lp) => lp.productId);
}

export function getLocationProductLinks(locationId?: string): LocationProduct[] {
  const all = loadLocal<LocationProduct[]>(LOCATION_PRODUCTS_KEY, []);
  if (!locationId) return all;
  return all.filter((lp) => lp.locationId === locationId);
}

export function getLocationProductLink(
  locationId: string,
  productId: string
): LocationProduct | undefined {
  return getLocationProductLinks(locationId).find((lp) => lp.productId === productId);
}

export function getWeightageForProductAtLocation(
  locationId: string,
  productId: string
): number {
  const link = getLocationProductLink(locationId, productId);
  const w = link?.weightage;
  if (w != null && Number.isFinite(Number(w)) && Number(w) > 0) return Number(w);
  return 1;
}

export function setProductsForLocation(
  locationId: string,
  productIds: string[],
  weightageByProduct?: Record<string, number | undefined>
): void {
  const others = loadLocal<LocationProduct[]>(LOCATION_PRODUCTS_KEY, []).filter(
    (lp) => lp.locationId !== locationId
  );
  const next: LocationProduct[] = [
    ...others,
    ...productIds.map((productId) => {
      const w = weightageByProduct?.[productId];
      const weightage =
        w != null && Number.isFinite(Number(w)) && Number(w) > 0
          ? Number(w)
          : undefined;
      return { locationId, productId, weightage };
    }),
  ];
  saveLocal(LOCATION_PRODUCTS_KEY, next);
  if (isGasEnabled()) {
    const links = next
      .filter((lp) => lp.locationId === locationId)
      .map((lp) => ({
        locationId: lp.locationId,
        productId: lp.productId,
        weightage: lp.weightage,
      }));
    void gasSetLocationProducts(locationId, productIds, links).catch((e) =>
      console.warn('gasSetLocationProducts failed', e)
    );
  }
}

export async function setProductsForLocationAndSync(
  locationId: string,
  productIds: string[],
  weightageByProduct?: Record<string, number | undefined>
): Promise<void> {
  setProductsForLocation(locationId, productIds, weightageByProduct);
  if (!isGasEnabled()) return;
  const links = getLocationProductLinks(locationId).map((lp) => ({
    locationId: lp.locationId,
    productId: lp.productId,
    weightage: lp.weightage,
  }));
  await gasSetLocationProducts(locationId, productIds, links);
}

export function getLocationsForProduct(productId: string): string[] {
  return loadLocal<LocationProduct[]>(LOCATION_PRODUCTS_KEY, [])
    .filter((lp) => lp.productId === productId)
    .map((lp) => lp.locationId);
}

export function getAssignedLocationsForProduct(productId: string): Location[] {
  return getLocationsForProduct(productId)
    .map((id) => getLocationById(id))
    .filter((l): l is Location => !!l);
}

export function seedMastersIfEmpty(): void {
  if (isGasEnabled()) return;
  if (getLocations().length === 0) {
    saveLocation({ name: 'Shelf A1', code: 'A1', gridRow: 1, gridCol: 1, shelf: 1 });
    saveLocation({ name: 'Shelf A2', code: 'A2', gridRow: 1, gridCol: 2, shelf: 1 });
  }
  if (getCategories().length === 0) {
    saveCategory({ name: 'General' });
  }
}

export function getCategories(): Category[] {
  return loadLocal<Category[]>(CATEGORIES_KEY, []).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export function saveCategory(
  data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Category {
  const list = loadLocal<Category[]>(CATEGORIES_KEY, []);
  const now = new Date().toISOString();

  if (data.id) {
    const idx = list.findIndex((c) => c.id === data.id);
    if (idx === -1) throw new Error('Category not found');
    const updated: Category = { ...list[idx], ...data, id: data.id, updatedAt: now };
    list[idx] = updated;
    saveLocal(CATEGORIES_KEY, list);
    return updated;
  }

  const created: Category = {
    name: data.name.trim(),
    notes: data.notes?.trim() || undefined,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  list.push(created);
  saveLocal(CATEGORIES_KEY, list);
  return created;
}

export function deleteCategory(id: string): void {
  saveLocal(
    CATEGORIES_KEY,
    loadLocal<Category[]>(CATEGORIES_KEY, []).filter((c) => c.id !== id)
  );
}

export function getPartners(): BusinessPartner[] {
  return loadLocal<BusinessPartner[]>(PARTNERS_KEY, []).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export function getPartnerById(id: string): BusinessPartner | undefined {
  return getPartners().find((p) => p.id === id);
}

export function savePartner(
  data: Omit<BusinessPartner, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): BusinessPartner {
  const list = loadLocal<BusinessPartner[]>(PARTNERS_KEY, []);
  const now = new Date().toISOString();
  const roles = data.roles?.length ? data.roles : (['supplier'] as PartnerRole[]);

  if (data.id) {
    const idx = list.findIndex((p) => p.id === data.id);
    if (idx === -1) throw new Error('Partner not found');
    const updated: BusinessPartner = {
      ...list[idx],
      ...data,
      id: data.id,
      name: data.name.trim(),
      roles,
      updatedAt: now,
    };
    list[idx] = updated;
    saveLocal(PARTNERS_KEY, list);
    return updated;
  }

  const created: BusinessPartner = {
    name: data.name.trim(),
    code: data.code?.trim() || undefined,
    roles,
    phone: data.phone?.trim() || undefined,
    email: data.email?.trim() || undefined,
    notes: data.notes?.trim() || undefined,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  list.push(created);
  saveLocal(PARTNERS_KEY, list);
  return created;
}

export function deletePartner(id: string): void {
  saveLocal(
    PARTNERS_KEY,
    loadLocal<BusinessPartner[]>(PARTNERS_KEY, []).filter((p) => p.id !== id)
  );
  saveLocal(
    PARTNER_PRODUCTS_KEY,
    loadLocal<PartnerProduct[]>(PARTNER_PRODUCTS_KEY, []).filter(
      (pp) => pp.partnerId !== id
    )
  );
}

export function getProductsForPartner(
  partnerId: string,
  role?: PartnerRole
): PartnerProduct[] {
  return loadLocal<PartnerProduct[]>(PARTNER_PRODUCTS_KEY, []).filter(
    (pp) => pp.partnerId === partnerId && (!role || pp.role === role)
  );
}

export function setProductsForPartner(
  partnerId: string,
  productIds: string[],
  role: PartnerRole
): void {
  const others = loadLocal<PartnerProduct[]>(PARTNER_PRODUCTS_KEY, []).filter(
    (pp) => !(pp.partnerId === partnerId && pp.role === role)
  );
  const next = [
    ...others,
    ...productIds.map((productId) => ({ partnerId, productId, role })),
  ];
  saveLocal(PARTNER_PRODUCTS_KEY, next);
}

export function getPartnersForProduct(productId: string): PartnerProduct[] {
  return loadLocal<PartnerProduct[]>(PARTNER_PRODUCTS_KEY, []).filter(
    (pp) => pp.productId === productId
  );
}
