const proxyScript = `importScripts('http://localhost:3002/worker.js')`;
const proxyUrl = window.URL.createObjectURL(new Blob([ proxyScript ], { type: 'text/javascript' }));
const worker = new Worker('./worker.js');
console.log('index -> worker');
worker.postMessage('index -> worker');

worker.onmessage = e => {
  console.log('index:', e.data);
};