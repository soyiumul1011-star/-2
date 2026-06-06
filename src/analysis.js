import area from "@turf/area";
import centroid from "@turf/centroid";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";

export function analyzeMarkets(markets, stores) {
  return (markets.features || []).map(feature => {
    const polygonAreaKm2 = Math.max(area(feature) / 1_000_000, 0.0001);
    const included = stores.filter(s => booleanPointInPolygon(point([s.lon, s.lat]), feature));
    const density = included.length / polygonAreaKm2;

    const riskScore = Math.min(100, Math.round(density * 1.8 + included.length * 2.5));
    const level = riskScore >= 70 ? "위험" : riskScore >= 40 ? "주의" : "안정";

    const center = centroid(feature).geometry.coordinates;

    return {
      feature,
      name: feature.properties?.nm || feature.properties?.name || "상권명 없음",
      sigg: feature.properties?.sigg || "",
      count: included.length,
      areaKm2: polygonAreaKm2,
      density,
      riskScore,
      policyScore: Math.max(0, 100 - riskScore),
      level,
      center,
      stores: included
    };
  }).sort((a, b) => b.riskScore - a.riskScore);
}

export function recommendBlueOcean(results) {
  return [...results]
    .filter(r => r.level === "안정" || r.level === "주의")
    .sort((a, b) => b.policyScore - a.policyScore)
    .slice(0, 7);
}

export function summarize(results, stores) {
  const totalMarkets = results.length;
  const totalStores = stores.length;
  const danger = results.filter(r => r.level === "위험").length;
  const warn = results.filter(r => r.level === "주의").length;
  const safe = results.filter(r => r.level === "안정").length;
  return { totalMarkets, totalStores, danger, warn, safe };
}
