import React, { useState, useRef, useEffect } from 'react';
import { Search, Compass, X, Globe } from 'lucide-react';
import { Species } from '../types.ts';
import { handleDesignImageError } from '../utils/imageFallback.ts';

interface TopNavProps {
  speciesList: Species[];
  onSelectSpecies: (index: number) => void;
  onOpenAerialMap: (speciesIndex?: number) => void;
  onOpenPetition?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  speciesList,
  onSelectSpecies,
  onOpenAerialMap,
  onOpenPetition,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsOpenDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredAnimals = speciesList.filter((animal) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      animal.name.toLowerCase().includes(q) ||
      animal.scientificName.toLowerCase().includes(q) ||
      animal.region.toLowerCase().includes(q) ||
      animal.sanctuaryName.toLowerCase().includes(q) ||
      animal.habitat.toLowerCase().includes(q)
    );
  });

  const handleSelectAnimal = (index: number) => {
    onSelectSpecies(index);
    onOpenAerialMap(index);
    setSearchQuery('');
    setIsOpenDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredAnimals.length > 0) {
      const idx = speciesList.findIndex((s) => s.id === filteredAnimals[0].id);
      if (idx !== -1) {
        handleSelectAnimal(idx);
      }
    }
  };

  return (
    <header className="h-16 md:h-20 w-full flex items-center justify-between px-4 md:px-8 lg:px-10 z-30 select-none relative gap-4">
      {/* Zone 1: National Geographic Iconic Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="/"
          className="bg-black/90 px-3 py-2 flex items-center gap-2.5 rounded-xs border border-white/10 shadow-lg group hover:bg-black transition-colors"
          title="National Geographic"
        >
          {/* Iconic Yellow Border Rectangle */}
          <div className="w-3.5 h-6 border-[3px] border-[#FDB813] bg-transparent shrink-0" />

          {/* Brand Wordmark */}
          <div className="flex flex-col text-[11px] leading-[1.05] tracking-[0.14em] font-extrabold text-white uppercase font-sans">
            <span>NATIONAL</span>
            <span>GEOGRAPHIC</span>
          </div>
        </a>
      </div>

      {/* Zone 2: Clearly Visible, High-Contrast Search Bar on Header */}
      <div
        ref={searchContainerRef}
        className="relative flex-1 max-w-xl mx-2 md:mx-6"
      >
        <div className="relative flex items-center bg-[#1c1e24] hover:bg-[#23262e] focus-within:bg-[#23262e] border-2 border-white/20 hover:border-[#FDB813]/60 focus-within:border-[#FDB813] rounded-md shadow-xl transition-all focus-within:shadow-[0_0_22px_rgba(253,184,19,0.25)]">
          <div className="pl-3.5 pr-2 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-[#FDB813] shrink-0" />
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpenDropdown(true);
            }}
            onFocus={() => setIsOpenDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search animals for 3D Aerial Map (e.g. Snow Leopard, Tiger)..."
            className="w-full py-2.5 pr-24 bg-transparent text-xs md:text-sm text-white placeholder-neutral-400 font-medium focus:outline-none tracking-wide"
          />

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Direct 3D Map shortcut pill inside search bar */}
          <button
            onClick={() => onOpenAerialMap()}
            title="Open 3D Aerial Satellite Habitat Map"
            className="mr-2 px-2.5 py-1 bg-[#FDB813] hover:bg-[#e5a40f] text-black font-black text-[10px] tracking-wider uppercase rounded-xs flex items-center gap-1 shadow cursor-pointer transition-transform active:scale-95 shrink-0"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3D MAP</span>
          </button>
        </div>

        {/* Live Auto-Suggest Search Dropdown */}
        {isOpenDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#181a1f] border-2 border-[#FDB813]/50 rounded-md shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto divide-y divide-white/5 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="px-3.5 py-2 bg-black/70 text-[9px] uppercase tracking-[0.2em] font-extrabold text-[#FDB813] flex justify-between items-center">
              <span>EXPLORE ANIMAL HABITAT SATELLITE MAP</span>
              <span>PRESS ENTER TO FLY</span>
            </div>

            {filteredAnimals.length === 0 ? (
              <div className="p-4 text-center text-xs text-neutral-400">
                No matching wildlife found for "{searchQuery}".
              </div>
            ) : (
              filteredAnimals.map((animal) => {
                const originalIdx = speciesList.findIndex((s) => s.id === animal.id);

                return (
                  <button
                    key={animal.id}
                    onClick={() => handleSelectAnimal(originalIdx)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-[#FDB813]/10 hover:border-l-3 hover:border-l-[#FDB813] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={animal.thumbnailImage}
                        alt={animal.name}
                        onError={handleDesignImageError}
                        className="w-10 h-10 object-cover rounded shrink-0 border border-white/10 group-hover:border-[#FDB813]"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs md:text-sm font-bold text-white group-hover:text-[#FDB813] transition-colors uppercase">
                            {animal.name}
                          </span>
                          <span className="text-[9px] font-mono px-1 py-0.2 bg-black/60 text-amber-400 border border-neutral-700 rounded">
                            {animal.statusBadge}
                          </span>
                        </div>
                        <div className="text-[10px] md:text-[11px] text-neutral-400 italic truncate font-serif">
                          {animal.scientificName} · {animal.sanctuaryName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[#FDB813] shrink-0 text-[10px] font-mono uppercase bg-black/40 px-2.5 py-1 rounded border border-white/5 group-hover:bg-[#FDB813] group-hover:text-black transition-colors font-bold">
                      <Globe className="w-3.5 h-3.5" />
                      <span>3D AERIAL</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Zone 3: Clean, uncluttered action links (leaving a few essential ones) */}
      <div className="flex items-center gap-3 md:gap-5 text-[11px] md:text-xs font-semibold tracking-[0.18em] uppercase shrink-0">
        {onOpenPetition && (
          <button
            onClick={onOpenPetition}
            className="text-neutral-300 hover:text-white hover:underline underline-offset-8 transition-colors whitespace-nowrap cursor-pointer text-[11px] font-bold"
          >
            SIGN A PETITION
          </button>
        )}
      </div>
    </header>
  );
};
