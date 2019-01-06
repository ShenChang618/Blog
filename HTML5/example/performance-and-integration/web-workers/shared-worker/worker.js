// 4. 通过 onconnect 事件监听端口连接
onconnect = function (e) {
  // 5. 使用事件对象的 ports 属性，获取端口
  const port = e.ports[0];

  // 6. 通过端口对象的 onmessage 事件监听主线程发送过来的消息，并隐式打开端口连接
  port.onmessage = function (e) {
    const result= e.data[0] * e.data[1];

    // 7. 通过端口对象返回结果到主线程
    port.postMessage(result);
  };
};