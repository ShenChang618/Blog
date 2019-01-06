const button = document.querySelector('#button');

const blob = new Blob(
  Array.prototype.map.call(
    document.querySelectorAll('script[type="text/javascript-worker"]'),
    v => v.textContent,
  ),
  {
    type: 'text/javascript',
  },
);

// 通过 URL.createObjectURL 方法创建的 URL 就在本域中，因此是同源的
const url = window.URL.createObjectURL(blob);

// blob:http://localhost:3000/6d0e9210-6b28-4b49-82da-44739109cd2a
console.log(url);

const worker = new Worker(url);

button.addEventListener('click', () => {
  console.log('发送消息给嵌入式 Web Workers');
  worker.postMessage('send');
});

worker.addEventListener('message', e => {
  console.log('接收嵌入式 Web Workers 发送的消息：');
  console.log(e.data);
});