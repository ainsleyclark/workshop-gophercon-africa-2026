import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Species } from '../types.ts';
import { Play, Pause, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { TEASER_TIGER_IMAGE } from '../data/speciesData.ts';
import { handleDesignImageError } from '../utils/imageFallback.ts';

interface HeroStageProps {
  speciesList: Species[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  isAutoPlay: boolean;
  onToggleAutoPlay: () => void;
  progressPercent: number;
  onOpenProgram: () => void;
}

export const HeroStage: React.FC<HeroStageProps> = ({
  speciesList,
  currentIndex,
  onSelectIndex,
  isAutoPlay,
  onToggleAutoPlay,
  progressPercent,
  onOpenProgram,
}) => {
  const currentSpecies = speciesList[currentIndex];
  const finalLineWords = currentSpecies.line3.trim().split(/\s+/);
  const finalLineLead = finalLineWords.slice(0, -1).join(' ');
  const finalLineAccent = finalLineWords.at(-1) ?? '';
  const [showFactMode, setShowFactMode] = useState<boolean>(false);

  // 3D Parallax Tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState({ rotateX: 0, rotateY: 0, moveX: 0, moveY: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    setParallax({
      rotateX: y * -10,
      rotateY: x * 12,
      moveX: x * 28,
      moveY: y * 20,
    });
  };

  const handleMouseLeave = () => {
    setParallax({ rotateX: 0, rotateY: 0, moveX: 0, moveY: 0 });
  };

  const goToNextSpecies = () => {
    onSelectIndex((currentIndex + 1) % speciesList.length);
  };

  const prevSpecies = () => {
    onSelectIndex((currentIndex - 1 + speciesList.length) % speciesList.length);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex-1 w-full flex flex-col justify-between pl-8 md:pl-14 lg:pl-20 pr-4 md:pr-8 pt-2 pb-3 overflow-hidden select-none"
      style={{
        perspective: '1400px',
      }}
    >
      {/* Dynamic 3D Scene Ambient Background (Pure Studio Dark Wall) */}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out pointer-events-none"
        style={{
          transform: `rotateX(${parallax.rotateX * 0.4}deg) rotateY(${parallax.rotateY * 0.4}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 65% 45%, #3c4049 0%, #25282f 45%, #16171b 85%)',
          }}
        />
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-[#101114]/70 pointer-events-none" />
      </div>

      {/* Layer 1: Wide Multi-Line Typography & Editorial Content (Passing Through Animal) */}
      <div
        className="relative z-10 pt-1 lg:pt-2 w-full transition-transform duration-300 ease-out"
        style={{
          transform: `translate3d(${parallax.moveX * 0.35}px, ${parallax.moveY * 0.35}px, 0px)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* 3D Heading with AnimatePresence: Line 1 maintains full title length, Lines 2 & 3 reduced a bit */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSpecies.id}
            initial={{ opacity: 0, y: 18, filter: 'blur(3px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -18, filter: 'blur(3px)' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-visible"
          >
            <h2 className="select-none font-['Outfit']" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {/* Line 1: First line with increased size extending into animal */}
              <span
                className="block font-black text-white leading-[0.90] tracking-[-0.025em] uppercase whitespace-nowrap drop-shadow-[0_12px_40px_rgba(0,0,0,0.85)]"
                style={{ fontSize: 'clamp(2.7rem, 5.2vw, 5.4rem)' }}
              >
                {currentSpecies.line1}
              </span>

              {/* Line 2: Second line increased a bit, tucking cleanly into the animal profile */}
              <span
                className="block font-black text-white/95 leading-[0.90] tracking-[-0.02em] uppercase whitespace-nowrap drop-shadow-[0_12px_40px_rgba(0,0,0,0.85)]"
                style={{ fontSize: 'clamp(2.25rem, 4.3vw, 4.5rem)' }}
              >
                {currentSpecies.line2}
              </span>

              {/* Line 3: Third line completing species title */}
              <span
                className="block font-black text-neutral-100/95 leading-[0.90] tracking-[-0.025em] uppercase whitespace-nowrap drop-shadow-[0_12px_40px_rgba(0,0,0,0.85)]"
                style={{ fontSize: 'clamp(2.45rem, 4.7vw, 4.9rem)' }}
              >
                {finalLineLead}{finalLineLead ? ' ' : ''}
                <span
                  className="animal-image-texture inline-block"
                  style={{
                    backgroundImage: `linear-gradient(115deg, rgb(255 211 79 / 78%), rgb(255 246 204 / 88%) 48%, rgb(222 153 31 / 78%)), url("${currentSpecies.thumbnailImage}")`,
                    backgroundBlendMode: 'screen',
                  }}
                >
                  {finalLineAccent}
                </span>
              </span>
            </h2>
          </motion.div>
        </AnimatePresence>

        {/* Expanded Content Width & Editorial Narrative */}
        <div className="mt-5 lg:mt-6 max-w-lg lg:max-w-xl xl:max-w-2xl">
          {/* Metadata Telemetry Line */}
          <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
            <span className="font-mono font-bold text-[#FDB813] tracking-wider uppercase text-[11px]">
              {currentSpecies.scientificName}
            </span>
            <span className="text-neutral-500 font-light" aria-hidden="true">·</span>
            <span className="text-neutral-300 text-[11px] font-medium">
              {currentSpecies.status}
            </span>
            <span className="text-neutral-500 font-light" aria-hidden="true">·</span>
            <span className="text-neutral-400 text-[11px] tabular-nums">
              {currentSpecies.population}
            </span>
            <span className="text-neutral-500 font-light" aria-hidden="true">·</span>
            <span className="font-mono text-[#FDB813] text-[11px]">
              {currentSpecies.elevation}
            </span>
          </div>

          {/* Enriched Editorial Description Wordings */}
          <p className="text-xs md:text-sm text-neutral-300/90 font-light leading-relaxed">
            {showFactMode ? currentSpecies.editorialFact : currentSpecies.latinDeck}
          </p>

          <div className="mt-2.5 flex items-center gap-4">
            <button
              onClick={() => setShowFactMode(!showFactMode)}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-400 hover:text-[#FDB813] transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{showFactMode ? 'Switch to Editorial Mock Wording' : 'View In-Depth Field Notes & Telemetry'}</span>
            </button>
          </div>
        </div>

        {/* Slide Progress Indicator Bars (Exact matching style from reference image) */}
        <div className="mt-4 lg:mt-5 flex items-center gap-2.5">
          {speciesList.slice(0, 3).map((item, idx) => {
            const isActive = currentIndex === idx;
            return (
              <button
                key={item.id}
                onClick={() => onSelectIndex(idx)}
                title={`Switch to ${item.name}`}
                className="relative h-1.5 rounded-full overflow-hidden transition-all duration-300 cursor-pointer"
                style={{
                  width: isActive ? '3.5rem' : '2.8rem',
                  backgroundColor: isActive ? 'rgba(253, 184, 19, 0.3)' : 'rgba(255, 255, 255, 0.28)',
                }}
              >
                {isActive && (
                  <div
                    className="h-full bg-[#FDB813] rounded-full transition-all ease-linear"
                    style={{
                      width: isAutoPlay ? `${Math.min(100, Math.max(0, progressPercent))}%` : '100%',
                    }}
                  />
                )}
              </button>
            );
          })}

          {/* Auto-Play & Navigation Controls */}
          <div className="flex items-center gap-1 ml-3 pl-3 border-l border-white/10">
            <button
              onClick={onToggleAutoPlay}
              title={isAutoPlay ? 'Pause Auto-Switching' : 'Resume Auto-Switching'}
              className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label={isAutoPlay ? 'Pause' : 'Play'}
            >
              {isAutoPlay ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
            </button>

            <button
              onClick={prevSpecies}
              title="Previous Species"
              className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={goToNextSpecies}
              title="Next Species"
              className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Layer 2: Foreground Transparent 3D Animal Cutout (FAR RIGHT, Words Pass Underneath Through Animal) */}
      <div
        className="absolute right-0 top-0 bottom-0 w-[54%] md:w-[58%] lg:w-[60%] pointer-events-none flex items-center justify-end z-20"
        style={{
          transform: `translate3d(${parallax.moveX * -1.2}px, ${parallax.moveY * -1}px, 70px)`,
          transformStyle: 'preserve-3d',
        }}
      >
        <div className="relative w-full h-full flex items-center justify-end pr-0 md:pr-4 lg:pr-8">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentSpecies.id}
              src={currentSpecies.heroImage}
              alt={currentSpecies.name}
              referrerPolicy="no-referrer"
              onError={handleDesignImageError}
              initial={{ opacity: 0, scale: 0.94, x: 70, rotateY: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0, rotateY: 0 }}
              exit={{ opacity: 0, scale: 1.04, x: -40, rotateY: -8 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="h-[102%] max-h-[105%] w-auto max-w-none object-contain object-right-center filter drop-shadow-[0_25px_45px_rgba(0,0,0,0.85)]"
            />
          </AnimatePresence>
        </div>
      </div>

      {/* Layer 3: Preview of the next species in the database */}
      <div
        onClick={onOpenProgram}
        className="absolute right-6 md:right-12 lg:right-16 bottom-2 lg:bottom-3 z-30 flex items-end cursor-pointer group transition-all duration-300"
        style={{
          transform: `translate3d(${parallax.moveX * -0.5}px, ${parallax.moveY * -0.5}px, 45px)`,
        }}
        title="Coming up on Nat Geo Wild"
      >
        {/* Existing design teaser artwork */}
        <div className="relative w-36 md:w-44 lg:w-52 xl:w-56 -mb-1 z-20 pointer-events-none transform group-hover:-translate-y-1.5 transition-transform duration-300">
          <img
            src={TEASER_TIGER_IMAGE}
            alt="Tiger in the Predator feature"
            referrerPolicy="no-referrer"
            onError={handleDesignImageError}
            className="w-full h-auto object-contain filter drop-shadow-[0_16px_25px_rgba(0,0,0,0.9)]"
          />
        </div>

        {/* Original schedule teaser */}
        <div className="flex flex-col text-right -ml-8 md:-ml-12 lg:-ml-14 xl:-ml-16 z-10 select-none">
          <span className="text-[10px] md:text-[11px] uppercase tracking-[0.22em] font-extrabold text-neutral-300 group-hover:text-white transition-colors">
            COMING UP
          </span>
          <span className="text-4xl font-black tracking-tight text-[#FDB813] leading-tight my-0.5 drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)] md:text-6xl">
            21:30
          </span>
          <span className="text-xs md:text-sm lg:text-base font-black uppercase tracking-[0.18em] text-white group-hover:text-[#FDB813] transition-colors leading-tight drop-shadow-md">
            PREDATOR
          </span>
          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-neutral-400">NAT GEO WILD SPECIAL</span>
        </div>
      </div>
    </div>
  );
};
