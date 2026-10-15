import React, { useState } from 'react';
import { X, Search as SearchIcon, ArrowRight, MapPin, Compass } from 'lucide-react';
import { Species } from '../types.ts';
import { handleDesignImageError } from '../utils/imageFallback.ts';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  speciesList: Species[];
  onSelectSpecies: (index: number) => void;
  onOpenAerialMap?: (index: number) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  speciesList,
  onSelectSpecies,
  onOpenAerialMap,
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const filtered = speciesList.filter((s) => {
    const matchesQuery =
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.scientificName.toLowerCase().includes(query.toLowerCase()) ||
      s.region.toLowerCase().includes(query.toLowerCase()) ||
      s.habitat.toLowerCase().includes(query.toLowerCase());

    return matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#181a1f] border border-white/10 rounded-sm shadow-2xl overflow-hidden text-neutral-100 max-h-[85vh] flex flex-col">
        <div className="h-1.5 bg-[#FDB813] w-full shrink-0" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pb-3 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#FDB813]">
            DATABASE SPECIES CATALOGUE
            </span>
          </div>

          <h3 className="text-xl font-black uppercase tracking-tight text-white font-['Outfit']">
            Search Recorded Species
          </h3>

          {/* Search Input Bar */}
          <div className="relative mt-3">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by species name, taxonomy, or recorded location..."
              className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-neutral-700 rounded text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FDB813]"
            />
          </div>

        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-neutral-400 text-xs">
              No matching species found for "{query}".
            </div>
          ) : (
            filtered.map((species) => {
              const originalIndex = speciesList.findIndex((s) => s.id === species.id);

              return (
                <div
                  key={species.id}
                  onClick={() => {
                    onSelectSpecies(originalIndex);
                    onClose();
                  }}
                  className="flex items-center gap-4 p-3 bg-black/40 hover:bg-neutral-800/80 border border-white/5 hover:border-[#FDB813]/40 rounded transition-all cursor-pointer group"
                >
                  <img
                    src={species.thumbnailImage}
                    alt={species.name}
                    referrerPolicy="no-referrer"
                    onError={handleDesignImageError}
                    className="w-16 h-14 object-cover rounded shrink-0 group-hover:scale-105 transition-transform"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white uppercase group-hover:text-[#FDB813] transition-colors">
                        {species.name}
                      </span>
                      <span className="px-1.5 py-0.2 bg-black/60 border border-neutral-700 text-[10px] font-mono font-bold text-amber-400 rounded">
                        {species.statusBadge}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-400 italic truncate font-serif">
                      {species.scientificName}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 mt-1">
                      <MapPin className="w-3 h-3 text-[#FDB813] shrink-0" />
                      <span className="truncate">{species.region}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {onOpenAerialMap && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSpecies(originalIndex);
                          onClose();
                          onOpenAerialMap(originalIndex);
                        }}
                        className="px-2.5 py-1.5 bg-[#FDB813]/20 hover:bg-[#FDB813] text-[#FDB813] hover:text-black border border-[#FDB813]/40 rounded text-[10px] font-mono font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                        title="Open 3D Aerial Satellite Map"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">3D MAP</span>
                      </button>
                    )}
                    <div className="text-neutral-500 group-hover:text-[#FDB813] group-hover:translate-x-1 transition-all">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
