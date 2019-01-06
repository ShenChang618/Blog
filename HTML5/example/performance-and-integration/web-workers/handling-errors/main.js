const button = document.querySelector('#button');

const worker = new Worker('./worker.js');

button.addEventListener('click', () => {
  console.log('主线程发送消息，让 Worker 线程触发错误');
  worker.postMessage('send');
});

worker.addEventListener('error', e => {
  console.log('主线程接收错误，错误消息：');
  console.log('filename:', e.filename);
  console.log('lineno:', e.lineno);
  console.log('message:', e.message);
});