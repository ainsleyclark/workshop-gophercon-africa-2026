import { Species, DocumentarySchedule, Observation } from '../types.ts';
import snowLeopardHero from '../assets/images/cutouts/snow_leopard_cutout.png';
import snowLeopardThumbnail from '../assets/images/snow_leopard_profile_left_1792083454278.jpg';
import bengalTigerHero from '../assets/images/cutouts/bengal_tiger_cutout.png';
import bengalTigerThumbnail from '../assets/images/bengal_tiger_left_hero_1792083452552.jpg';
import giantPandaHero from '../assets/images/cutouts/giant_panda_cutout.png';
import giantPandaThumbnail from '../assets/images/giant_panda_left_hero_1792083453586.jpg';
import asiaticLionHero from '../assets/images/cutouts/asiatic_lion_cutout.png';
import asiaticLionThumbnail from '../assets/images/asiatic_lion_left_hero_1792083454461.jpg';
import tigerTeaser from '../assets/images/cutouts/predator_tiger_teaser_cutout.png';

type WildlifeResponse = {
  species: Array<{
    id: string;
    gbifKey: number;
    kingdom: string;
    class: string;
    order: string;
    family: string;
    canonicalName: string;
    scientificName: string;
    vernacularName: string;
    rank: string;
  }>;
  observations: Array<{
    id: string;
    speciesId: string;
    happenedAt: string;
    latitude: number;
    longitude: number;
    locality?: string;
    country: string;
    imageUrl?: string;
  }>;
};

const designArtByName: Record<string, { hero: string; thumbnail: string }> = {
  'snow leopard': { hero: snowLeopardHero, thumbnail: snowLeopardThumbnail },
  'panthera uncia': { hero: snowLeopardHero, thumbnail: snowLeopardThumbnail },
  'bengal tiger': { hero: bengalTigerHero, thumbnail: bengalTigerThumbnail },
  tiger: { hero: bengalTigerHero, thumbnail: bengalTigerThumbnail },
  'panthera tigris': { hero: bengalTigerHero, thumbnail: bengalTigerThumbnail },
  'panthera tigris tigris': { hero: bengalTigerHero, thumbnail: bengalTigerThumbnail },
  'giant panda': { hero: giantPandaHero, thumbnail: giantPandaThumbnail },
  'ailuropoda melanoleuca': { hero: giantPandaHero, thumbnail: giantPandaThumbnail },
  'asiatic lion': { hero: asiaticLionHero, thumbnail: asiaticLionThumbnail },
  lion: { hero: asiaticLionHero, thumbnail: asiaticLionThumbnail },
  'panthera leo': { hero: asiaticLionHero, thumbnail: asiaticLionThumbnail },
  'panthera leo persica': { hero: asiaticLionHero, thumbnail: asiaticLionThumbnail },
};
const designSpeciesOrder = ['snow leopard', 'tiger', 'giant panda', 'lion'];
const designSpeciesFallbacks: WildlifeResponse['species'] = [
  { id: 'design-snow-leopard', gbifKey: 0, kingdom: 'Animalia', class: 'Mammalia', order: 'Carnivora', family: 'Felidae', canonicalName: 'Panthera uncia', scientificName: 'Panthera uncia', vernacularName: 'Snow Leopard', rank: 'SPECIES' },
  { id: 'design-giant-panda', gbifKey: 0, kingdom: 'Animalia', class: 'Mammalia', order: 'Carnivora', family: 'Ursidae', canonicalName: 'Ailuropoda melanoleuca', scientificName: 'Ailuropoda melanoleuca', vernacularName: 'Giant Panda', rank: 'SPECIES' },
];
const editorialHeadlines: Record<string, [string, string, string]> = {
  'snow leopard': ['TIMELESS GUARDIAN OF THE MOUNTAINS', 'HIGH ALTITUDE PREDATOR', 'SNOW LEOPARD'],
  'panthera uncia': ['TIMELESS GUARDIAN OF THE MOUNTAINS', 'HIGH ALTITUDE PREDATOR', 'SNOW LEOPARD'],
  'bengal tiger': ['TIMELESS GUARDIAN OF THE WILD', 'STRIPED FOREST PREDATOR', 'BENGAL TIGER'],
  tiger: ['TIMELESS GUARDIAN OF THE WILD', 'STRIPED FOREST PREDATOR', 'BENGAL TIGER'],
  'panthera tigris': ['TIMELESS GUARDIAN OF THE WILD', 'STRIPED FOREST PREDATOR', 'BENGAL TIGER'],
  'panthera tigris tigris': ['TIMELESS GUARDIAN OF THE WILD', 'STRIPED FOREST PREDATOR', 'BENGAL TIGER'],
  'giant panda': ['TIMELESS GUARDIAN OF THE MIST', 'ANCIENT BAMBOO GIANT', 'PANDA SANCTUARY'],
  'ailuropoda melanoleuca': ['TIMELESS GUARDIAN OF THE MIST', 'ANCIENT BAMBOO GIANT', 'PANDA SANCTUARY'],
  'asiatic lion': ['GOLDEN GUARDIAN OF THE SAVANNAH', 'SAVANNAH APEX PREDATOR', 'ASIATIC LION'],
  lion: ['GOLDEN GUARDIAN OF THE SAVANNAH', 'SAVANNAH APEX PREDATOR', 'AFRICAN LION'],
  'panthera leo': ['GOLDEN GUARDIAN OF THE SAVANNAH', 'SAVANNAH APEX PREDATOR', 'AFRICAN LION'],
  'panthera leo persica': ['GOLDEN GUARDIAN OF THE SAVANNAH', 'SAVANNAH APEX PREDATOR', 'ASIATIC LION'],
};

const displayName = (animal: WildlifeResponse['species'][number]) =>
  animal.vernacularName || animal.canonicalName || animal.scientificName || 'Unknown species';

export async function loadWildlife(): Promise<Species[]> {
  const response = await fetch('/api/wildlife', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Wildlife request failed (${response.status})`);
  const data = (await response.json()) as WildlifeResponse;
  const bySpecies = new Map<string, WildlifeResponse['observations']>();
  for (const observation of data.observations ?? []) {
    const records = bySpecies.get(observation.speciesId) ?? [];
    records.push(observation);
    bySpecies.set(observation.speciesId, records);
  }

  const sourceSpecies = [...(data.species ?? [])];
  for (const fallback of designSpeciesFallbacks) {
    const fallbackName = fallback.vernacularName.toLowerCase();
    const exists = sourceSpecies.some((animal) => {
      const name = displayName(animal).toLowerCase();
      const scientificName = animal.scientificName.toLowerCase().replace(/\s+\([^)]*\).*$/, '').trim();
      return name === fallbackName || scientificName === fallback.canonicalName.toLowerCase();
    });
    if (!exists) sourceSpecies.push(fallback);
  }

  const mappedSpecies = sourceSpecies.map((animal) => {
    const name = displayName(animal);
    const observations = (bySpecies.get(animal.id) ?? []).sort(
      (a, b) => Date.parse(b.happenedAt) - Date.parse(a.happenedAt),
    );
    const latest = observations[0];
    const coordinates: [number, number] = latest
      ? [latest.latitude, latest.longitude]
      : [0, 0];
    const region = latest
      ? [latest.locality, latest.country].filter(Boolean).join(', ')
      : 'No location recorded';
    const databaseImage = observations.find((observation) => observation.imageUrl)?.imageUrl;
    const scientificName = animal.scientificName.toLowerCase().replace(/\s+\([^)]*\).*$/, '').trim();
    const curatedArt = designArtByName[name.toLowerCase()] ?? designArtByName[scientificName];
    const headline = editorialHeadlines[name.toLowerCase()] ?? editorialHeadlines[scientificName];
    const heroImage = curatedArt?.hero || databaseImage || '/assets/showcase/wildlife-placeholder.svg';
    const thumbnailImage = curatedArt?.thumbnail || databaseImage || '/assets/showcase/wildlife-placeholder.svg';
    const telemetry: Observation[] = observations.map((observation) => ({
      id: observation.id,
      happenedAt: observation.happenedAt,
      coordinates: [observation.latitude, observation.longitude],
      locality: observation.locality ?? '',
      country: observation.country,
      mediaURL: observation.imageUrl,
    }));
    const words = name.toUpperCase().split(/\s+/);

    return {
      id: animal.id,
      name,
      adjective: 'FIELD OBSERVATION',
      line1: headline?.[0] ?? `${words.slice(0, 3).join(' ')} OF THE WILD`,
      line2: headline?.[1] ?? 'WILDLIFE FIELD OBSERVATION',
      line3: headline?.[2] ?? words.slice(-2).join(' '),
      scientificName: animal.scientificName || animal.canonicalName,
      status: animal.rank ? `${animal.rank} · ${animal.class || animal.kingdom}` : animal.class || animal.kingdom,
      statusBadge: animal.rank || 'SPECIES',
      population: `${observations.length} recorded observation${observations.length === 1 ? '' : 's'}`,
      habitat: [animal.order, animal.family].filter(Boolean).join(' · ') || 'Taxonomy recorded in GBIF',
      region,
      threats: [],
      latinDeck: `Scientific name: ${animal.scientificName || animal.canonicalName}. ${observations.length} observation${observations.length === 1 ? '' : 's'} in this collection.`,
      editorialFact: latest
        ? `Most recent recorded observation: ${new Date(latest.happenedAt).toLocaleDateString()}${region ? ` · ${region}` : ''}.`
        : 'This species is in the database; no observation is available yet.',
      heroImage,
      thumbnailImage,
      accentColor: '#FDB813',
      activeNavIndex: 0,
      coordinates,
      elevation: 'Not recorded',
      sanctuaryName: region,
      satelliteZoom: 11,
      territoryDescription: `${observations.length} recorded observation${observations.length === 1 ? '' : 's'} for this species. Map markers show recorded coordinates.`,
      sightings: telemetry,
    };
  });
  const orderFor = (animal: Species) => {
    const name = animal.name.toLowerCase();
    const scientificName = animal.scientificName.toLowerCase().replace(/\s+\([^)]*\).*$/, '').trim();
    return designSpeciesOrder.findIndex((key) =>
      name === key || scientificName === key ||
      (key === 'tiger' && (name === 'bengal tiger' || scientificName.startsWith('panthera tigris'))) ||
      (key === 'lion' && (name === 'asiatic lion' || scientificName.startsWith('panthera leo'))),
    );
  };
  return mappedSpecies
    .filter((animal) => orderFor(animal) !== -1)
    .sort((a, b) => orderFor(a) - orderFor(b));
}

export const UPCOMING_PROGRAM: DocumentarySchedule = {
  time: '—',
  title: 'FIELD NOTES',
  network: 'Wildlife Atlas',
  synopsis: 'Explore species and locations from the observations stored in this collection.',
  narrator: 'Wildlife observation archive',
  featuredPredators: [],
};

export const TEASER_TIGER_IMAGE = tigerTeaser;
