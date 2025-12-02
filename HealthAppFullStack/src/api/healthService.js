import { getUser } from './authService';

// Use direct backend URL for large uploads (proxy has size limits)
const API_BASE = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5000/api/health'
  : '/api/health';

function authHeaders() {
  // no JWT yet — headers not required
  return {};
}

export async function saveUserHealthData(healthData, userId) {
  const storedUser = getUser();
  const uid = storedUser ? storedUser.uid : userId;
  const body = { userId: uid, metric: 'dataset', value: healthData };
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Save failed');
  }
  return res.json();
}

export async function getUserHealthData(userId) {
  const storedUser = getUser();
  const uid = storedUser ? storedUser.uid : userId;
  const url = `${API_BASE}?userId=${encodeURIComponent(uid)}`;
  const res = await fetch(url, { headers: { ...authHeaders() } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Fetch failed');
  }
  const records = await res.json();
  // find latest dataset record
  const dataset = records.find(r => r.metric === 'dataset');
  // If dataset value contains only counts (server upload summary), reconstruct full arrays
  if (dataset && dataset.value && !(dataset.value.heartRates || dataset.value.energyData || dataset.value.steps)) {
    const assembleMetric = (metricName) => {
      const docs = records.filter(r => r.metric === metricName);
      const out = [];
      // sort by createdAt or _id to try to preserve order
      docs.sort((a,b) => {
        if (a.date && b.date) return new Date(a.date) - new Date(b.date);
        if (a.createdAt && b.createdAt) return new Date(a.createdAt) - new Date(b.createdAt);
        return 0;
      });
      docs.forEach(d => {
        if (Array.isArray(d.value)) out.push(...d.value);
      });
      return out;
    };

    const vitalsDoc = records.find(r => r.metric === 'vitals');

    const reconstructed = {
      heartRates: assembleMetric('heartRates'),
      energyData: assembleMetric('energyData'),
      workouts: assembleMetric('workouts'),
      sleep: assembleMetric('sleep'),
      steps: assembleMetric('steps'),
      distances: assembleMetric('distances'),
      vitals: vitalsDoc ? vitalsDoc.value : (dataset.value.vitalsSummary || {})
    };
    // also include lastUpdated if present in dataset summary
    if (dataset.value && dataset.value.lastUpdated) reconstructed.lastUpdated = dataset.value.lastUpdated;
    return reconstructed;
  }

  return dataset ? dataset.value : null;
}

// Update user health data — currently implemented by saving a new dataset record.
export async function updateUserHealthData(healthData, userId) {
  // For now, same behavior as saveUserHealthData (creates a new record tied to userId)
  return saveUserHealthData(healthData, userId);
}

// Upload raw XML file to backend (multipart/form-data)
export async function uploadHealthFile(file, userId, onProgress) {
  const API_UPLOAD = (process.env.NODE_ENV === 'development') ? 'http://localhost:5000/api/health/upload' : '/api/health/upload';
  const form = new FormData();
  form.append('file', file, file.name);
  form.append('userId', userId);

  const res = await fetch(API_UPLOAD, {
    method: 'POST',
    body: form
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}
