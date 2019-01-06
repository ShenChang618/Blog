onmessage = e => {
  postMessage('worker3001 -> index');
  const proxyScript = `importScripts('http://localhost:3001/sub-worker.js')`;
  const proxyUrl = self.URL.createObjectURL(new Blob([ proxyScript ], { type: 'text/javascript' }));
  console.log(proxyUrl);
  const subWorker = new Worker(proxyUrl);
  console.log('Worker 线程发送消息给 Sub Worker 线程');
  subWorker.postMessage('send');
  subWorker.addEventListener('message', () => {
    console.log('Worker 线程接收到 Sub Worker 线程回复的消息');
    console.log('Worker 线程回复消息给主线程');

    postMessage('reply');
  })
};