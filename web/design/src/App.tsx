/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { loadWildlife, UPCOMING_PROGRAM } from './data/speciesData.ts';
import { Species } from './types.ts';
import { LeftSidebar } from './components/LeftSidebar.tsx';
import { TopNav } from './components/TopNav.tsx';
import { HeroStage } from './components/HeroStage.tsx';
import { BottomCarousel } from './components/BottomCarousel.tsx';
import { PetitionModal } from './components/PetitionModal.tsx';
import { PledgeModal } from './components/PledgeModal.tsx';
import { SearchModal } from './components/SearchModal.tsx';
import { ProgramModal } from './components/ProgramModal.tsx';
import { AboutModal } from './components/AboutModal.tsx';
import { AnimalAerialMapModal } from './components/AnimalAerialMapModal.tsx';

const AUTO_SWITCH_INTERVAL_MS = 6500;
const TICK_INTERVAL_MS = 50;

export default function App() {
  const isMapRoute = window.location.pathname === '/map';
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [loadError, setLoadError] = useState('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(true);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Modal Dialog States
  const [isPetitionOpen, setIsPetitionOpen] = useState<boolean>(false);
  const [isPledgeOpen, setIsPledgeOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isProgramOpen, setIsProgramOpen] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [aerialMapSpeciesIndex, setAerialMapSpeciesIndex] = useState<number>(0);

  const activeSpecies = speciesList[currentIndex];
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedRef = useRef<number>(0);

  useEffect(() => {
    loadWildlife()
      .then((animals) => {
        setSpeciesList(animals);
        setCurrentIndex(0);
        const requestedId = new URLSearchParams(window.location.search).get('speciesId');
        const requestedIndex = requestedId ? animals.findIndex((animal) => animal.id === requestedId) : -1;
        if (requestedIndex >= 0) setAerialMapSpeciesIndex(requestedIndex);
        if (animals.length === 0) setLoadError('No species are stored yet. Ingest sightings to populate the atlas.');
      })
      .catch(() => setLoadError('Could not load species and observations from the database.'));
  }, []);

  // Check if any modal is currently open
  const isAnyModalOpen =
    isPetitionOpen ||
    isPledgeOpen ||
    isSearchOpen ||
    isProgramOpen ||
    isAboutOpen;

  // Auto-switching tick runner
  useEffect(() => {
    if (isMapRoute || !isAutoPlay || isHovered || isAnyModalOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      elapsedRef.current += TICK_INTERVAL_MS;
      const progress = (elapsedRef.current / AUTO_SWITCH_INTERVAL_MS) * 100;
      setProgressPercent(progress);

      if (elapsedRef.current >= AUTO_SWITCH_INTERVAL_MS && speciesList.length > 0) {
        elapsedRef.current = 0;
        setProgressPercent(0);
        setCurrentIndex((prev) => (prev + 1) % speciesList.length);
      }
    }, TICK_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isMapRoute, isAutoPlay, isHovered, isAnyModalOpen, currentIndex, speciesList.length]);

  // When manually selecting a species
  const handleSelectSpecies = (index: number) => {
    elapsedRef.current = 0;
    setProgressPercent(0);
    setCurrentIndex(index);
    setAerialMapSpeciesIndex(index);
  };

  const handleToggleAutoPlay = () => {
    setIsAutoPlay((prev) => !prev);
    elapsedRef.current = 0;
    setProgressPercent(0);
  };

  const handleOpenAerialMap = (index?: number) => {
    const selectedIndex = index ?? currentIndex;
    if (isMapRoute) {
      setAerialMapSpeciesIndex(selectedIndex);
      return;
    }
    const selectedId = speciesList[selectedIndex]?.id;
    window.location.assign(`/map${selectedId ? `?speciesId=${encodeURIComponent(selectedId)}` : ''}`);
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (isMapRoute) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnyModalOpen) {
        if (e.key === 'Escape') {
          setIsPetitionOpen(false);
          setIsPledgeOpen(false);
          setIsSearchOpen(false);
          setIsProgramOpen(false);
          setIsAboutOpen(false);
        }
        return;
      }

      if (speciesList.length === 0) return;
      if (e.key === 'ArrowRight') {
        handleSelectSpecies((currentIndex + 1) % speciesList.length);
      } else if (e.key === 'ArrowLeft') {
        handleSelectSpecies((currentIndex - 1 + speciesList.length) % speciesList.length);
      } else if (e.key === ' ') {
        e.preventDefault();
        handleToggleAutoPlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMapRoute, currentIndex, isAnyModalOpen, speciesList.length]);

  if (isMapRoute) {
    return (
      <AnimalAerialMapModal
        isOpen
        onClose={() => window.location.assign('/')}
        speciesList={speciesList}
        selectedSpeciesIndex={aerialMapSpeciesIndex}
        onSelectSpecies={setAerialMapSpeciesIndex}
        isLoading={speciesList.length === 0 && !loadError}
        loadError={loadError}
      />
    );
  }

  if (speciesList.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#16171b] px-6 text-center text-white">
        <div>
          <div className="mx-auto mb-5 h-12 w-8 border-4 border-[#FDB813]" />
          <h1 className="text-2xl font-black uppercase tracking-wide">Wildlife Atlas</h1>
          <p className="mt-3 text-sm text-neutral-400">{loadError || 'Loading species and field observations…'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#16171b] text-white">
      {/* 1. Left Signature Yellow Navigation Column (Heart icon removed, cleanly aligned) */}
      <LeftSidebar
        speciesList={speciesList}
        activeAnimalIndex={currentIndex}
        onSelectAnimal={handleSelectSpecies}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenAerialMap={() => handleOpenAerialMap()}
      />

      {/* 2. Main Editorial Viewport Canvas */}
      <main
        className="flex-1 flex flex-col h-full overflow-hidden relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Top Header Zone with Visible Search Bar & 3D Aerial Satellite Trigger */}
        <TopNav
          speciesList={speciesList}
          onSelectSpecies={handleSelectSpecies}
          onOpenAerialMap={handleOpenAerialMap}
          onOpenPetition={() => setIsPetitionOpen(true)}
        />

        {/* 3D Foreground / Typography Stage */}
        <HeroStage
          speciesList={speciesList}
          currentIndex={currentIndex}
          onSelectIndex={handleSelectSpecies}
          isAutoPlay={isAutoPlay}
          onToggleAutoPlay={handleToggleAutoPlay}
          progressPercent={progressPercent}
          onOpenProgram={() => setIsProgramOpen(true)}
        />

        {/* Bottom Drawer Preview Cards */}
        <BottomCarousel
          speciesList={speciesList}
          currentIndex={currentIndex}
          onSelectIndex={handleSelectSpecies}
        />
      </main>

      {/* Interactive Feature Modals */}
      <PetitionModal
        isOpen={isPetitionOpen}
        onClose={() => setIsPetitionOpen(false)}
        activeSpeciesName={activeSpecies.name}
      />

      <PledgeModal
        isOpen={isPledgeOpen}
        onClose={() => setIsPledgeOpen(false)}
        activeSpeciesName={activeSpecies.name}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        speciesList={speciesList}
        onSelectSpecies={handleSelectSpecies}
        onOpenAerialMap={handleOpenAerialMap}
      />

      <ProgramModal
        isOpen={isProgramOpen}
        onClose={() => setIsProgramOpen(false)}
        program={UPCOMING_PROGRAM}
        featuredName={activeSpecies.name}
        featuredImage={activeSpecies.heroImage}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
    </div>
  );
}
