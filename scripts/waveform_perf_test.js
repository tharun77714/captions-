const fs = require('fs');

function simulateOldWaveform(audioBufferLength, sampleRate) {
    const start = performance.now();
    
    // Simulate memory allocation of downloaded file and AudioBuffer (Float32Array)
    // 60 seconds of audio at 48000Hz = 2,880,000 samples
    const channelData = new Float32Array(audioBufferLength);
    for(let i = 0; i < channelData.length; i++) {
        channelData[i] = (Math.random() * 2) - 1; // Fake audio data
    }
    
    const bucketsPerSecond = 100;
    const samplesPerBucket = Math.floor(sampleRate / bucketsPerSecond);
    
    const minPeaks = [];
    const maxPeaks = [];
    let globalMax = 0;
    
    for (let i = 0; i < channelData.length; i += samplesPerBucket) {
        let min = 0;
        let max = 0;
        for (let j = 0; j < samplesPerBucket && i + j < channelData.length; j++) {
            const val = channelData[i + j];
            if (val < min) min = val;
            if (val > max) max = val;
        }
        minPeaks.push(min);
        maxPeaks.push(max);
        if (max > globalMax) globalMax = max;
        if (-min > globalMax) globalMax = -min;
    }

    const normalizedMin = globalMax > 0 ? minPeaks.map(v => v / globalMax) : minPeaks;
    const normalizedMax = globalMax > 0 ? maxPeaks.map(v => v / globalMax) : maxPeaks;
    
    const end = performance.now();
    return {
        timeMs: end - start,
        memoryBytes: channelData.byteLength + (minPeaks.length * 8) * 2
    };
}

function simulateNewWaveform(durationSeconds) {
    const start = performance.now();
    
    // Server payload simulation
    const buckets = durationSeconds * 100;
    const backendPayload = new Array(buckets).fill(50);
    
    const min = backendPayload.map(v => -(v / 100));
    const max = backendPayload.map(v => (v / 100));
    const resolution = 100;
    
    const end = performance.now();
    return {
        timeMs: end - start,
        memoryBytes: (buckets * 8) * 2 // Memory for mapped float arrays
    };
}

console.log("OLD ARCHITECTURE (60s video, 48kHz, Client-Side extraction):");
const oldStats = simulateOldWaveform(60 * 48000, 48000);
console.log(`Processing Time: ${oldStats.timeMs.toFixed(2)} ms`);
console.log(`Memory Allocated: ${(oldStats.memoryBytes / 1024 / 1024).toFixed(2)} MB`);

console.log("\nNEW ARCHITECTURE (60s video, 100Hz precomputed Server-Side extraction):");
const newStats = simulateNewWaveform(60);
console.log(`Processing Time: ${newStats.timeMs.toFixed(2)} ms`);
console.log(`Memory Allocated: ${(newStats.memoryBytes / 1024 / 1024).toFixed(2)} MB`);
