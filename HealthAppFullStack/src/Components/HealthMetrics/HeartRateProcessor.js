export function processHeartRateData(xmlDoc) {
    const xpath = "//Record[@type='HKQuantityTypeIdentifierHeartRate']";
    const results = xmlDoc.evaluate(
        xpath,
        xmlDoc,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
    );
    console.log('processHeartRateData: xpath=', xpath, 'found=', results.snapshotLength);
    const heartRates = [];
    for (let i = 0; i < results.snapshotLength; i++) {
        const record = results.snapshotItem(i);
        if (i === 0) {
            console.log('processHeartRateData: sample record attrs=', {
                value: record.getAttribute('value'),
                startDate: record.getAttribute('startDate')
            });
        }
        heartRates.push({
            heartRate: record.getAttribute("value"),
            date: record.getAttribute("startDate"),
        });
    }
    return heartRates;
}