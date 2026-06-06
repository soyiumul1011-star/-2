import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import { fetchMarkets, fetchStores, filterStores } from "./api.js";
import { analyzeMarkets, recommendBlueOcean, summarize } from "./analysis.js";
import { parseStoreCsv } from "./csv.js";

const siggs = ["전체", "안동시", "경주시", "구미시", "포항시", "김천시", "영주시", "영천시", "상주시", "문경시", "경산시", "군위군", "의성군", "청송군", "영양군", "영덕군", "청도군", "고령군", "성주군", "칠곡군", "예천군", "봉화군", "울진군", "울릉군"];
const categories = ["전체", "한식", "카페", "미용", "소매", "숙박", "생활서비스", "음식", "도소매", "서비스"];

let uploadedStores = null;
let lastResults = [];

document.querySelector("#app").innerHTML = `
  <header>
    <div>
      <p class="eyebrow">공공데이터 융합 창업입지 분석</p>
      <h1>경북 공간이음</h1>
      <p>소진공 상가 좌표와 VWorld 주요상권 구역을 결합해 상권 과밀도와 정책지원 우선순위를 산출합니다.</p>
    </div>
    <div class="header-actions">
      <button id="runBtn">분석 실행</button>
      <button id="exportBtn" class="secondary">CSV 내보내기</button>
    </div>
  </header>
  <main>
    <aside>
      <label>시·군</label>
      <select id="sigg">${siggs.map(x => `<option>${x}</option>`).join("")}</select>

      <label>업종</label>
      <select id="category">${categories.map(x => `<option>${x}</option>`).join("")}</select>

      <label>소진공 CSV 업로드</label>
      <input id="csvFile" type="file" accept=".csv" />
      <small class="hint">API가 막혀도 CSV를 올리면 동일하게 분석됩니다.</small>

      <div class="legend">
        <b>위험도 기준</b>
        <span><i class="safe"></i> 안정: 정책지원 후보</span>
        <span><i class="warn"></i> 주의: 모니터링 필요</span>
        <span><i class="danger"></i> 위험: 과밀 진입 경고</span>
      </div>

      <div class="notice" id="sourceBox">데이터 출처 확인 중</div>
    </aside>

    <section>
      <div class="summary" id="summary"></div>
      <div id="map"></div>
      <div class="cards">
        <div class="card">
          <h2>상권 과밀 진단</h2>
          <div id="riskList"></div>
        </div>
        <div class="card">
          <h2>블루오션·정책지원 후보</h2>
          <div id="blueList"></div>
        </div>
      </div>
    </section>
  </main>
`;

const map = L.map("map").setView([36.4, 128.8], 8);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap"
}).addTo(map);

let layerGroup = L.layerGroup().addTo(map);

function colorByLevel(level) {
  return level === "위험" ? "#e03131" : level === "주의" ? "#f08c00" : "#2f9e44";
}

function renderSummary(summary) {
  document.querySelector("#summary").innerHTML = `
    <div><b>${summary.totalMarkets}</b><span>분석 상권</span></div>
    <div><b>${summary.totalStores}</b><span>분석 점포</span></div>
    <div><b>${summary.danger}</b><span>위험</span></div>
    <div><b>${summary.warn}</b><span>주의</span></div>
    <div><b>${summary.safe}</b><span>안정</span></div>
  `;
}

function renderLists(results, blue) {
  document.querySelector("#riskList").innerHTML = results.map(r => `
    <div class="row">
      <strong>${r.name}</strong>
      <span class="badge ${r.level}">${r.level}</span>
      <small>점포 ${r.count}개 · ${r.areaKm2.toFixed(2)}㎢ · ${r.density.toFixed(1)}개/㎢ · 위험점수 ${r.riskScore}</small>
    </div>
  `).join("") || "분석 결과가 없습니다.";

  document.querySelector("#blueList").innerHTML = blue.map((r, i) => `
    <div class="row">
      <strong>${i + 1}. ${r.name}</strong>
      <span class="badge 안정">정책점수 ${r.policyScore}</span>
      <small>저밀도 후보 · 경쟁밀도 ${r.density.toFixed(1)}개/㎢ · 점포 ${r.count}개</small>
    </div>
  `).join("") || "후보지가 없습니다.";
}

async function run() {
  const sigg = document.querySelector("#sigg").value;
  const category = document.querySelector("#category").value;

  document.querySelector("#riskList").innerHTML = "분석 중...";
  document.querySelector("#blueList").innerHTML = "분석 중...";
  document.querySelector("#sourceBox").textContent = "공공 API 또는 CSV 데이터 확인 중...";
  layerGroup.clearLayers();

  const marketResult = await fetchMarkets({ sigg });
  let storeResult;

  if (uploadedStores) {
    storeResult = {
      data: filterStores(uploadedStores, sigg, category),
      source: "업로드 CSV"
    };
  } else {
    storeResult = await fetchStores({ sigg, category });
  }

  const results = analyzeMarkets(marketResult.data, storeResult.data);
  const blue = recommendBlueOcean(results);
  lastResults = results;

  results.forEach(r => {
    L.geoJSON(r.feature, {
      style: {
        color: colorByLevel(r.level),
        weight: 2,
        fillOpacity: 0.27
      }
    }).bindPopup(`
      <b>${r.name}</b><br>
      위험도: ${r.level}<br>
      위험점수: ${r.riskScore}<br>
      점포: ${r.count}개<br>
      밀도: ${r.density.toFixed(1)}개/㎢
    `).addTo(layerGroup);
  });

  storeResult.data.forEach(s => {
    L.circleMarker([s.lat, s.lon], {
      radius: 5,
      weight: 1,
      fillOpacity: 0.8
    }).bindPopup(`<b>${s.name}</b><br>${s.category}<br>${s.address}`)
      .addTo(layerGroup);
  });

  const bounds = layerGroup.getBounds?.();
  if (bounds && bounds.isValid()) map.fitBounds(bounds.pad(0.2));

  renderSummary(summarize(results, storeResult.data));
  renderLists(results, blue);

  document.querySelector("#sourceBox").innerHTML = `
    <b>상권:</b> ${marketResult.source}<br>
    <b>점포:</b> ${storeResult.source}<br>
    <b>상태:</b> 정상 분석 완료
  `;
}

document.querySelector("#runBtn").addEventListener("click", run);

document.querySelector("#csvFile").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  document.querySelector("#sourceBox").textContent = "CSV 읽는 중...";
  uploadedStores = await parseStoreCsv(file);
  document.querySelector("#sourceBox").innerHTML = `<b>CSV 업로드 완료:</b> ${uploadedStores.length}개 점포 인식`;
  run();
});

document.querySelector("#exportBtn").addEventListener("click", () => {
  if (!lastResults.length) return alert("먼저 분석을 실행하세요.");
  const rows = [
    ["상권명", "시군", "점포수", "면적㎢", "밀도", "위험등급", "위험점수", "정책지원점수"],
    ...lastResults.map(r => [r.name, r.sigg, r.count, r.areaKm2.toFixed(3), r.density.toFixed(1), r.level, r.riskScore, r.policyScore])
  ];
  const csv = rows.map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "gyeongbuk-space-link-analysis.csv";
  a.click();
  URL.revokeObjectURL(a.href);
});

run();
