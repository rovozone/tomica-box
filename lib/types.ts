export interface Brand {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
}

export interface Series {
  id: string;
  name: string;
  box_length: number;
  box_width: number;
  box_height: number;
  notes: string | null;
  brand_id: string | null;
  created_at: string;
  brand?: Brand;
}

export interface Car {
  id: string;
  series_id: string | null;
  number: string | null;
  name: string | null;
  wheelbase: number | null;
  notes: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  tags: string[] | null;
  production_year: number | null;
  created_at: string;
  series?: Series;
}

export interface CreateBrandInput {
  name: string;
  notes?: string;
}

export interface CreateSeriesInput {
  name: string;
  box_length: number;
  box_width: number;
  box_height: number;
  notes?: string;
  brand_id?: string;
}

export interface CreateCarInput {
  series_id: string;
  number?: string;
  name: string;
  wheelbase: number;
  notes?: string;
}
