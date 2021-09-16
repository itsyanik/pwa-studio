const msPerSec = 1e3;
const nsPerMillisec = 1e6;
const formatTime = ([seconds, nanoseconds]) =>
    Math.round(seconds * msPerSec + nanoseconds / nsPerMillisec) / msPerSec;
function timer() {
    const startTime = process.hrtime();
    let lastLap = startTime;
    return {
        lap() {
            const lapTime = process.hrtime(lastLap);
            lastLap = process.hrtime();
            return formatTime(lapTime);
        },
        stop() {
            return formatTime(process.hrtime(startTime));
        }
    };
}

module.exports = timer;
