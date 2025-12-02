import { processHeartRateData } from "../HealthMetrics/HeartRateProcessor";
import { processActiveEnergyData } from "../HealthMetrics/ProcessActiveEnergy";
import { processWorkoutData } from "../fileprocessing/processWorkoutData";
import { processSleepData } from "../HealthMetrics/ProcessSleep";
import { processStepCountData } from "../HealthMetrics/ProcessSteps";
import { processVitals } from "../HealthMetrics/ProcessVitals";

//compresses health data by sampling heart rate and energy data
export const compressHealthData = (healthData) => {
    const compressed = {
        heartRates: [],
        energyData: [],
        workouts: healthData.workouts || [] // Keep workouts as is
    };
    
    // Sample heart rate data - keep every 5th reading
    if (healthData.heartRates && healthData.heartRates.length > 0) {
        compressed.heartRates = healthData.heartRates.filter((_, index) => index % 5 === 0);
        console.log(`Heart rate data compressed: ${healthData.heartRates.length} → ${compressed.heartRates.length}`);
    }
    
    // Sample energy data - keep every 3rd reading
    if (healthData.energyData && healthData.energyData.length > 0) {
        compressed.energyData = healthData.energyData.filter((_, index) => index % 3 === 0);
        console.log(`Energy data compressed: ${healthData.energyData.length} → ${compressed.energyData.length}`);
    }
    
    return compressed;
};

export function processFile(fileContent) {
    try {
        // Preprocess fileContent: remove BOM, DOCTYPE/DTD and common problematic characters
        let txt = fileContent;
        // Remove UTF-8 BOM if present
        if (txt.charCodeAt(0) === 0xFEFF) txt = txt.slice(1);
        txt = txt.trim();
        // Remove DOCTYPE with internal DTD subset, e.g. <!DOCTYPE ... [ ... ]>
        txt = txt.replace(/<!DOCTYPE[\s\S]*?\]>/i, '');
        // Remove any remaining standalone DOCTYPE declarations
        txt = txt.replace(/<!DOCTYPE[^>]*>/i, '');
        // Replace stray ampersands that are not part of entities
        txt = txt.replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;');

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(txt, "text/xml");

        // Debug: show basic info about the parsed XML
        try {
            const rootName = xmlDoc && xmlDoc.documentElement ? xmlDoc.documentElement.nodeName : 'NO_ROOT';
            const parserErrors = xmlDoc.getElementsByTagName('parsererror');
            console.log('processFile: parsed XML root=', rootName, 'parserErrors=', parserErrors.length);
            if (parserErrors.length > 0) {
                // extract parser error text to return a helpful message
                const errText = Array.from(parserErrors).map(n => n.textContent).join('\n');
                console.error('processFile: XML parser error:', errText.slice(0, 1000));
                return { error: `XML parse error: ${errText.split('\n')[0]}` };
            }
        } catch (e) {
            console.warn('processFile: error checking xmlDoc:', e);
        }

        const heartRates = processHeartRateData(xmlDoc);
        const energyData = processActiveEnergyData(xmlDoc);
        const workouts = processWorkoutData(xmlDoc);
        const sleep = processSleepData(xmlDoc);
        const steps = processStepCountData(xmlDoc);
        const vitals = processVitals(xmlDoc);

        return { heartRates, energyData, workouts, sleep, steps, vitals };
    } catch (error) {
        console.error("Error processing file:", error);
        return { error: "Failed to process file. Please ensure it is a valid HealthKit XML file." };
    }
}