console.log('开始异步获取 worker.js 的内容');

fetch('http://localhost:3001/worker.js')
  .then(res => res.text())
  .then(text => {
    console.log('获取 worker.js 的内容成功');
    const worker = new Worker(
      window.URL.createObjectURL(
        new Blob(
          [text],
          {
            type: 'text/javascript',
          },
        ),
      ),
    );
  
  worker.postMessage('send');
  
  worker.addEventListener('message', e => {
    console.log(e.data);
    console.log('成功跨域');
  });
});