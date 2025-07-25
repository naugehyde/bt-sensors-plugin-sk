const { LRUCache } = require('lru-cache')


class DistanceManager {
    static METHOD_AVG = 1;
    static METHOD_WEIGHTED_AVG = 2;
    static METHOD_LAST_FEW_SAMPLES = 3;

    Constant = {
        DISTANCE_FIND_LAST_FEW_SAMPLE_TIME_FRAME_MILLIS: 5000, // Example value, adjust as needed
        DISTANCE_FIND_TIME_FRAME_MILLIS: 10000, // Example value, adjust as needed
        LAST_FEW_SAMPLE_COUNT: 5 // Example value, adjust as needed
    };


    #beaconRssiSampleMap = new LRUCache({ttl:1000*60*5}); // Using LRUCache with a ttl of 5m for beaconRssiSampleMap

    #timeFormatter = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false // Use 24-hour format
    });

    constructor(constants) {
        Object.assign(this.Constant,constants)
        // Constructor is empty as initialization is done with property declarations
    }

    addSample(macAddress, rssi) {
        // In Node.js (JavaScript), maps and objects are not inherently synchronized like
        // Java's synchronized blocks. If this were a multi-threaded Node.js environment
        // (e.g., Worker Threads), you'd need explicit locking mechanisms or message passing.
        // For typical single-threaded Node.js, direct access is usually fine,
        // but if concurrency is a concern, consider a mutex implementation.
        let samples = this.#beaconRssiSampleMap.get(macAddress);
        if (!samples) {
            samples = new Map(); // Using Map instead of LinkedHashMap
            this.#beaconRssiSampleMap.set(macAddress, samples);
        }
        samples.set(Date.now(), rssi);
    }

    getDistance(macAddress, txPower, method, debugLog) {
        const samples = this.#beaconRssiSampleMap.get(macAddress);
        if (!samples) {
            return 0;
        }

        // Create a new Map to avoid modifying the original during filtering/processing
        const currentSamples = new Map(samples);

        const fromTimestamp = Date.now() - (method === DistanceManager.METHOD_LAST_FEW_SAMPLES ?
            this.Constant.DISTANCE_FIND_LAST_FEW_SAMPLE_TIME_FRAME_MILLIS : this.Constant.DISTANCE_FIND_TIME_FRAME_MILLIS);
        const toTimestamp = Date.now();

        const filteredRssi = this.#filterRssiSamplesWithinTimeFrame(currentSamples, fromTimestamp, toTimestamp);

        const smoothRssi = this.#reduceNoiseFromRSSI(filteredRssi);

        let rssi = 0;
        let distance;

        switch (method) {
            case DistanceManager.METHOD_AVG:
                rssi = this.#calculateAverage(smoothRssi);
                break;
            case DistanceManager.METHOD_WEIGHTED_AVG:
                rssi = this.#calculateWeightedAverageOfRssiSamples(smoothRssi);
                break;
            case DistanceManager.METHOD_LAST_FEW_SAMPLES:
                if (samples.size >= this.Constant.LAST_FEW_SAMPLE_COUNT) {
                    rssi = this.#calculateAverage(smoothRssi);
                } else {
                    return -1;
                }
                break;
            default:
                // Handle unknown method or provide a default
                console.warn(`Unknown method: ${method}`);
                return 0;
        }

        distance = this.#calculateAccuracy(txPower, rssi);

        if (debugLog) {
            this.#logSamples(smoothRssi, fromTimestamp, toTimestamp, rssi, distance);
        }
        return distance;
    }

    #removeOutliers(filteredRssi, avgOutlierRssi, outlierConstant) {
        const outlierRemoveRssi = new Map();

        const minRssi = Math.floor(avgOutlierRssi) - outlierConstant;
        const maxRssi = Math.floor(avgOutlierRssi) + outlierConstant;

        for (const [timestamp, value] of filteredRssi.entries()) {
            if (value >= minRssi && value <= maxRssi) {
                outlierRemoveRssi.set(timestamp, value);
            }
        }
        return outlierRemoveRssi;
    }

    #reduceNoiseFromRSSI(filteredRssi) {
        const smoothRssi = new Map();

        const rssiEntries = Array.from(filteredRssi.entries());
        const totalRssi = rssiEntries.length;

        for (let i = 0; i < totalRssi; i++) {
            const [currentTimestamp, currentRssi] = rssiEntries[i];
            const nextRssi = rssiEntries[i + 1] ? rssiEntries[i + 1][1] : currentRssi; // If no next, use current

            const avgRssi = Math.floor((currentRssi + nextRssi) / 2);
            smoothRssi.set(currentTimestamp, avgRssi);
        }
        return smoothRssi;
    }

    #filterRssiSamplesWithinTimeFrame(rssiSamples, fromTimestamp, toTimestamp) {
        const filteredSamples = new Map();
        for (const [timestamp, rssi] of rssiSamples.entries()) {
            if (fromTimestamp === 0) {
                if (timestamp <= toTimestamp) {
                    filteredSamples.set(timestamp, rssi);
                }
            } else if (timestamp > fromTimestamp && timestamp <= toTimestamp) {
                filteredSamples.set(timestamp, rssi);
            }
        }
        return filteredSamples;
    }

    #calculateAverage(filteredRssi) {
        let sum = 0;
        if (filteredRssi.size === 0) {
            return 0; // Avoid division by zero
        }
        for (const rssi of filteredRssi.values()) {
            sum += rssi;
        }
        return sum / filteredRssi.size;
    }

    #calculateWeightedAverageOfRssiSamples(filteredRssi) {
        // 1. Find count
        const uniqueRssiCountMap = new Map();
        for (const rssi of filteredRssi.values()) {
            uniqueRssiCountMap.set(rssi, (uniqueRssiCountMap.get(rssi) || 0) + 1);
        }

        // 2. Find weight of each rssi
        const uniqueRssiWeightMap = new Map();
        const totalSamples = filteredRssi.size;
        if (totalSamples === 0) {
            return 0; // Avoid division by zero
        }
        for (const [rssi, count] of uniqueRssiCountMap.entries()) {
            const weight = count / totalSamples;
            uniqueRssiWeightMap.set(rssi, weight);
        }

        // 3. Calculate weighted average
        let sum = 0;
        for (const [rssi, weight] of uniqueRssiWeightMap.entries()) {
            sum += rssi * weight;
        }
        return sum;
    }

    #calculateAccuracy(txPower, rssi) {
        if (rssi === 0) {
            return -1.0;
        }

        const ratio = rssi * 1.0 / txPower;
        if (ratio < 1.0) {
            return Math.pow(ratio, 10);
        } else {
            return ((0.42093) * Math.pow(ratio, 6.9476)) + 0.54992; // Nexus 5 formula
        }
    }

    #logSamples(samples, fromTimestamp, toTimestamp, rssiWeightedAvg, distance) {
        const object = {};
        const array = [];
        try {
            for (const [timestamp, rssi] of samples.entries()) {
                const jsonSample = {
                    rssi: rssi,
                    timestamp: this.#getTimeString(timestamp)
                };
                array.push(jsonSample);
            }
            object.calc_rssi = rssiWeightedAvg;
            object.distance = distance;
            object.start_time = this.#getTimeString(fromTimestamp);
            object.end_time = this.#getTimeString(toTimestamp);
            object.samples = array;
            // In Node.js, 'console.log' is used instead of 'Log.d'
            console.log("SampleData", JSON.stringify(object, null, 2)); // Prettify output
        } catch (error) {
            console.error("Error logging samples:", error); // Use console.error for errors
        }
    }

    #getTimeString(millis) {
        const d = new Date(millis);
        return this.#timeFormatter.format(d);
    }
}

// Example Usage (for demonstration purposes)
/*
// You might need to define or import Constant with your specific values
const Constant = {
    DISTANCE_FIND_LAST_FEW_SAMPLE_TIME_FRAME_MILLIS: 5000,
    DISTANCE_FIND_TIME_FRAME_MILLIS: 10000,
    LAST_FEW_SAMPLE_COUNT: 5
};

const distanceManager = new DistanceManager();

// Simulate adding some samples
distanceManager.addSample("AA:BB:CC:DD:EE:FF", -70);
setTimeout(() => distanceManager.addSample("AA:BB:CC:DD:EE:FF", -72), 500);
setTimeout(() => distanceManager.addSample("AA:BB:CC:DD:EE:FF", -68), 1000);
setTimeout(() => distanceManager.addSample("AA:BB:CC:DD:EE:FF", -75), 1500);
setTimeout(() => distanceManager.addSample("AA:BB:CC:DD:EE:FF", -71), 2000);
setTimeout(() => distanceManager.addSample("AA:BB:CC:DD:EE:FF", -69), 2500);
setTimeout(() => distanceManager.addSample("AA:BB:CC:DD:EE:FF", -73), 3000);

// Get distance after some time
setTimeout(() => {
    const txPower = -59; // Example TxPower
    let distance = distanceManager.getDistance("AA:BB:CC:DD:EE:FF", txPower, DistanceManager.METHOD_AVG, true);
    console.log(`Calculated Distance (AVG): ${distance.toFixed(2)} meters`);

    distance = distanceManager.getDistance("AA:BB:CC:DD:EE:FF", txPower, DistanceManager.METHOD_WEIGHTED_AVG, true);
    console.log(`Calculated Distance (WEIGHTED_AVG): ${distance.toFixed(2)} meters`);

    distance = distanceManager.getDistance("AA:BB:CC:DD:EE:FF", txPower, DistanceManager.METHOD_LAST_FEW_SAMPLES, true);
    console.log(`Calculated Distance (LAST_FEW_SAMPLES): ${distance.toFixed(2)} meters`);

}, 4000);
*/
module.exports=DistanceManager