import React from 'react';
import { Species } from '../types.ts';
import { handleDesignImageError } from '../utils/imageFallback.ts';

interface BottomCarouselProps {
  speciesList: Species[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
}

export const BottomCarousel: React.FC<BottomCarouselProps> = ({
  speciesList,
  currentIndex,
  onSelectIndex,
}) => {
  const visibleCount = Math.min(4, speciesList.length);
  const firstVisibleIndex = Math.min(
    Math.max(0, currentIndex - Math.floor(visibleCount / 2)),
    Math.max(0, speciesList.length - visibleCount),
  );
  const visibleSpecies = speciesList
    .slice(firstVisibleIndex, firstVisibleIndex + visibleCount)
    .map((species, offset) => ({ species, idx: firstVisibleIndex + offset }));

  return (
    <div className="w-full z-30 select-none bg-gradient-to-t from-black via-black/85 to-transparent pt-2 px-6 md:px-12 pb-3 shrink-0 flex justify-center">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full max-w-5xl mx-auto">
        {visibleSpecies.map(({ species, idx }) => {
          const isActive = currentIndex === idx;

          return (
            <button
              key={species.id}
              onClick={() => onSelectIndex(idx)}
              className={`group relative h-20 md:h-24 lg:h-26 rounded-xs overflow-hidden text-left transition-all duration-300 cursor-pointer border ${
                isActive
                  ? 'border-[#FDB813] shadow-[0_0_24px_rgba(253,184,19,0.35)] scale-[1.01]'
                  : 'border-white/10 hover:border-white/30 opacity-75 hover:opacity-100'
              }`}
            >
              {/* Background Photography */}
              <img
                src={species.thumbnailImage}
                alt={species.name}
                referrerPolicy="no-referrer"
                onError={handleDesignImageError}
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  isActive ? 'scale-110' : 'group-hover:scale-105'
                }`}
              />

              {/* Tint / Gradient Overlay */}
              <div
                className={`absolute inset-0 transition-opacity duration-300 ${
                  isActive
                    ? 'bg-[#FDB813]/45 mix-blend-multiply'
                    : 'bg-gradient-to-t from-black/90 via-black/40 to-transparent group-hover:from-black/70'
                }`}
              />

              {/* Active Golden Highlight Banner */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-tr from-[#FDB813]/70 via-[#FDB813]/30 to-transparent" />
              )}

              {/* Card Label Content */}
              <div className="absolute inset-0 p-3 flex flex-col justify-end">
                <span className="text-[9px] tracking-[0.2em] uppercase font-bold text-neutral-200/90 mb-0.5">
                  {species.statusBadge} · {species.region.split(',')[0]}
                </span>
                <h3 className="text-xs md:text-sm lg:text-base font-black tracking-tight text-white uppercase leading-none drop-shadow-md">
                  {species.name}
                </h3>
              </div>

              {/* Active Top Glow Line */}
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#FDB813]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
