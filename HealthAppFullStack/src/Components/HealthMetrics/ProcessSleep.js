export function processSleepData(xmlDoc) {
  const xpath = "//Record[@type='HKCategoryTypeIdentifierSleepAnalysis']";
  const results = xmlDoc.evaluate(
    xpath,
    xmlDoc,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  const sleeps = [];
  for (let i = 0; i < results.snapshotLength; i++) {
    const record = results.snapshotItem(i);
    sleeps.push({
      value: record.getAttribute('value'),
      startDate: record.getAttribute('startDate'),
      endDate: record.getAttribute('endDate'),
    });
  }
  return sleeps;
}
