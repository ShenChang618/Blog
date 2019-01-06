const number1 = document.querySelector('#number1');
const number2 = document.querySelector('#number2');
const button = document.querySelector('#button');
const result = document.querySelector('#result');

// 1. 指定脚本文件，创建 Worker 的实例
const worker = new Worker('./worker.js');

button.addEventListener('click', () => {
  // 2. 点击按钮，把两个数字发送给 Worker 线程
  worker.postMessage([number1.value, number2.value]);
});

// 5. 监听 Worker 线程返回的消息
// 我们知道事件有两种绑定方式，使用 addEventListener 方法和直接挂载到相应的实例
worker.addEventListener('message', e => {
  result.textContent = e.data;
  console.log('执行完毕');
});