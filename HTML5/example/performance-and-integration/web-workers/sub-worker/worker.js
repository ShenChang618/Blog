onmessage = e => {
  console.log('Worker 线程接收到主线程发送的消息');
  const subWorker = new Worker('./sub-worker.js');
  console.log('Worker 线程发送消息给 Sub Worker 线程');
  subWorker.postMessage('send');
  subWorker.addEventListener('message', () => {
    console.log('Worker 线程接收到 Sub Worker 线程回复的消息');
    console.log('Worker 线程回复消息给主线程');

    postMessage('reply');
  })
};