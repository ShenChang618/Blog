const number1 = document.querySelector('#number1');
const number2 = document.querySelector('#number2');
const button = document.querySelector('#button');
const close = document.querySelector('#close');
const result = document.querySelector('#result');

const worker = new Worker('./worker.js');
const channel = new BroadcastChannel('channel');

button.addEventListener('click', () => {
  channel.postMessage([number1.value, number2.value]);
});

// 销毁 BroadcastChannel，之后再发送消息会抛出错误
close.addEventListener('click', () => {
  console.log('销毁 BroadcastChannel，之后再发送消息会抛出错误');
  channel.close();
});

channel.addEventListener('message', e => {
  result.textContent = e.data;
  console.log('执行完毕');
});