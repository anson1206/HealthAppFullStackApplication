// HealthDataProcessor.js
// Utility functions to process health data for the Dashboard UI.

// Normalize unit strings
const normalizeUnit = (u) => {
  if (!u) return null;
  const s = ('' + u).toLowerCase();
  if (s.includes('mi') || s.includes('mile')) return 'mi';
  if (s.includes('km') || s.includes('kilomet')) return 'km';
  if (s === 'm' || s.includes('meter') || s.includes('metre')) return 'm';
  return null;
};

const KM_PER_MILE = 1.60934;
const M_PER_KM = 1000;
const M_PER_MILE = KM_PER_MILE * M_PER_KM;

const toPreferred = (val, fromUnit, preferred) => {
  const v = Number(val) || 0;
  const f = normalizeUnit(fromUnit);
  if (!preferred) return v;
  if (preferred === 'mi') {
    if (f === 'mi') return v;
    if (f === 'km') return v / KM_PER_MILE;
    if (f === 'm') return v / M_PER_MILE;
    return v > 1000 ? (v / M_PER_MILE) : v;
  }
  if (preferred === 'km') {
    if (f === 'km') return v;
    if (f === 'mi') return v * KM_PER_MILE;
    if (f === 'm') return v / M_PER_KM;
    return v > 1000 ? (v / M_PER_KM) : v;
  }
  if (preferred === 'm') {
    if (f === 'm') return v;
    if (f === 'km') return v * M_PER_KM;
    if (f === 'mi') return v * M_PER_MILE;
    return v;
  }
  return v;
};

// Aggregate an array of records by day. Supports deduplication and preferring 'workout' source.
export function aggregateByDay(records, valueField = 'value', sum = false) {
  const map = {};
  const seenMap = {};
  records.forEach((r) => {
    const d = dateToYMD(r.date || r.startDate || r.timestamp);
    if (!d) return;
    const v = Number(r[valueField] ?? r.value ?? r.steps ?? 0);
    const timePart = r.startDate || r.date || r.timestamp || '';
    const key = `${d}|${v}|${timePart}`;
    const src = r.source || null;
    if (seenMap[key]) {
      if (seenMap[key].source !== 'workout' && src === 'workout') {
        seenMap[key] = { source: src, value: v };
      } else {
        return;
      }
    } else {
      seenMap[key] = { source: src, value: v };
    }
    if (!map[d]) map[d] = { date: d, value: 0, count: 0 };
    map[d].count += 1;
    map[d].value += v;
  });
  const out = Object.values(map).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!sum) {
    out.forEach((o) => {
      if (o.count > 0) o.value = o.value / o.count;
    });
  }
  return out;
}

// Helper to format date to YYYY-MM-DD
export function dateToYMD(d) {
  const dt = new Date(d);
  if (isNaN(dt)) return null;
  return dt.toISOString().slice(0, 10);
}

// Detect preferred unit (most common non-empty unit)
export function detectPreferredUnit(distances) {
  const unitCounts = {};
  (distances || []).forEach((d) => {
    const u = (d.unit || d.originalUnit || '') + '';
    const norm = normalizeUnit(u) || (u ? u.toLowerCase() : 'unknown');
    unitCounts[norm] = (unitCounts[norm] || 0) + 1;
  });
  const entries = Object.entries(unitCounts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  return entries[0][0] === 'unknown' ? null : entries[0][0];
}

// Process distances: choose preferred unit, convert all entries to it, and aggregate by day
export function processDistances(distances) {
  const preferred = detectPreferredUnit(distances);
  const converted = (distances || []).map((d) => {
    const raw = Number(d.distance ?? d.originalValue ?? 0) || 0;
    const fromUnit = d.unit || d.originalUnit || null;
    const conv = preferred ? toPreferred(raw, fromUnit, preferred) : raw;
    return { ...d, distance: conv };
  });
  const daily = aggregateByDay(converted, 'distance', true);
  return { preferredUnit: preferred, distanceDaily: daily };
}

// Exported small helpers used by Dashboard
export default {
  aggregateByDay,
  dateToYMD,
  detectPreferredUnit,
  processDistances,
};
