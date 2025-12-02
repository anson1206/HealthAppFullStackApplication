export function processActiveEnergyData(xmlDoc) {
    const xpath = "//Record[@type='HKQuantityTypeIdentifierActiveEnergyBurned']";
    const results = xmlDoc.evaluate(
        xpath, 
        xmlDoc, 
        null, 
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, 
        null
    );
    console.log('processActiveEnergyData: xpath=', xpath, 'found=', results.snapshotLength);
    const energyData = [];
    for (let i = 0; i < results.snapshotLength; i++) {
        const record = results.snapshotItem(i);
        if (i === 0) {
            console.log('processActiveEnergyData: sample record attrs=', {
                value: record.getAttribute('value'),
                startDate: record.getAttribute('startDate')
            });
        }
        energyData.push({
            energy: record.getAttribute("value"),
            date: record.getAttribute("startDate")
        });
    }
    return energyData;
}