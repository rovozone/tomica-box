export interface Series {
  id: string;
  name: string;
  box_length: number;
  box_width: number;
  box_height: number;
  notes: string | null;
  created_at: string;
}

export interface Car {
  id: string;
  series_id: string;
  number: string | null;
  name: string;
  wheelbase: number;
  notes: string | null;
  created_at: string;
  series?: Series;
}

export interface CreateSeriesInput {
  name: string;
  box_length: number;
  box_width: number;
  box_height: number;
  notes?: string;
}

export interface CreateCarInput {
  series_id: string;
  number?: string;
  name: string;
  wheelbase: number;
  notes?: string;
}
