export type LightStructureKind = 'pergola' | 'canopy' | 'light_roof' | 'other';
export type Material = 'steel' | 'aluminum' | 'timber';
export type RoofingType =
  | 'open_slats'
  | 'polycarbonate'
  | 'metal_panel'
  | 'glass'
  | 'fabric'
  | 'other'
  | 'unknown';
export type ExposureCategory = 'sheltered' | 'urban' | 'open' | 'coast' | 'unknown';
export type Topography = 'flat' | 'slope' | 'ridge' | 'rooftop' | 'unknown';
export type StaticScheme = 'simple' | 'cantilever' | 'continuous' | 'unknown';
export type SupportConnection = 'pinned' | 'fixed' | 'sliding' | 'unknown';
export type AnchorBase =
  | 'structural_concrete'
  | 'existing_wall'
  | 'steel_plate'
  | 'pavers_over_waterproofing'
  | 'unknown';
export type DistanceFromSea =
  | 'over_2km'
  | '500m_2km'
  | 'under_500m'
  | 'unknown';
export type SidesCondition = 'all_open' | 'partial' | 'enclosed' | 'unknown';
export type YesNoUnknown = 'yes' | 'no' | 'unknown';

export interface LightStructureInput {
  kind: LightStructureKind;
  location: string | null; // city name or coords
  installationHeightM: number | null;
  floorLevel: number | null;
  distanceFromSea: DistanceFromSea;
  exposureCategory: ExposureCategory;
  topography: Topography;

  material: Material | 'unknown';
  roofingType: RoofingType;
  roofSlopeDeg: number | null;
  sidesCondition: SidesCondition;

  mainSpanM: number | null;
  /** Rafter span = pergola depth (distance secondary beams span between main beams) */
  secondarySpanM: number | null;
  secondarySpacingM: number | null;
  tributaryWidthM: number | null;
  staticScheme: StaticScheme;
  supportConnectionType: SupportConnection;
  anchorBaseType: AnchorBase;
  anchorCheckAvailable: YesNoUnknown;
}

export function emptyLightStructureInput(): LightStructureInput {
  return {
    kind: 'pergola',
    location: null,
    installationHeightM: null,
    floorLevel: null,
    distanceFromSea: 'unknown',
    exposureCategory: 'unknown',
    topography: 'unknown',
    material: 'unknown',
    roofingType: 'unknown',
    roofSlopeDeg: null,
    sidesCondition: 'unknown',
    mainSpanM: null,
    secondarySpanM: null,
    secondarySpacingM: null,
    tributaryWidthM: null,
    staticScheme: 'unknown',
    supportConnectionType: 'unknown',
    anchorBaseType: 'unknown',
    anchorCheckAvailable: 'unknown',
  };
}
