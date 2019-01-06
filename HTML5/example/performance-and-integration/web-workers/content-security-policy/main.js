const number1 = document.querySelector('#number1');
const number2 = document.querySelector('#number2');
const button = document.querySelector('#button');
const result = document.querySelector('#result');

// const worker = new Worker('./worker.js');

// 报错
console.log(eval(1 + 2));

// button.addEventListener('click', () => {
//   worker.postMessage([number1.value, number2.value]);
// });

// worker.addEventListener('message', e => {
//   result.textContent = e.data;
//   console.log('执行完毕');
// });