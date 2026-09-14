import { v4 as uuidv4 } from 'uuid';
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

export function getLocations(): Location[] {
  return loadLocal<Location[]>(LOCATIONS_KEY, []).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export function getLocationById(id: string): Location | undefined {
  return getLocations().find((l) => l.id === id);
}

export function saveLocation(
  data: Omit<Location, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Location {
  const list = loadLocal<Location[]>(LOCATIONS_KEY, []);
  const now = new Date().toISOString();

  if (data.id) {
    const idx = list.findIndex((l) => l.id === data.id);
    if (idx === -1) throw new Error('Location not found');
    const updated: Location = { ...list[idx], ...data, id: data.id, updatedAt: now };
    list[idx] = updated;
    saveLocal(LOCATIONS_KEY, list);
    return updated;
  }

  const created: Location = {
    name: data.name.trim(),
    code: data.code?.trim() || undefined,
    notes: data.notes?.trim() || undefined,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  list.push(created);
  saveLocal(LOCATIONS_KEY, list);
  return created;
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
}

export function getProductsForLocation(locationId: string): string[] {
  return loadLocal<LocationProduct[]>(LOCATION_PRODUCTS_KEY, [])
    .filter((lp) => lp.locationId === locationId)
    .map((lp) => lp.productId);
}

export function setProductsForLocation(locationId: string, productIds: string[]): void {
  const others = loadLocal<LocationProduct[]>(LOCATION_PRODUCTS_KEY, []).filter(
    (lp) => lp.locationId !== locationId
  );
  const next = [
    ...others,
    ...productIds.map((productId) => ({ locationId, productId })),
  ];
  saveLocal(LOCATION_PRODUCTS_KEY, next);
}

export function getLocationsForProduct(productId: string): string[] {
  return loadLocal<LocationProduct[]>(LOCATION_PRODUCTS_KEY, [])
    .filter((lp) => lp.productId === productId)
    .map((lp) => lp.locationId);
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

  if (!data.roles?.length) {
    throw new Error('Select at least one role (supplier or customer)');
  }

  if (data.id) {
    const idx = list.findIndex((p) => p.id === data.id);
    if (idx === -1) throw new Error('Partner not found');
    const updated: BusinessPartner = {
      ...list[idx],
      ...data,
      id: data.id,
      name: data.name.trim(),
      code: data.code?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      email: data.email?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      updatedAt: now,
    };
    list[idx] = updated;
    saveLocal(PARTNERS_KEY, list);
    return updated;
  }

  const created: BusinessPartner = {
    name: data.name.trim(),
    code: data.code?.trim() || undefined,
    roles: data.roles,
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
  items: { productId: string; role: PartnerRole }[]
): void {
  const others = loadLocal<PartnerProduct[]>(PARTNER_PRODUCTS_KEY, []).filter(
    (pp) => pp.partnerId !== partnerId
  );
  saveLocal(PARTNER_PRODUCTS_KEY, [
    ...others,
    ...items.map((i) => ({ partnerId, productId: i.productId, role: i.role })),
  ]);
}

export function seedMastersIfEmpty(): void {
  if (getLocations().length === 0) {
    const now = new Date().toISOString();
    saveLocal(LOCATIONS_KEY, [
      { id: uuidv4(), name: 'Shelf A1', code: 'A1', createdAt: now, updatedAt: now },
      { id: uuidv4(), name: 'Shelf A2', code: 'A2', createdAt: now, updatedAt: now },
      { id: uuidv4(), name: 'Shelf B3', code: 'B3', createdAt: now, updatedAt: now },
      { id: uuidv4(), name: 'Shelf C2', code: 'C2', createdAt: now, updatedAt: now },
    ]);
  }
  if (getCategories().length === 0) {
    const now = new Date().toISOString();
    saveLocal(CATEGORIES_KEY, [
      { id: uuidv4(), name: 'Electronics', createdAt: now, updatedAt: now },
      { id: uuidv4(), name: 'Accessories', createdAt: now, updatedAt: now },
      { id: uuidv4(), name: 'Stationery', createdAt: now, updatedAt: now },
    ]);
  }
}
