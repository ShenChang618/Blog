onmessage = e => {
  console.log('Worker 线程接收到引入脚本指令');
  // importScripts('import-script.js');
  // importScripts('import-script2.js');
  // importScripts('import-script3.js');
  importScripts('import-script.js', 'import-script2.js', 'import-script3.js');
  importScripts('import-script-text.txt');

  // 跨域
  importScripts('https://cdn.bootcss.com/moment.js/2.23.0/moment.min.js');
  console.log(moment().format());

  // 加载异常，后面的代码也无法执行了
  // importScripts('http://test.com/import-script-text.txt');

  console.log(self);
  console.log('在 Worker 中测试同步');
};