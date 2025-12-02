export function processWorkoutData(xmlDoc) {
    // Try using a different XPath based on your XML structure.
    // For instance, if workouts are stored in <Workout> elements:
    const xpath = "//Workout";
    const results = xmlDoc.evaluate(
        xpath,
        xmlDoc,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
    );
    console.log("Number of workout records found:", results.snapshotLength); // Debug log

    // Mapping of raw workout types to friendly names.
    const workoutTypeMapping = {
        "HKWorkoutActivityTypeBaseball": "Baseball",
        "HKWorkoutActivityTypeRunning": "Running",
        "HKWorkoutActivityTypeWalking": "Walking",
        "HKWorkoutActivityTypeTraditionalStrengthTraining": "Strength Training",
        "HKWorkoutActivityTypeFunctionalStrengthTraining": "Functional Strength Training",
        "HKWorkoutActivityTypeCycling": "Cycling",
        "HKWorkoutActivityTypeJumpRope": "Jump Rope",
        "HKQuantityTypeIdentifierDistanceWalkingRunning": "RunningWalking"
    };

    const workouts = [];
    for (let i = 0; i < results.snapshotLength; i++) {
        const record = results.snapshotItem(i);
        // Adjust the attribute name accordingly. For example, if using <Workout> elements,
        // the attribute might be "workoutActivityType" or something else.
        const rawType = record.getAttribute("workoutActivityType");
        const friendlyType = workoutTypeMapping[rawType] || rawType;
        workouts.push({
            workoutType: friendlyType,
            date: record.getAttribute("startDate")
        });
    }
    return workouts;
}