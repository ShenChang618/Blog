const number1 = document.querySelector('#number1');
const number2 = document.querySelector('#number2');
const button = document.querySelector('#button');
const result = document.querySelector('#result');

// 1. 创建共享实例
const worker = new SharedWorker('./worker.js');

// 2. 通过端口对象的 start 方法显式打开端口连接，因为下文没有使用 onmessage 事件
worker.port.start();

button.addEventListener('click', () => {
  // 3. 通过端口对象发送消息
  worker.port.postMessage([number1.value, number2.value]);
});

// 8. 监听共享线程返回的结果
worker.port.addEventListener('message', e => {
  result.textContent = e.data;
});