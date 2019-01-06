const button = document.querySelector('#button');

const worker = new Worker('./worker.js');

button.addEventListener('click', () => {
  worker.postMessage('send');
});

worker.addEventListener('message', e => {
  console.log('接收到 Worker 线程发送的消息：');
  console.log(e.data);
});