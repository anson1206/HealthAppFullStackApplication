// Minimal reportWebVitals stub compatible with Create React App
// Exports a function that accepts an optional callback. If `web-vitals` is
// available, it will collect metrics and call the callback; otherwise it's a noop.

const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && typeof onPerfEntry === 'function') {
    try {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        try {
          getCLS(onPerfEntry);
          getFID(onPerfEntry);
          getFCP(onPerfEntry);
          getLCP(onPerfEntry);
          getTTFB(onPerfEntry);
        } catch (e) {
          // ignore metric errors
          console.warn('reportWebVitals: metric collection failed', e);
        }
      }).catch(() => {
        // web-vitals not installed — ignore
      });
    } catch (e) {
      // dynamic import can fail in some environments — ignore
    }
  }
};

export default reportWebVitals;