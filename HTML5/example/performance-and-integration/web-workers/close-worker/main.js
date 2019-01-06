const number1 = document.querySelector('#number1');
const number2 = document.querySelector('#number2');
const button = document.querySelector('#button');
const terminate = document.querySelector('#terminate');
const close = document.querySelector('#close');
const result = document.querySelector('#result');

const worker = new Worker('./worker.js');

button.addEventListener('click', () => {
  worker.postMessage([number1.value, number2.value]);
});

// 主线程中终止 Worker 线程
terminate.addEventListener('click', () => {
  worker.terminate();
  console.log('主线程中终止 Worker 线程');
});

// 发送消息让 Worker 线程自己关闭
close.addEventListener('click', () => {
  worker.postMessage('close');
  console.log('Worker 线程自己关闭');
});

worker.addEventListener('message', e => {
  result.textContent = e.data;
  console.log('执行完毕');
});