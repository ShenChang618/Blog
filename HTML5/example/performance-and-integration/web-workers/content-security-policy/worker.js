onmessage = e => {
  console.log('开始后台任务');
  // 转换成字符串
  // const result= eval(`${e.data[0]} + ${e.data[1]}`);
  const result= +e.data[0] + +e.data[1];
  console.log('计算结束');

  postMessage(result);
};