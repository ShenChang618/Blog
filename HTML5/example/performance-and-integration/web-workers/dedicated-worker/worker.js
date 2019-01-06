// 3. 监听主线程发送过来的消息
onmessage = e => {
  console.log('开始后台任务');
  const result= +e.data[0] + +e.data[1];
  console.log('计算结束');

  // 4. 返回计算结果到主线程
  postMessage(result);
};