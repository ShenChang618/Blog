onmessage = e => {
  // 利用未声明的变量触发错误
  console.log('Worker 线程利用未声明的 x 变量触发错误');
  postMessage(x * 10);
};