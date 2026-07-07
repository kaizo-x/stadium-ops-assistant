export interface Zone {
  id: string;
  name: string;
  capacity: number;
  occupancy: number;
}

// 6 items, with exactly 40% occupancy overall
// Total capacity = 9000, Total occupancy = 3600
// (3600 / 9000) * 100 = 40% occupancy
export const mockZones: Zone[] = [
  { id: "zone-a", name: "North Stand (Zone A)", capacity: 1000, occupancy: 400 },
  { id: "zone-b", name: "South Stand (Zone B)", capacity: 1500, occupancy: 600 },
  { id: "zone-c", name: "East Stand (Zone C)", capacity: 2000, occupancy: 800 },
  { id: "zone-d", name: "West Stand (Zone D)", capacity: 1200, occupancy: 480 },
  { id: "zone-e", name: "VIP Suites (Zone E)", capacity: 800, occupancy: 320 },
  { id: "zone-f", name: "General Admission (Zone F)", capacity: 2500, occupancy: 1000 },
];

/**
 * Calculates the overall weighted average density of the stadium.
 * Density = (Total Occupancy / Total Capacity) * 100
 */
export function calculateAverageDensity(zones: Zone[]): number {
  if (zones.length === 0) return 0;
  const totalOccupancy = zones.reduce((sum, zone) => sum + zone.occupancy, 0);
  const totalCapacity = zones.reduce((sum, zone) => sum + zone.capacity, 0);
  if (totalCapacity === 0) return 0;
  return (totalOccupancy / totalCapacity) * 100;
}
