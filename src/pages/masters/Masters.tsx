import { useEffect, useState } from 'react';
import { Building2, MapPin, Tags } from 'lucide-react';
import { seedMastersIfEmpty } from '../../store/mastersStore';
import { LocationsPanel } from './LocationsPanel';
import { CategoriesPanel } from './CategoriesPanel';
import { PartnersPanel } from './PartnersPanel';

type Tab = 'locations' | 'categories' | 'partners';

export function Masters() {
  const [tab, setTab] = useState<Tab>('locations');

  useEffect(() => {
    seedMastersIfEmpty();
  }, []);

  const tabs: { id: Tab; label: string; icon: typeof MapPin }[] = [
    { id: 'locations', label: 'Locations', icon: MapPin },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'partners', label: 'Partners', icon: Building2 },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Masters</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Locations, categories, and business partners
        </p>
      </header>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              tab === id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'locations' && <LocationsPanel />}
      {tab === 'categories' && <CategoriesPanel />}
      {tab === 'partners' && <PartnersPanel />}
    </div>
  );
}
