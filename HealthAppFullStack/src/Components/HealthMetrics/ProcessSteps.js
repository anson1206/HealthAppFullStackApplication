export function processStepCountData(xmlDoc) {
  const xpath = "//Record[@type='HKQuantityTypeIdentifierStepCount']";
  const results = xmlDoc.evaluate(
    xpath,
    xmlDoc,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  const steps = [];
  for (let i = 0; i < results.snapshotLength; i++) {
    const record = results.snapshotItem(i);
    steps.push({
      steps: Number(record.getAttribute('value')),
      date: record.getAttribute('startDate'),
    });
  }
  return steps;
}
