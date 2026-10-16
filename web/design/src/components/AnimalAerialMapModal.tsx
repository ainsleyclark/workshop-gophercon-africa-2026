import React, { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { Map as MapLibreMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ArrowLeft, Search, Satellite, Compass, ZoomIn, ZoomOut } from 'lucide-react';
import { Species } from '../types.ts';
import { handleDesignImageError } from '../utils/imageFallback.ts';

interface AnimalAerialMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  speciesList: Species[];
  selectedSpeciesIndex: number;
  onSelectSpecies: (index: number) => void;
  isLoading: boolean;
  loadError: string;
}

type LayerMode = 'satellite' | 'terrain';

export const AnimalAerialMapModal: React.FC<AnimalAerialMapModalProps> = ({
  isOpen,
  onClose,
  speciesList,
  selectedSpeciesIndex,
  onSelectSpecies,
  isLoading,
  loadError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const onSelectSpeciesRef = useRef(onSelectSpecies);
  const previousSelectionRef = useRef(selectedSpeciesIndex);
  const [mapReady, setMapReady] = useState(false);
  const [layer, setLayer] = useState<LayerMode>('satellite');
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const activeSpecies = speciesList[selectedSpeciesIndex];
  const observations = useMemo(
    () => speciesList.flatMap((species, speciesIndex) => species.sightings.map((sighting) => ({ species, speciesIndex, sighting }))),
    [speciesList],
  );
  const results = search.trim()
    ? speciesList.filter((species) => `${species.name} ${species.scientificName} ${species.region}`.toLowerCase().includes(search.trim().toLowerCase()))
    : speciesList;

  onSelectSpeciesRef.current = onSelectSpecies;

  useEffect(() => {
    if (!isOpen || !containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      // Open on the Africa-centered globe from the design reference. Keep a
      // broad view on entry so the globe reads as a world map before users
      // choose a species or observation to zoom into.
      center: [20, 4],
      zoom: 2.75,
      minZoom: 1,
      maxZoom: 19,
      pitch: 0,
      bearing: 0,
      maxPitch: 75,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          imagery: {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            maxzoom: 19,
            attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
          },
          labels: {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            maxzoom: 19,
            attribution: 'Labels © Esri',
          },
          relief: {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            maxzoom: 13,
            attribution: 'Relief © Esri',
          },
          terrain: {
            type: 'raster-dem',
            tiles: ['https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png'],
            tileSize: 256,
            maxzoom: 15,
            encoding: 'terrarium',
            attribution: 'Terrain © AWS Terrain Tiles, Mapzen',
          },
        },
        layers: [
          { id: 'imagery', type: 'raster', source: 'imagery' },
          { id: 'labels', type: 'raster', source: 'labels', paint: { 'raster-opacity': 0.92 } },
          { id: 'relief', type: 'raster', source: 'relief', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.5 } },
        ],
        sky: { 'sky-color': '#030714', 'horizon-color': '#13213b', 'fog-color': '#0d1729', 'fog-ground-blend': 0.72, 'sky-horizon-blend': 0.35 },
      },
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }), 'bottom-right');
    map.on('load', () => {
      map.setProjection({ type: 'globe' });
      setMapReady(true);
    });
    // Make the animal pins usable as soon as the map style is ready; terrain
    // tiles are optional and must not delay the first view.
    map.on('style.load', () => setMapReady(true));
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [isOpen]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = observations.map(({ species, speciesIndex, sighting }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'wildlife-map-pin';
      button.setAttribute('aria-label', `Locate ${species.name} observation`);
      button.title = [species.name, sighting.locality, sighting.country].filter(Boolean).join(' · ');

      const image = document.createElement('img');
      image.src = species.thumbnailImage;
      image.alt = species.name;
      image.onerror = () => { image.src = '/assets/showcase/wildlife-placeholder.svg'; };
      button.appendChild(image);
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        previousSelectionRef.current = speciesIndex;
        onSelectSpeciesRef.current(speciesIndex);
        map.easeTo({ center: [sighting.coordinates[1], sighting.coordinates[0]], zoom: Math.max(map.getZoom(), 7), pitch: 55, bearing: -18, duration: 1500 });
      });

      const marker = new maplibregl.Marker({ element: button, anchor: 'center' })
        .setLngLat([sighting.coordinates[1], sighting.coordinates[0]])
        .addTo(map);
      return marker;
    });

    const resizePins = () => {
      const zoom = map.getZoom();
      const size = Math.max(22, Math.min(54, 26 + (zoom - 1) * 2.4));
      markersRef.current.forEach((marker) => {
        marker.getElement().style.setProperty('--pin-size', `${size}px`);
      });
    };
    resizePins();
    map.on('zoom', resizePins);
    return () => { map.off('zoom', resizePins); };
  }, [mapReady, observations]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeSpecies || previousSelectionRef.current === selectedSpeciesIndex) return;
    previousSelectionRef.current = selectedSpeciesIndex;
    if (activeSpecies.sightings.length === 0) return;
    const [latitude, longitude] = activeSpecies.coordinates;
    map.easeTo({ center: [longitude, latitude], zoom: 7.2, pitch: 55, bearing: -18, duration: 1600 });
  }, [selectedSpeciesIndex, activeSpecies]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (layer === 'terrain' && !map.getTerrain()) map.setTerrain({ source: 'terrain', exaggeration: 1.25 });
    if (layer === 'satellite' && map.getTerrain()) map.setTerrain(null);
    if (map.getLayer('relief')) map.setLayoutProperty('relief', 'visibility', layer === 'terrain' ? 'visible' : 'none');
    if (map.getLayer('imagery')) map.setPaintProperty('imagery', 'raster-opacity', layer === 'terrain' ? 0.62 : 1);
  }, [layer]);

  const selectSpecies = (index: number) => {
    const species = speciesList[index];
    if (!species) return;
    setSearch(species.name);
    setShowResults(false);
    previousSelectionRef.current = -1;
    onSelectSpecies(index);
    if (species.sightings.length === 0) return;
    const [latitude, longitude] = species.coordinates;
    mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 7.2, pitch: 55, bearing: -18, duration: 1700 });
  };

  if (!isOpen) return null;
  return (
    <main className="wildlife-map-page fixed inset-0 z-50 bg-[#02040b] text-white">
      <div className="absolute inset-0">
        <div ref={containerRef} className="h-full w-full" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-black/75 via-black/30 to-transparent" />

      <header className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 px-3 py-3 md:px-6 md:py-4">
        <button onClick={onClose} className="flex shrink-0 items-center gap-2 rounded-full border border-white/20 bg-black/55 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur transition hover:border-[#FDB813] hover:text-[#FDB813] md:px-4" aria-label="Back to Wildlife Atlas">
          <ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Back</span>
        </button>
        <div className="relative min-w-0 max-w-2xl flex-1">
          <div className="flex items-center rounded-full border border-white/20 bg-[#171b24]/90 px-4 shadow-2xl backdrop-blur-xl focus-within:border-[#FDB813]/70">
            <Search className="h-4 w-4 shrink-0 text-[#FDB813]" />
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
              onKeyDown={(event) => { if (event.key === 'Enter' && results[0]) selectSpecies(speciesList.findIndex((species) => species.id === results[0].id)); }}
              placeholder="Search animals or locations"
              aria-label="Search animals on the map"
              className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/45"
            />
            {activeSpecies && <span className="hidden border-l border-white/15 pl-3 text-xs font-semibold uppercase tracking-wide text-white/70 lg:block">{activeSpecies.name}</span>}
          </div>
          {showResults && results.length > 0 && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-[#10141d]/95 p-1 shadow-2xl backdrop-blur-xl">
              {results.map((species) => {
                const index = speciesList.findIndex((item) => item.id === species.id);
                return <button key={species.id} onClick={() => selectSpecies(index)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white/10">
                  <img src={species.thumbnailImage} alt="" onError={handleDesignImageError} className="h-9 w-9 rounded-full border border-[#FDB813]/60 object-cover" />
                  <span className="min-w-0"><span className="block text-sm font-bold uppercase">{species.name}</span><span className="block truncate text-[11px] text-white/55">{species.scientificName} · {species.sightings.length} records</span></span>
                </button>;
              })}
            </div>
          )}
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#ffd34f]">Wildlife Atlas · Earth</div>
          <div className="text-xs font-semibold text-white/70">{observations.length.toLocaleString()} observation pins</div>
        </div>
      </header>

      <div className="absolute bottom-5 left-3 z-20 flex items-center gap-2 md:bottom-7 md:left-6">
        <button onClick={() => setLayer(layer === 'satellite' ? 'terrain' : 'satellite')} className="flex items-center gap-2 rounded-full border border-white/20 bg-black/65 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/85 shadow-xl backdrop-blur hover:border-[#ffd34f]/70">
          {layer === 'satellite' ? <Satellite className="h-4 w-4 text-[#ffd34f]" /> : <Compass className="h-4 w-4 text-[#ffd34f]" />}
          {layer === 'satellite' ? 'Satellite' : 'Terrain'}
        </button>
        <span className="hidden rounded-full border border-white/10 bg-black/50 px-3 py-2 text-[10px] text-white/65 backdrop-blur sm:inline">Scroll to zoom · Drag to explore</span>
      </div>
      <div className="absolute bottom-5 right-3 z-20 flex gap-2 md:bottom-7 md:right-6">
        <button onClick={() => mapRef.current?.zoomIn({ duration: 450 })} title="Zoom in" className="rounded-full border border-white/20 bg-black/65 p-2.5 text-white/85 backdrop-blur hover:text-white"><ZoomIn className="h-4 w-4" /></button>
        <button onClick={() => mapRef.current?.zoomOut({ duration: 450 })} title="Zoom out" className="rounded-full border border-white/20 bg-black/65 p-2.5 text-white/85 backdrop-blur hover:text-white"><ZoomOut className="h-4 w-4" /></button>
      </div>
      {isLoading && <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 rounded-full border border-white/15 bg-black/70 px-5 py-3 text-xs text-white/80 shadow-xl backdrop-blur"><span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-[#ffd34f] align-[-2px]" />Loading wildlife observations…</div>}
      {!isLoading && loadError && <p role="status" className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 rounded-full border border-white/15 bg-black/75 px-5 py-3 text-xs text-white/85 shadow-xl backdrop-blur">{loadError}</p>}
      {!isLoading && !loadError && observations.length === 0 && (!activeSpecies || activeSpecies.sightings.length > 0) && <p role="status" className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 rounded-full bg-black/65 px-5 py-3 text-xs text-white/80 shadow-xl backdrop-blur">No recorded locations to display yet.</p>}
      {!isLoading && !loadError && activeSpecies && activeSpecies.sightings.length === 0 && <p role="status" className="absolute left-1/2 top-24 z-20 -translate-x-1/2 rounded-full bg-black/65 px-4 py-2 text-xs text-white/80 shadow-xl backdrop-blur">No recorded locations for {activeSpecies.name} yet.</p>}
    </main>
  );
};
