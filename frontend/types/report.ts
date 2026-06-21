export type ReportInput = {
  name: string;
  father_name?: string;
  dob: string;
  time: string;
  place: string;
  mobile?: string;
  language?: string;
  ayanamsa_mode?: string;
  custom_ayanamsa_degrees?: string;
  // Engine settings (true_moon, true_node) are hardcoded in backend
  planet_overrides?: Record<string, number>;
  override_moon_longitude?: string;
  override_ascendant_longitude?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
};

export type GeneratedReport = {
  pdf_url: string;
};

export interface CustomerState {
  name: string;
  father_name: string;
  dob: string;
  time: string;
  place: string;
  weekday: string;
  mobile: string;
}

export interface AstrologyState {
  rashi: string;
  lagna: string;
  lagna_sign_index?: number;
  nakshatra: string;
  nakshatra_pada: string;
  nakshatra_lord: string;
  pada: string;
  ayanamsa: string;
  gan: string;
  varna: string;
  shubh_bar: string;
  ashubh_bar?: string;
  shubh_rong: string;
  shubh_sonkha: string;
  namer_adokkhyor: string;
  current_pada_syllable: string;
  all_nakshatra_syllables: string[];
  dasha_balance: string;
  selected_doshas?: string[];
}

export interface ShorthandPlanet {
  short: string;
  full: string;
  display: string;
  compact?: string;
  compact_indexed?: string;
  is_retrograde?: boolean;
  is_combust?: boolean;
}

export interface EngineMetadata {
  engine: string;
  system: string;
  ayanamsa: string;
  custom_ayanamsa_degrees?: number;
  moon_mode: string;
  true_node?: boolean;
  override_moon?: string;
}

export interface KundliCell {
  empty: boolean;
  house?: number;
  sign?: string;
  planets?: string;
}

export interface HouseChartItem {
  house: number;
  house_bn: string;
  is_lagna_house?: boolean;
  planets: string[];
  planets_text: string;
}

export interface DashaRow {
  planet: string;
  planet_bn: string;
  years: string;
  start: string;
  end: string;
  is_active: boolean;
}

export interface AntardashaSubperiod {
  lord: string;
  lord_bn: string;
  start: string;
  end: string;
}

export interface AntardashaGroup {
  major_lord: string;
  major_bn: string;
  subperiods: AntardashaSubperiod[];
}

export interface AntardashaDisplayRow {
  major_lord: string;
  major_bn: string;
  lord: string;
  lord_bn: string;
  start: string;
  end: string;
}

export interface ReportState {
  report_id?: string;
  report_no: string;
  generated_at: string;
  customer: CustomerState;
  engine: EngineMetadata;
  summary: AstrologyState;
  shorthand_planets: ShorthandPlanet[];
  planet_overrides?: Record<string, number>;
  true_node?: boolean;
  kundli_grid: KundliCell[][];
  house_chart: HouseChartItem[];
  dasha_list: DashaRow[];
  antardasha_list: AntardashaGroup[];
  antardasha_display_rows?: AntardashaDisplayRow[];
  show_kundli?: boolean;
  show_mahadasha?: boolean;
  show_antardasha?: boolean;
  show_lucky_info?: boolean;
  show_future_antardashas?: boolean;
  planet_nudges?: Record<string, { dx: number; dy: number }>;
  planet_coords?: Record<string, { x: number; y: number }>;
  lang?: string;
  remedies_list?: any[];
}
