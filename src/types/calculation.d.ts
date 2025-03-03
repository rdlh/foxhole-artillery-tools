export interface Calculation {
  id: number;
  spotterToTarget: { distance: number; azimuth: number };
  spotterToArtillery: { distance: number; azimuth: number };
  artilleryToTarget: { distance: number; azimuth: number };
  timestamp: Date;
}