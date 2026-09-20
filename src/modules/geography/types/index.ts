export interface Province {
  id: number;
  name: string;
  normalizedName: string;
  isActive: boolean;
}

export interface Municipality {
  id: number;
  provinceId: number;
  name: string;
  normalizedName: string;
  postalCode: string | null;
  isActive: boolean;
}
