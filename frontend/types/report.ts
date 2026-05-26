export type ReportInput = {
  name: string;
  father_name?: string;
  dob: string;
  time: string;
  place: string;
  mobile?: string;
  ayanamsa_mode?: string;
  true_moon?: boolean;
  override_moon_longitude?: string;
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
  nakshatra: string;
  nakshatra_pada: string;
  nakshatra_lord: string;
  pada: string;
  ayanamsa: string;
  gan: string;
  varna: string;
  shubh_bar: string;
  shubh_rong: string;
  shubh_sonkha: string;
  namer_adokkhyor: string;
  current_pada_syllable: string;
  all_nakshatra_syllables: string[];
  dasha_balance: string;
}

export interface ShorthandPlanet {
  short: string;
  full: string;
  display: string;
  compact?: string;
}

export interface EngineMetadata {
  engine: string;
  system: string;
  ayanamsa: string;
  moon_mode: string;
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

export interface ReportState {
  report_no: string;
  generated_at: string;
  customer: CustomerState;
  engine: EngineMetadata;
  summary: AstrologyState;
  shorthand_planets: ShorthandPlanet[];
  kundli_grid: KundliCell[][];
  house_chart: HouseChartItem[];
  dasha_list: DashaRow[];
  antardasha_list: AntardashaGroup[];
  show_kundli?: boolean;
  show_mahadasha?: boolean;
  show_antardasha?: boolean;
  show_lucky_info?: boolean;
}
