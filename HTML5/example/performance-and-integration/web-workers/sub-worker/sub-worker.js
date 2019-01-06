self.addEventListener('message', e => {
  console.log('Sub Worker 线程接收到 Worker 线程的发送消息');
  console.log('Sub Worker 线程回复消息给 Worker 线程，并销毁自身')
  self.postMessage('reply');
  self.close();
})