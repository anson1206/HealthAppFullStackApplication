const express = require('express');
const router = express.Router();
const HealthRecord = require('./model');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sax = require('sax');

// Unit conversion helpers
const MILES_TO_KM = 1.60934;
const LBS_TO_KG = 0.45359237;
function convertDistanceToKm(value, unit) {
  if (value === undefined || value === null) return 0;
  const v = Number(value) || 0;
  if (!unit) return v; // assume already in desired unit (best-effort)
  const u = String(unit).toLowerCase();
  if (u.includes('mile') || u.includes('mi')) return v * MILES_TO_KM;
  if (u.includes('km') || u.includes('kilometer') || u.includes('kilomet')) return v;
  // fallback: return original
  return v;
}

function convertWeightToKg(value, unit) {
  if (value === undefined || value === null) return 0;
  const v = Number(value) || 0;
  if (!unit) return v; // assume already kg
  const u = String(unit).toLowerCase();
  if (u.includes('lb') || u.includes('pound')) return v * LBS_TO_KG;
  if (u.includes('kg') || u.includes('kilogram')) return v;
  return v;
}

// multer temporary upload folder
const upload = multer({ dest: path.join(__dirname, 'uploads') });

// GET /api/health?userId=... - returns records for given userId
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    const records = await HealthRecord.find(filter).sort({ date: -1 });
    console.log(`GET /api/health userId=${req.query.userId} -> ${records.length} records`);
    // log available metrics for debugging
    console.log(records.map(r => ({ id: r._id.toString(), metric: r.metric, date: r.date })));
    res.json(records);
  } catch (err) {
    console.error('Error in GET /api/health', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Return the latest health record for a given userId
router.get('/latest', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId query parameter required' });
    const record = await HealthRecord.findOne({ userId }).sort({ date: -1, createdAt: -1 });
    if (!record) return res.status(404).json({ error: 'No records found for user' });
    console.log(`GET /api/health/latest userId=${userId} -> id=${record._id.toString()}`);
    res.json(record);
  } catch (err) {
    console.error('Error in GET /api/health/latest', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// POST /api/health - create record; body must include userId
router.post('/', async (req, res) => {
  try {
    const { userId, metric, value, date } = req.body;
    if (!userId || !metric || value === undefined) {
      return res.status(400).json({ error: 'userId, metric and value are required' });
    }
    // log basic body and value sizes for debugging
    const valueSummary = value && typeof value === 'object' ? {
      heartRatesCount: Array.isArray(value.heartRates) ? value.heartRates.length : undefined,
      energyDataCount: Array.isArray(value.energyData) ? value.energyData.length : undefined,
      workoutsCount: Array.isArray(value.workouts) ? value.workouts.length : undefined,
    } : undefined;
    console.log('POST /api/health body:', { userId, metric, date, valueSummary });
    const record = new HealthRecord({ userId, metric, value, date });
    await record.save();
    console.log('Saved health record id=', record._id.toString());
    res.status(201).json(record);
  } catch (err) {
    console.error('Error in POST /api/health', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;

// POST /api/health/upload - accept multipart file and stream-parse it
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    const userId = req.body.userId;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const filePath = req.file.path;
    console.log('Received upload for user', userId, 'file:', filePath, 'sizeBytes=', req.file.size);

    // Prepare containers
    const result = { heartRates: [], energyData: [], workouts: [], sleep: [], steps: [], distances: [], vitals: {} };
    // track observed distance units for debugging
    const observedDistanceUnits = new Set();

    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const saxStream = sax.createStream(true, { trim: true });

    saxStream.on('opentag', (node) => {
      try {
        const name = node.name; // e.g., 'Record' or 'Workout' or 'Correlation'
        const attrs = node.attributes || {};
        if (name === 'Record') {
          const type = attrs.type || '';
          // Heart rate
          if (type.includes('HeartRate')) {
            result.heartRates.push({ heartRate: attrs.value, date: attrs.startDate });
          }
          // Active energy
          else if (type.includes('ActiveEnergyBurned')) {
            result.energyData.push({ energy: attrs.value, date: attrs.startDate });
          }
          // Steps
          else if (type.includes('StepCount')) {
            result.steps.push({ steps: Number(attrs.value || 0), date: attrs.startDate });
          }
          // Distance (walking/running/cycling/swimming)
          else if (type.includes('Distance') || type.includes('HKQuantityTypeIdentifierDistanceWalkingRunning') || type.includes('HKQuantityTypeIdentifierDistanceCycling') || type.includes('HKQuantityTypeIdentifierDistanceSwimming') || type.includes('HKQuantityTypeIdentifierDistanceWalkingRunning')) {
            // store numeric distance and convert to km when unit indicates miles
            const rawVal = Number(attrs.value || 0);
              // Do not convert units here; store original value and unit as provided. Mark source as 'record'
            result.distances.push({ distance: rawVal, unit: attrs.unit || null, originalValue: rawVal, originalUnit: attrs.unit || null, date: attrs.startDate });
            if (attrs.unit) observedDistanceUnits.add(String(attrs.unit));
          }
          // Sleep analysis
          else if (type.includes('SleepAnalysis')) {
            result.sleep.push({ value: attrs.value, startDate: attrs.startDate, endDate: attrs.endDate });
          }
          // Vitals: weight, resting HR, respiratory rate, oxygen saturation, blood pressure pieces
          else if (type.includes('BodyMass') || type.includes('RestingHeartRate') || type.includes('RespiratoryRate') || type.includes('OxygenSaturation') || type.includes('BloodPressure')) {
            // map type to key
            const map = {
              'HKQuantityTypeIdentifierBodyMass': 'weight',
              'HKQuantityTypeIdentifierRestingHeartRate': 'restingHeartRate',
              'HKQuantityTypeIdentifierRespiratoryRate': 'respiratoryRate',
              'HKQuantityTypeIdentifierOxygenSaturation': 'oxygenSaturation'
            };
            Object.keys(map).forEach(k => {
              if (type.includes(k)) {
                const key = map[k];
                if (!result.vitals[key]) result.vitals[key] = [];
                // convert weight from lbs->kg if unit present
                if (key === 'weight') {
                  const raw = Number(attrs.value);
                  const kg = convertWeightToKg(raw, attrs.unit);
                  result.vitals[key].push({ value: kg, unit: 'kg', originalValue: raw, originalUnit: attrs.unit || null, date: attrs.startDate });
                } else {
                  result.vitals[key].push({ value: Number(attrs.value), date: attrs.startDate });
                }
              }
            });
            // Blood pressure correlations are often in Correlation elements; we'll handle Correlation open tags separately
          }
        } else if (name === 'Workout' || name === 'WorkoutItem' || name === 'Activity') {
          // Fallback workout parsing
          result.workouts.push({ workoutType: attrs.workoutActivityType || attrs.type || 'workout', date: attrs.startDate });
          // Some Workouts include a totalDistance attribute — capture it (mark as 'workout')
          const distRaw = attrs.totalDistance || attrs.total_distance || attrs.distance || attrs.totalDistanceValue;
          const distUnit = attrs.totalDistanceUnit || attrs.unit || attrs.distanceUnit || attrs.unitOfMeasure || null;
          if (distRaw) {
            const rawVal = Number(distRaw || 0);
            // store original workout distance without conversion and mark source
            result.distances.push({ distance: rawVal, unit: distUnit || null, originalValue: rawVal, originalUnit: distUnit || null, date: attrs.startDate, source: 'workout' });
            if (distUnit) observedDistanceUnits.add(String(distUnit));
          }
        } else if (name === 'WorkoutStatistics') {
          // WorkoutStatistics may contain a sum attribute for distance
          try {
            const statType = attrs.type || '';
            if (statType && statType.toLowerCase().includes('distance')) {
              const sumVal = attrs.sum || attrs.value || null;
              const unit = attrs.unit || attrs.unitOfMeasure || null;
              if (sumVal) {
                const rawVal = Number(sumVal || 0);
                result.distances.push({ distance: rawVal, unit: unit, originalValue: rawVal, originalUnit: unit, date: attrs.startDate || attrs.creationDate || null, source: 'workout' });
                if (unit) observedDistanceUnits.add(String(unit));
              }
            }
          } catch (e) {}
        } else if (name === 'WorkoutRoute' || name === 'MetadataEntry') {
          // WorkoutRoute -> MetadataEntry elements sometimes carry workout distance
          try {
            if (name === 'MetadataEntry' && attrs.key === 'HKMetadataKeyWorkoutDistance') {
              const val = attrs.value || null;
              if (val) {
                const rawVal = Number(val || 0);
                result.distances.push({ distance: rawVal, unit: attrs.unit || null, originalValue: rawVal, originalUnit: attrs.unit || null, date: attrs.startDate || attrs.creationDate || null, source: 'workout' });
                if (attrs.unit) observedDistanceUnits.add(String(attrs.unit));
              }
            }
          } catch (e) {}
        } else if (name === 'Correlation') {
          const ctype = attrs.type || '';
          if (ctype.includes('BloodPressure')) {
            // child Records may follow; sax will emit child tags; handling requires capture state — simplified: attempt to read systolic/diastolic attributes if present
            if (attrs.startDate) {
              // if attributes carry values directly, push as BP
              if (attrs.systolic) {
                if (!result.vitals.systolicBP) result.vitals.systolicBP = [];
                result.vitals.systolicBP.push({ value: Number(attrs.systolic), date: attrs.startDate });
              }
              if (attrs.diastolic) {
                if (!result.vitals.diastolicBP) result.vitals.diastolicBP = [];
                result.vitals.diastolicBP.push({ value: Number(attrs.diastolic), date: attrs.startDate });
              }
            }
          }
        }
      } catch (e) {
        // continue on parse errors
      }
    });

    saxStream.on('error', (err) => {
      console.error('SAX parse error', err);
      // cleanup
      try { fs.unlinkSync(filePath); } catch (e) {}
      return res.status(400).json({ error: 'Failed to parse uploaded XML', details: err.message });
    });

    saxStream.on('end', async () => {
      try {
        // Instead of saving one huge document (which may exceed MongoDB 16MB limit),
        // split large arrays into smaller chunked documents and insert them in bulk.
        const toInsert = [];
        const chunkArray = (arr, chunkSize) => {
          const chunks = [];
          for (let i = 0; i < arr.length; i += chunkSize) chunks.push(arr.slice(i, i + chunkSize));
          return chunks;
        };

        const CHUNK_SIZE = 5000; // conservative default; adjust if needed

        // Helper to push chunk documents for an array metric
        const pushArrayMetric = (metricName, arr) => {
          if (!arr || arr.length === 0) return;
          const chunks = chunkArray(arr, CHUNK_SIZE);
          chunks.forEach((chunk, idx) => {
            toInsert.push({ userId, metric: metricName, value: chunk, meta: { chunkIndex: idx, chunkCount: chunks.length }, date: new Date() });
          });
        };

        // push arrays
        pushArrayMetric('heartRates', result.heartRates || []);
        pushArrayMetric('energyData', result.energyData || []);
        pushArrayMetric('workouts', result.workouts || []);
        pushArrayMetric('sleep', result.sleep || []);
        pushArrayMetric('steps', result.steps || []);
        pushArrayMetric('distances', result.distances || []);

        // vitals is an object of small arrays — store as single doc
        if (result.vitals && Object.keys(result.vitals).length > 0) {
          toInsert.push({ userId, metric: 'vitals', value: result.vitals, date: new Date() });
        }

        if (toInsert.length === 0) {
          // nothing parsed
          try { fs.unlinkSync(filePath); } catch (e) {}
          return res.status(400).json({ error: 'No health records found in upload' });
        }

        // Perform bulk insert
        console.log(`Inserting ${toInsert.length} documents for user ${userId}`);
        const inserted = await HealthRecord.insertMany(toInsert, { ordered: false });
        console.log('Bulk insert completed, inserted count=', inserted.length);

        // Log observed distance units seen during parsing (helpful for debugging unit variants)
        try {
          console.log('Observed distance units in upload:', Array.from(observedDistanceUnits));
        } catch (e) {}

        // also insert a small dataset summary document so the frontend can detect and fetch data
        try {
          const summary = {
            heartRatesCount: result.heartRates ? result.heartRates.length : 0,
            energyDataCount: result.energyData ? result.energyData.length : 0,
            workoutsCount: result.workouts ? result.workouts.length : 0,
            sleepCount: result.sleep ? result.sleep.length : 0,
            stepsCount: result.steps ? result.steps.length : 0,
            distancesCount: result.distances ? result.distances.length : 0,
            vitalsSummary: result.vitals || {}
          };
          const datasetRecord = new HealthRecord({ userId, metric: 'dataset', value: summary, date: new Date() });
          await datasetRecord.save();
        } catch (e) {
          console.warn('Failed to save summary dataset doc', e);
        }

        // remove temp file
        try { fs.unlinkSync(filePath); } catch (e) { console.warn('Failed to delete temp upload', e); }

        res.status(201).json({ success: true, insertedCount: inserted.length });
      } catch (e) {
        console.error('Error saving uploaded dataset', e);
        try { fs.unlinkSync(filePath); } catch (er) {}
        res.status(500).json({ error: 'Failed to save dataset', details: e.message });
      }
    });

    // pipe file stream into sax parser
    stream.pipe(saxStream);
  } catch (err) {
    console.error('Upload handler error', err);
    res.status(500).json({ error: 'Server error during upload', details: err.message });
  }
});