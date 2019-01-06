console.log('在 import-script 中测试同步');
postMessage('我在 importScripts 引入的脚本中');

self.addProp = '在全局上下文中增加 addProp 属性';