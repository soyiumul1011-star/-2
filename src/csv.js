import Papa from "papaparse";

function pick(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") return row[k];
  }
  return "";
}

export function parseStoreCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (result) => {
        const rows = result.data || [];
        const stores = rows.map(row => {
          const lon = Number(pick(row, ["lon", "경도", "longitude", "x", "X", "좌표정보(X)", "좌표정보x"]));
          const lat = Number(pick(row, ["lat", "위도", "latitude", "y", "Y", "좌표정보(Y)", "좌표정보y"]));
          return {
            name: pick(row, ["상호명", "bizesNm", "상가업소명", "name", "storeName"]) || "상호 미상",
            category: pick(row, ["상권업종대분류명", "indsLclsNm", "업종대분류명", "category"]) || "기타",
            midCategory: pick(row, ["상권업종중분류명", "indsMclsNm", "업종중분류명"]),
            smallCategory: pick(row, ["상권업종소분류명", "indsSclsNm", "업종소분류명"]),
            lon,
            lat,
            address: pick(row, ["도로명주소", "rdnmAdr", "지번주소", "lnoAdr", "address"])
          };
        }).filter(s => Number.isFinite(s.lon) && Number.isFinite(s.lat));
        resolve(stores);
      },
      error: reject
    });
  });
}
