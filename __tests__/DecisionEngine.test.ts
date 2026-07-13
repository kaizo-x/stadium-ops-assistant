import { describe, it, expect } from "vitest";
import { calculateAverageDensity, Zone } from "../lib/stadium-data";
import { getRecommendations } from "../lib/decision-engine";

describe("Decision Engine & Stadium Data Logic", () => {
  describe("calculateAverageDensity", () => {
    it("should calculate correct average density for standard zones", () => {
      const zones: Zone[] = [
        { id: "zone-a", name: "Zone A", capacity: 1000, occupancy: 400 }, // 40%
        { id: "zone-b", name: "Zone B", capacity: 2000, occupancy: 600 }, // 30%
      ];
      // Total occupancy = 1000, Total capacity = 3000 -> 33.333%
      expect(calculateAverageDensity(zones)).toBeCloseTo(33.333, 3);
    });

    it("should return 0 if there are no zones", () => {
      expect(calculateAverageDensity([])).toBe(0);
    });

    it("should return 0 if total capacity is 0", () => {
      const zones: Zone[] = [
        { id: "zone-a", name: "Zone A", capacity: 0, occupancy: 100 },
      ];
      expect(calculateAverageDensity(zones)).toBe(0);
    });
  });

  describe("getRecommendations", () => {
    it("should recommend diverting spectators to Gate B if Zone A exceeds 80% occupancy", () => {
      const zones: Zone[] = [
        { id: "zone-a", name: "North Stand (Zone A)", capacity: 1000, occupancy: 850 }, // 85%
        { id: "zone-b", name: "South Stand (Zone B)", capacity: 1000, occupancy: 500 }, // 50%
      ];
      const recommendations = getRecommendations(zones);
      expect(recommendations).toContain("Divert to Gate B");
    });

    it("should not recommend diversion if occupancy is 80% or below", () => {
      const zones: Zone[] = [
        { id: "zone-a", name: "North Stand (Zone A)", capacity: 1000, occupancy: 800 }, // 80%
      ];
      const recommendations = getRecommendations(zones);
      expect(recommendations).not.toContain("Divert to Gate B");
    });
  });
});
