export interface Weapon {
  faction: string;
  name: string;
  min: number;
  max: number;
  accuracy: {
    min: number;
    max: number;
  };
  windModifier?: number;
}