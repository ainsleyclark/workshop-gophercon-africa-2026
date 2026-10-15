import React from 'react';
import { Compass, Search, Info } from 'lucide-react';
import { Species } from '../types.ts';
import { handleDesignImageError } from '../utils/imageFallback.ts';

interface LeftSidebarProps {
  speciesList: Species[];
  activeAnimalIndex: number;
  onSelectAnimal: (index: number) => void;
  onOpenSearch: () => void;
  onOpenAbout: () => void;
  onOpenAerialMap?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  speciesList,
  activeAnimalIndex,
  onSelectAnimal,
  onOpenSearch,
  onOpenAbout,
  onOpenAerialMap,
}) => (
  <aside className="relative z-40 flex w-[50px] shrink-0 flex-col items-center justify-between bg-[#FDB813] py-5 shadow-2xl" aria-label="Wildlife atlas navigation">
    <button onClick={onOpenAbout} title="About Wildlife Atlas" className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#121316] text-white shadow-md transition hover:scale-105">
      <span className="h-6 w-4 border-[3px] border-[#FDB813]" />
    </button>

    <nav className="my-auto flex flex-col items-center gap-3 py-5" aria-label="Species">
      {speciesList.map((species, index) => (
        <button key={species.id} onClick={() => onSelectAnimal(index)} title={species.name} aria-label={`Show ${species.name}`} className={`rounded-full border-2 transition ${activeAnimalIndex === index ? 'border-black shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'}`}>
          <img src={species.thumbnailImage} alt="" onError={handleDesignImageError} className="h-9 w-9 rounded-full object-cover" />
        </button>
      ))}
    </nav>

    <div className="flex flex-col gap-3">
      <button onClick={onOpenSearch} title="Search species" aria-label="Search species" className="rounded-lg p-2 text-black transition hover:bg-black/10"><Search className="h-5 w-5" /></button>
      <button onClick={onOpenAerialMap} title="Open 3D observations map" aria-label="Open 3D observations map" className="rounded-lg p-2 text-black transition hover:bg-black/10"><Compass className="h-5 w-5" /></button>
      <button onClick={onOpenAbout} title="About" aria-label="About" className="rounded-lg p-2 text-black transition hover:bg-black/10"><Info className="h-5 w-5" /></button>
    </div>
  </aside>
);
