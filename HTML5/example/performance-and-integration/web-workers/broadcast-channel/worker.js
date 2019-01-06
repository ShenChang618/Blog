const channel = new BroadcastChannel('channel');

channel.onmessage = e => {
  console.log('开始后台任务');
  const result= +e.data[0] + +e.data[1];
  console.log('计算结束');

  channel.postMessage(result);
};