import { Zone } from "./stadium-data";

export interface Incident {
  id: string;
  zoneId: string;
  description: string;
  severity: "low" | "medium" | "high";
  reportedAt: string;
}

/**
 * pure function that examines zone occupancies and returns operational recommendations.
 * e.g., returns strings like 'Divert to Gate B' if density > 80%.
 */
export function getRecommendations(zones: Zone[]): string[] {
  const recommendations: string[] = [];

  zones.forEach((zone) => {
    const density = zone.capacity > 0 ? (zone.occupancy / zone.capacity) * 100 : 0;
    if (density > 80) {
      // Direct mappings to alternative gates/zones for redirection
      switch (zone.id) {
        case "zone-a":
          recommendations.push("Divert to Gate B");
          break;
        case "zone-b":
          recommendations.push("Divert to Gate C");
          break;
        case "zone-c":
          recommendations.push("Divert to Gate D");
          break;
        case "zone-d":
          recommendations.push("Divert to Gate E");
          break;
        case "zone-e":
          recommendations.push("Divert to Gate F");
          break;
        case "zone-f":
          recommendations.push("Divert to Gate A");
          break;
        default:
          recommendations.push(`Divert spectators away from ${zone.name}`);
      }
    }
  });

  return recommendations;
}

/**
 * Filters and returns high-severity incidents from an array of incidents.
 * This is a deterministic security utility function.
 */
export function getHighSeverityIncidents(incidents: Incident[]): Incident[] {
  return incidents.filter((incident) => incident.severity === "high");
}
