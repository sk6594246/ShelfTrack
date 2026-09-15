import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Plus, Search, Trash2, X } from 'lucide-react';
import type { BusinessPartner, PartnerRole, Product } from '../../types/inventory';
import {
  getPartners,
  savePartner,
  deletePartner,
  getProductsForPartner,
  setProductsForPartner,
} from '../../store/mastersStore';
import { getProducts } from '../../store/inventoryStore';
import { toast } from '../../components/ui/Toast';

export function PartnersPanel() {
  const [list, setList] = useState<BusinessPartner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<BusinessPartner | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [roles, setRoles] = useState<PartnerRole[]>([]);
  const [linked, setLinked] = useState<{ productId: string; role: PartnerRole }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const reload = useCallback(() => {
    setList(getPartners());
    getProducts().then(setProducts);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.code || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q)
    );
  }, [list, query]);

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setName('');
    setCode('');
    setPhone('');
    setEmail('');
    setNotes('');
    setRoles(['supplier']);
    setLinked([]);
    setError(null);
  }

  function openEdit(p: BusinessPartner) {
    setEditing(p);
    setCreating(false);
    setName(p.name);
    setCode(p.code || '');
    setPhone(p.phone || '');
    setEmail(p.email || '');
    setNotes(p.notes || '');
    setRoles([...p.roles]);
    setLinked(
      getProductsForPartner(p.id).map((pp) => ({
        productId: pp.productId,
        role: pp.role,
      }))
    );
    setError(null);
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setError(null);
  }

  function toggleRole(r: PartnerRole) {
    setRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  }

  function toggleLinked(productId: string, role: PartnerRole) {
    setLinked((prev) => {
      const exists = prev.some((x) => x.productId === productId && x.role === role);
      if (exists) return prev.filter((x) => !(x.productId === productId && x.role === role));
      return [...prev, { productId, role }];
    });
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (roles.length === 0) {
      setError('Select at least one role');
      return;
    }
    try {
      const saved = savePartner({
        id: editing?.id,
        name,
        code: code || undefined,
        phone: phone || undefined,
        email: email || undefined,
        notes: notes || undefined,
        roles,
      });
      setProductsForPartner(saved.id, linked);
      toast(editing ? 'Partner updated' : 'Partner created', 'success');
      closeForm();
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this partner and product links?')) return;
    deletePartner(id);
    toast('Partner deleted', 'info');
    closeForm();
    reload();
  }

  const formOpen = creating || !!editing;

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-3 lg:col-span-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">
            {list.length} partner{list.length !== 1 ? 's' : ''}
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search partners…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            {list.length === 0 ? 'No partners yet' : 'No matches'}
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className={`flex w-full items-center justify-between rounded-xl border bg-white px-3 py-3 text-left shadow-sm transition hover:border-indigo-200 ${
                    editing?.id === p.id
                      ? 'border-indigo-400 ring-2 ring-indigo-100'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{p.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.roles.map((r) => (
                        <span
                          key={r}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            r === 'supplier'
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                              : 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                          }`}
                        >
                          {r === 'supplier' ? 'Supplier' : 'Customer'}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Building2 className="h-4 w-4 shrink-0 text-slate-300" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="lg:col-span-3">
        {formOpen ? (
          <form
            onSubmit={handleSave}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm st-enter"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">
                {editing ? 'Edit partner' : 'New partner'}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {error && (
              <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">Name *</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <div className="flex gap-4">
                {(['supplier', 'customer'] as PartnerRole[]).map((r) => (
                  <label
                    key={r}
                    className="flex items-center gap-2 text-sm font-medium text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={roles.includes(r)}
                      onChange={() => toggleRole(r)}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    {r === 'supplier' ? 'Supplier' : 'Customer'}
                  </label>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500">Code</span>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500">Phone</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">Notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              {roles.length > 0 && products.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-500">
                    Linked products
                  </span>
                  <div className="mt-2 max-h-52 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-2">
                    {products.map((p) => (
                      <div key={p.id} className="rounded-lg bg-slate-50 px-2 py-2">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {p.name}{' '}
                          <span className="text-xs font-normal text-slate-400">
                            ({p.sku})
                          </span>
                        </p>
                        <div className="mt-1 flex gap-3">
                          {roles.map((r) => (
                            <label
                              key={r}
                              className="flex items-center gap-1.5 text-xs text-slate-600"
                            >
                              <input
                                type="checkbox"
                                checked={linked.some(
                                  (x) => x.productId === p.id && x.role === r
                                )}
                                onChange={() => toggleLinked(p.id, r)}
                                className="rounded border-slate-300 text-indigo-600"
                              />
                              {r === 'supplier' ? 'Supplies' : 'Buys'}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Save
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => handleDelete(editing.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Select a partner or add a new one
          </div>
        )}
      </div>
    </div>
  );
}
