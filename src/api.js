import { demoMarkets, demoStores, gyungbukBBox } from "./mockData.js";

const VWORLD_URL = "https://api.vworld.kr/req/data";

function normalizeMarketProps(feature) {
  const p = feature.properties || {};
  return {
    ...p,
    nm: p.nm || p.bz_nm || p.biz_nm || p.mainbiz_nm || p.DGMAINBIZ_NM || p.name || "상권명 없음",
    sigg: p.sigg || p.sig_kor_nm || p.SIG_KOR_NM || p.sgg_nm || ""
  };
}

export async function fetchMarkets({ sigg }) {
  const key = import.meta.env.VITE_VWORLD_KEY;
  const domain = import.meta.env.VITE_VWORLD_DOMAIN || location.origin;

  if (!key || key.includes("여기에")) {
    return { data: filterDemoMarkets(sigg), source: "데모 상권 데이터" };
  }

  const box = gyungbukBBox[sigg] || gyungbukBBox["전체"];
  const params = new URLSearchParams({
    service: "data",
    version: "2.0",
    request: "GetFeature",
    key,
    format: "json",
    size: "1000",
    page: "1",
    data: "LT_C_DGMAINBIZ",
    geometry: "true",
    attribute: "true",
    crs: "EPSG:4326",
    domain
  });

  params.set("geomFilter", `BOX(${box.join(",")})`);

  try {
    const res = await fetch(`${VWORLD_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(`VWorld HTTP ${res.status}`);
    const json = await res.json();
    const fc = json?.response?.result?.featureCollection;
    if (!fc?.features?.length) throw new Error(json?.response?.status || "VWorld 결과 없음");

    fc.features = fc.features.map(f => ({
      ...f,
      properties: normalizeMarketProps(f)
    }));

    const filtered = sigg === "전체" ? fc : {
      ...fc,
      features: fc.features.filter(f => JSON.stringify(f.properties).includes(sigg) || !f.properties?.sigg)
    };

    if (!filtered.features.length) return { data: fc, source: "VWorld 주요상권 API" };
    return { data: filtered, source: "VWorld 주요상권 API" };
  } catch (e) {
    console.warn("VWorld API 실패, 데모 데이터 사용:", e);
    return { data: filterDemoMarkets(sigg), source: "데모 상권 데이터(API 실패)" };
  }
}

function filterDemoMarkets(sigg) {
  if (!sigg || sigg === "전체") return demoMarkets;
  return {
    type: "FeatureCollection",
    features: demoMarkets.features.filter(f => f.properties?.sigg === sigg)
  };
}

function normalizeStore(item) {
  const lon = Number(item.lon || item.longitude || item.x || item.X || item.경도);
  const lat = Number(item.lat || item.latitude || item.y || item.Y || item.위도);
  return {
    name: item.bizesNm || item.상호명 || item.name || item.storeName || "상호 미상",
    category: item.indsLclsNm || item.상권업종대분류명 || item.category || "기타",
    midCategory: item.indsMclsNm || item.상권업종중분류명 || "",
    smallCategory: item.indsSclsNm || item.상권업종소분류명 || "",
    lon,
    lat,
    address: item.rdnmAdr || item.lnoAdr || item.도로명주소 || item.지번주소 || item.address || ""
  };
}

export async function fetchStores({ sigg, category }) {
  const key = import.meta.env.VITE_DATA_GO_KR_KEY;
  // 소상공인365(bigdata.sbiz.or.kr) 및 공공데이터포털 기준 최신 API 주소 (지정된 URL이 없으면 기본값 사용)
  const baseUrl = import.meta.env.VITE_STORE_API_URL || "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInDong";

  if (!key || key.includes("여기에")) {
    return { data: filterStores(demoStores, sigg, category), source: "데모 상가 데이터" };
  }

  const params = new URLSearchParams({
    serviceKey: key,
    pageNo: "1",
    numOfRows: "1000",
    type: "json"
  });

  // 공공데이터포털 상품별 파라미터명이 조금씩 달라질 수 있어 대표 명칭 중심으로 구성
  if (sigg && sigg !== "전체") {
    params.set("signguNm", sigg);
  }
  if (category && category !== "전체") {
    params.set("indsLclsNm", category);
  }

  try {
    const res = await fetch(`${baseUrl}?${params.toString()}`);
    if (!res.ok) throw new Error(`상가정보 HTTP ${res.status}`);
    const json = await res.json();

    const raw =
      json?.body?.items ||
      json?.response?.body?.items ||
      json?.response?.body?.items?.item ||
      json?.items ||
      json?.item ||
      [];

    const arr = Array.isArray(raw) ? raw : raw.item || [];
    const stores = arr.map(normalizeStore)
      .filter(s => Number.isFinite(s.lon) && Number.isFinite(s.lat));

    if (!stores.length) throw new Error("상가정보 결과 없음 또는 필드명 불일치");
    return { data: filterStores(stores, sigg, category), source: "소진공 상가업소정보 API" };
  } catch (e) {
    console.warn("상가정보 API 실패, 데모 데이터 사용:", e);
    return { data: filterStores(demoStores, sigg, category), source: "데모 상가 데이터(API 실패)" };
  }
}

export function filterStores(stores, sigg, category) {
  return stores.filter(s => {
    const siggOk = !sigg || sigg === "전체" || (s.address || "").includes(sigg);
    const catOk = !category || category === "전체" ||
      (s.category || "").includes(category) ||
      (s.midCategory || "").includes(category) ||
      (s.smallCategory || "").includes(category);
    return siggOk && catOk;
  });
}
