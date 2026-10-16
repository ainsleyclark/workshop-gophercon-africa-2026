export interface Species {
  id: string;
  name: string;
  adjective: string;
  line1: string;
  line2: string;
  line3: string;
  scientificName: string;
  status: string;
  statusBadge: string;
  population: string;
  habitat: string;
  region: string;
  threats: string[];
  latinDeck: string;
  editorialFact: string;
  heroImage: string;
  thumbnailImage: string;
  accentColor: string;
  activeNavIndex: number;
  // 3D Aerial Map Telemetry
  coordinates: [number, number];
  elevation: string;
  sanctuaryName: string;
  satelliteZoom: number;
  territoryDescription: string;
  sightings: Observation[];
}

export interface Observation {
  id: string;
  happenedAt: string;
  coordinates: [number, number];
  locality: string;
  country: string;
  mediaURL?: string;
}

export interface DocumentarySchedule {
  time: string;
  title: string;
  network: string;
  synopsis: string;
  narrator: string;
  featuredPredators: string[];
}
