onmessage = e => {
  if (typeof e.data === 'string' && e.data === 'close') {
    close();
    return;
  }

  console.log('开始后台任务');
  const result= +e.data[0] + +e.data[1];
  console.log('计算结束');

  postMessage(result);
};