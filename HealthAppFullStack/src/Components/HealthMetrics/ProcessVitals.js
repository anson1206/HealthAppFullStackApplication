export function processVitals(xmlDoc) {
    // Extract several HKQuantityTypeIdentifier* records
    const types = [
        { key: 'weight', type: 'HKQuantityTypeIdentifierBodyMass', valueAttr: 'value' },
        { key: 'restingHeartRate', type: 'HKQuantityTypeIdentifierRestingHeartRate', valueAttr: 'value' },
        { key: 'respiratoryRate', type: 'HKQuantityTypeIdentifierRespiratoryRate', valueAttr: 'value' },
        { key: 'oxygenSaturation', type: 'HKQuantityTypeIdentifierOxygenSaturation', valueAttr: 'value' },
        { key: 'systolicBP', type: 'HKQuantityTypeIdentifierBloodPressureSystolic', valueAttr: 'value' },
        { key: 'diastolicBP', type: 'HKQuantityTypeIdentifierBloodPressureDiastolic', valueAttr: 'value' }
    ];

    const out = { weight: [], restingHeartRate: [], respiratoryRate: [], oxygenSaturation: [], systolicBP: [], diastolicBP: [] };

    types.forEach(t => {
        const xpath = `//Record[@type='${t.type}']`;
        try {
            const results = xmlDoc.evaluate(xpath, xmlDoc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            for (let i = 0; i < results.snapshotLength; i++) {
                const record = results.snapshotItem(i);
                const val = record.getAttribute(t.valueAttr);
                const d = record.getAttribute('startDate') || record.getAttribute('date') || record.getAttribute('creationDate');
                if (!val || !d) continue;
                out[t.key === 'weight' ? 'weight' : t.key] = out[t.key === 'weight' ? 'weight' : t.key].concat({ value: Number(val), date: d });
            }
        } catch (e) {
            console.warn('processVitals: xpath failed', xpath, e);
        }
    });

    // try correlations for blood pressure if available (HKCorrelationTypeIdentifierBloodPressure)
    try {
        const corrXpath = "//Correlation[@type='HKCorrelationTypeIdentifierBloodPressure']";
        const corrs = xmlDoc.evaluate(corrXpath, xmlDoc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for (let i = 0; i < corrs.snapshotLength; i++) {
            const corr = corrs.snapshotItem(i);
            const startDate = corr.getAttribute('startDate') || corr.getAttribute('date');
            // find child Record elements for systolic/diastolic
            const childRecords = corr.getElementsByTagName('Record');
            let sys = null, dia = null;
            for (let j = 0; j < childRecords.length; j++) {
                const r = childRecords[j];
                const t = r.getAttribute('type');
                if (t && t.includes('BloodPressureSystolic')) sys = r.getAttribute('value');
                if (t && t.includes('BloodPressureDiastolic')) dia = r.getAttribute('value');
            }
            if (sys) out.systolicBP.push({ value: Number(sys), date: startDate });
            if (dia) out.diastolicBP.push({ value: Number(dia), date: startDate });
        }
    } catch (e) {
        // ignore
    }

    return out;
}
