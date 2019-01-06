const button = document.querySelector('#button');

const worker = new Worker('./worker.js');

button.addEventListener('click', () => {
  console.log('主线程发送消息给 Worker 线程');
  worker.postMessage('send');
});

worker.addEventListener('message', e => {
  console.log('主线程接收到 Worker 线程回复的消息');
});