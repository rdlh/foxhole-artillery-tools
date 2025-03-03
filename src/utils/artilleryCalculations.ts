import type { Weapon } from '@/types/weapon';

/**
 * Calculate artillery firing solution from spotter data
 * 
 * @param spotterToTargetDistance - Distance from spotter to target
 * @param spotterToTargetAzimuth - Azimuth from spotter to target (in degrees)
 * @param spotterToArtilleryDistance - Distance from spotter to artillery
 * @param spotterToArtilleryAzimuth - Azimuth from spotter to artillery (in degrees)
 * @returns Object containing distance and azimuth from artillery to target before and after wind correction
 */
export function calculateFiringSolution(
  spotterToTargetDistance: number,
  spotterToTargetAzimuth: number,
  spotterToArtilleryDistance: number,
  spotterToArtilleryAzimuth: number,
  correctionFromSpotterLeft: number,
  correctionFromSpotterRight: number,
  correctionFromSpotterUp: number,
  correctionFromSpotterDown: number,
  windStrength: number,
  windDirection: number,
  weapon: Weapon | null
): { 
  originalDistance: number; 
  originalAzimuth: number;
  distance: number; 
  azimuth: number; 
  accuracy: number 
} {
  // Convert azimuths to radians
  const targetAzimuthRad = degToRad(spotterToTargetAzimuth);
  const artilleryAzimuthRad = degToRad(spotterToArtilleryAzimuth);

  // Convert from polar to cartesian coordinates (relative to spotter)
  // Target coordinates
  const targetX = spotterToTargetDistance * Math.sin(targetAzimuthRad);
  const targetY = spotterToTargetDistance * Math.cos(targetAzimuthRad);

  // Artillery coordinates
  const artilleryX = spotterToArtilleryDistance * Math.sin(artilleryAzimuthRad);
  const artilleryY = spotterToArtilleryDistance * Math.cos(artilleryAzimuthRad);

  // Calculate corrections based on spotter's perspective
  // For left/right: perpendicular to spotter-target vector
  // For up/down: along the spotter-target vector
  const perpAzimuthRad = targetAzimuthRad - Math.PI/2; // 90 degrees counterclockwise from target direction
  
  // Calculate correction vectors
  const netLeftRightCorrection = correctionFromSpotterLeft - correctionFromSpotterRight;
  const netUpDownCorrection = correctionFromSpotterUp - correctionFromSpotterDown;
  
  // Apply left/right corrections (perpendicular to spotter-target vector)
  const leftRightCorrectionX = netLeftRightCorrection * Math.sin(perpAzimuthRad);
  const leftRightCorrectionY = netLeftRightCorrection * Math.cos(perpAzimuthRad);
  
  // Apply up/down corrections (along spotter-target vector)
  const upDownCorrectionX = netUpDownCorrection * Math.sin(targetAzimuthRad);
  const upDownCorrectionY = netUpDownCorrection * Math.cos(targetAzimuthRad);
  
  // Apply spotter corrections only (without wind)
  const correctedTargetX = targetX + leftRightCorrectionX + upDownCorrectionX;
  const correctedTargetY = targetY + leftRightCorrectionY + upDownCorrectionY;

  // Calculate vector from artillery to corrected target (before wind)
  const originalVectorX = correctedTargetX - artilleryX;
  const originalVectorY = correctedTargetY - artilleryY;

  // Calculate distance and azimuth before wind correction
  const originalDistance = Math.sqrt(originalVectorX * originalVectorX + originalVectorY * originalVectorY);
  let originalAzimuth = radToDeg(Math.atan2(originalVectorX, originalVectorY));
  // Ensure azimuth is between 0-360 degrees
  originalAzimuth = (originalAzimuth + 360) % 360;

  return calculateWindAndAccuracy(
    correctedTargetX, 
    correctedTargetY, 
    artilleryX, 
    artilleryY, 
    originalDistance, 
    originalAzimuth, 
    windStrength, 
    windDirection, 
    weapon
  );
}

/**
 * Calculate artillery firing solution from direct positions
 * 
 * @param artilleryX - X coordinate of artillery position (in pixels)
 * @param artilleryY - Y coordinate of artillery position (in pixels)
 * @param targetX - X coordinate of target position (in pixels)
 * @param targetY - Y coordinate of target position (in pixels)
 * @param windStrength - Wind strength value
 * @param windDirection - Wind direction in degrees
 * @param weapon - Weapon data for accuracy calculation
 * @returns Object containing distance and azimuth from artillery to target before and after wind correction
 */
export function calculateFiringSolutionFromPositions(
  artilleryX: number,
  artilleryY: number,
  targetX: number,
  targetY: number,
  windStrength: number,
  windDirection: number,
  weapon: Weapon | null
): { 
  originalDistance: number; 
  originalAzimuth: number;
  distance: number; 
  azimuth: number; 
  accuracy: number 
} {
  // Define meters per pixel conversion constant (matching the one in MapMode.vue)
  const METERS_PER_PIXEL = 2.14;
  
  // Convert pixel coordinates to meters
  const artilleryXMeters = artilleryX * METERS_PER_PIXEL;
  const artilleryYMeters = artilleryY * METERS_PER_PIXEL;
  const targetXMeters = targetX * METERS_PER_PIXEL;
  const targetYMeters = targetY * METERS_PER_PIXEL;

  // Calculate vector from artillery to target (before wind)
  const originalVectorX = targetXMeters - artilleryXMeters;
  const originalVectorY = targetYMeters - artilleryYMeters;

  // Calculate distance and azimuth before wind correction
  const originalDistance = Math.sqrt(originalVectorX * originalVectorX + originalVectorY * originalVectorY);
  let originalAzimuth = radToDeg(Math.atan2(originalVectorX, originalVectorY));
  // Ensure azimuth is between 0-360 degrees
  originalAzimuth = (originalAzimuth + 360) % 360;

  return calculateWindAndAccuracy(
    targetXMeters, 
    targetYMeters, 
    artilleryXMeters, 
    artilleryYMeters, 
    originalDistance, 
    originalAzimuth, 
    windStrength, 
    windDirection, 
    weapon
  );
}

/**
 * Helper function for wind and accuracy calculations
 */
function calculateWindAndAccuracy(
  targetX: number,
  targetY: number,
  artilleryX: number,
  artilleryY: number,
  originalDistance: number,
  originalAzimuth: number,
  windStrength: number,
  windDirection: number,
  weapon: Weapon | null
): {
  originalDistance: number;
  originalAzimuth: number;
  distance: number;
  azimuth: number;
  accuracy: number;
} {
  // Apply wind correction
  let finalTargetX = targetX;
  let finalTargetY = targetY;
  
  if (weapon && typeof weapon.windModifier === 'number') {
    const windCorrectionX = (windStrength * weapon.windModifier) * Math.sin(degToRad(windDirection));
    const windCorrectionY = (windStrength * weapon.windModifier) * Math.cos(degToRad(windDirection));
  
    finalTargetX = finalTargetX - windCorrectionX;
    finalTargetY = finalTargetY - windCorrectionY;
  }

  // Calculate vector from artillery to target with all corrections
  const vectorX = finalTargetX - artilleryX;
  const vectorY = finalTargetY - artilleryY;

  // Calculate distance from artillery to target (Pythagorean theorem)
  const distance = Math.sqrt(vectorX * vectorX + vectorY * vectorY);

  // Calculate accuracy (scale from min to max in the same ratio as distance between min and max range)
  const accuracyRatio = (weapon?.accuracy.max! - weapon?.accuracy.min!) / (weapon?.max! - weapon?.min!);
  const accuracy = weapon?.accuracy.min! + (accuracyRatio * (distance - weapon?.min!));

  // Calculate azimuth from artillery to target
  let azimuth = radToDeg(Math.atan2(vectorX, vectorY));
  // Ensure azimuth is between 0-360 degrees
  azimuth = (azimuth + 360) % 360;

  // Return rounded values (to whole numbers)
  return { 
    originalDistance: Math.round(originalDistance),
    originalAzimuth: Math.round(originalAzimuth),
    distance: Math.round(distance), 
    azimuth: Math.round(azimuth),
    accuracy: Math.round(accuracy)
  };
}

// Helper functions
function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

function roundToDecimal(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
} 