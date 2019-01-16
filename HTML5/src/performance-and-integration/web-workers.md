# 【深入吧，HTML 5】 性能 & 集成 —— Web Workers

## 版本
- 2019-01-16
  - 增加使用 `importScripts` 跨域时，使用相对路径报错的原因说明。

## 前言
JavaScript 采用的是单线程模型，也就是说，所有任务都要在一个线程上完成，一次只能执行一个任务。有时，我们需要处理大量的计算逻辑，这是比较耗费时间的，用户界面很有可能会出现假死状态，非常影响用户体验。这时，我们就可以使用 Web Workers 来处理这些计算。

Web Workers 是 HTML5 中定义的规范，它允许 JavaScript 脚本运行在主线程之外的后台线程中。这就为 JavaScript 创造了 [多线程](https://zh.wikipedia.org/wiki/%E5%A4%9A%E7%BA%BF%E7%A8%8B) 的环境，在主线程，我们可以创建 Worker 线程，并将一些任务分配给它。Worker 线程与主线程同时运行，两者互不干扰。等到 Worker 线程完成任务，就把结果发送给主线程。

> Web Workers 与其说创造了多线程环境，不如说是一种回调机制。毕竟 Worker 线程只能用于计算，不能执行更改 DOM 这些操作；它也不能共享内存，没有 [线程同步](https://baike.baidu.com/item/%E7%BA%BF%E7%A8%8B%E5%90%8C%E6%AD%A5) 的概念。

Web Workers 的优点是显而易见的，它可以使主线程能够腾出手来，更好的响应用户的交互操作，而不必被一些计算密集或者高延迟的任务所阻塞。但是，Worker 线程也是比较耗费资源的，因为它一旦创建，就一直运行，不会被用户的操作所中断；所以当任务执行完毕，Worker 线程就应该关闭。

## Web Workers API
一个 Worker 线程是由 `new` 命令调用 `Worker()` 构造函数创建的；构造函数的参数是：包含执行任务代码的脚本文件，引入脚本文件的 [URI](https://zh.wikipedia.org/wiki/%E7%BB%9F%E4%B8%80%E8%B5%84%E6%BA%90%E6%A0%87%E5%BF%97%E7%AC%A6) 必须遵守 **同源策略**。

Worker 线程与主线程不在同一个全局上下文中，因此会有一些需要注意的地方：
- 两者不能直接通信，必须通过消息机制来传递数据；并且，数据在这一过程中会被复制，而不是通过 Worker 创建的实例共享。详细介绍可以查阅 [worker中数据的接收与发送：详细介绍](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Using_web_workers#worker%E4%B8%AD%E6%95%B0%E6%8D%AE%E7%9A%84%E6%8E%A5%E6%94%B6%E4%B8%8E%E5%8F%91%E9%80%81%EF%BC%9A%E8%AF%A6%E7%BB%86%E4%BB%8B%E7%BB%8D)。
- 不能使用 DOM、`window` 和 `parent` 这些对象，但是可以使用与主线程全局上下文无关的东西，例如 `WebScoket`、`indexedDB` 和 `navigator` 这些对象，更多能够使用的对象可以查看[Web Workers可以使用的函数和类](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Functions_and_classes_available_to_workers)。

## 工作流程
1. 在构造函数中传入脚本文件地址进行实例化的过程中，会通过异步的方式来加载这个文件，因此并不会阻塞后续代码的运行。此时，如果脚本文件不存在，Worker 只会 **静默失败**，并不会抛出异常。
2. 在主线程向 Worker 线程发送消息时，会通过 **中转对象** 将消息添加到 Worker 线程对应 `WorkerRunLoop` 的消息队列中；此时，如果 Worker 线程还未创建，那么消息会先存放在临时消息队列，等待 Worker 线程创建后再转移到 `WorkerRunLoop` 的消息队列中；否则，直接将消息添加到 `WorkerRunLoop` 的消息队列中。

Worker 线程向主线程发送的消息也会通过 **中转对象** 进行传递；因此，总得来讲 Worker 的工作机制就是通过 **中转对象** 来实现消息的传递，再通过 `message` 事件来完成消息的处理。

## 使用方式
Web Workers 规范中定义了两种不同类型的线程：
- Dedicated Worker（专用线程），它的全局上下文是 [DedicatedWorkerGlobalScope](https://developer.mozilla.org/zh-CN/docs/Web/API/DedicatedWorkerGlobalScope) 对象，只能在一个页面使用。
- Shared Worker（共享线程），它的全局上下文是 [SharedWorkerGlobalScope](https://developer.mozilla.org/zh-CN/docs/Web/API/SharedWorkerGlobalScope) 对象，可以被多个页面共享。

<!-- 下面我来简单介绍一下使用方式，更多诸如终止 Worker、错误处理的 API 可以查看 [使用 Web Workers](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Using_web_workers)。 -->

### 专用线程
下面代码最重要的部分在于两个线程之间怎么发送和接收消息，它们都是使用 `postMessage` 方法发送消息，使用 `onmessage` 事件进行监听。区别是：在主线程中，`onmessage` 事件和 `postMessage` 方法必须挂载在 Worker 的实例上；而在 Worker 线程，Worker 的实例方法本身就是挂载在全局上下文上的。

[Demo](https://github.com/Sam618/Blog/raw/master/HTML5/example/performance-and-integration/web-workers/dedicated-worker)

```HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Web Workers 专用线程</title>
</head>
<body>
  <input type="text" name="" id="number1">
  <span>+</span>
  <input type="text" name="" id="number2">
  <button id="button">确定</button>
  <p id="result"></p>

  <script src="./main.js"></script>
</body>
</html>
```

```JavaScript
// main.js

const number1 = document.querySelector("#number1");
const number2 = document.querySelector("#number2");
const button = document.querySelector("#button");
const result = document.querySelector("#result");

// 1. 指定脚本文件，创建 Worker 的实例
const worker = new Worker("./worker.js");

button.addEventListener("click", () => {
  // 2. 点击按钮，把两个数字发送给 Worker 线程
  worker.postMessage([number1.value, number2.value]);
});

// 5. 监听 Worker 线程返回的消息
// 我们知道事件有两种绑定方式，使用 addEventListener 方法和直接挂载到相应的实例
worker.addEventListener("message", e => {
  result.textContent = e.data;
  console.log("执行完毕");
})
```

```JavaScript
// worker.js

// 3. 监听主线程发送过来的消息
onmessage = e => {
  console.log("开始后台任务");
  const result= +e.data[0]+ +e.data[1];
  console.log("计算结束");

  // 4. 返回计算结果到主线程
  postMessage(result);
}
```

### 共享线程
共享线程虽然可以在多个页面共享，但是必须遵守同源策略，也就是说只能在相同协议、主机和端口号的网页使用。

示例基本上与专用线程的类似，区别是：
- 创建实例的构造器不同。
- 主线程与共享线程通信，必须通过一个确切打开的端口对象；在传递消息之前，两者都需要通过 `onmessage` 事件或者显式调用 `start` 方法打开端口连接。而在专用线程中这一部分是自动执行的。

> 端口对象会被上文所讲的 **中转对象（WorkerMessagingProxy）** 调用，由 **中转对象** 来决定哪个发送者对应哪个接收者，具体的流程可以看 [Web Worker在WebKit中的实现机制](https://blog.csdn.net/codigger/article/details/40581343)。

[Demo](https://github.com/Sam618/Blog/raw/master/HTML5/example/performance-and-integration/web-workers/shared-worker)

```JavaScript
// main.js

const number1 = document.querySelector("#number1");
const number2 = document.querySelector("#number2");
const button = document.querySelector("#button");
const result = document.querySelector("#result");

// 1. 创建共享实例
const worker = new SharedWorker("./worker.js");

// 2. 通过端口对象的 start 方法显式打开端口连接，因为下文没有使用 onmessage 事件
worker.port.start();

button.addEventListener("click", () => {
  // 3. 通过端口对象发送消息
  worker.port.postMessage([number1.value, number2.value]);
});

// 8. 监听共享线程返回的结果
worker.port.addEventListener("message", e => {
  result.textContent = e.data;
  console.log("执行完毕");
});
```

```JavaScript
// worker.js

// 4. 通过 onconnect 事件监听端口连接
onconnect = function (e) {
  // 5. 使用事件对象的 ports 属性，获取端口
  const port = e.ports[0];

  // 6. 通过端口对象的 onmessage 事件监听主线程发送过来的消息，并隐式打开端口连接
  port.onmessage = function (e) {
    console.log("开始后台任务");
    const result= e.data[0] * e.data[1];
    console.log("计算结束");
    console.log(this);

    // 7. 通过端口对象返回结果到主线程
    port.postMessage(result);
  }
}
```

### 终止 Worker
如果不需要 Worker 继续运行，我们可以在主线程中调用 Worker 实例的 `terminate` 方法或者使用 Worker 线程的 `close` 方法来终止 Worker 线程。

[Demo](https://github.com/Sam618/Blog/raw/master/HTML5/example/performance-and-integration/web-workers/close-worker)

```JavaScript
// main.js

const number1 = document.querySelector('#number1');
const number2 = document.querySelector('#number2');
const button = document.querySelector('#button');
const terminate = document.querySelector('#terminate');
const close = document.querySelector('#close');
const result = document.querySelector('#result');

const worker = new Worker('./worker.js');

button.addEventListener('click', () => {
  worker.postMessage([number1.value, number2.value]);
});

// 主线程中终止 Worker 线程
terminate.addEventListener('click', () => {
  worker.terminate();
  console.log('主线程中终止 Worker 线程');
});

// 发送消息让 Worker 线程自己关闭
close.addEventListener('click', () => {
  worker.postMessage('close');
  console.log('Worker 线程自己关闭');
});

worker.addEventListener('message', e => {
  result.textContent = e.data;
  console.log('执行完毕');
});
```

```JavaScript
// worker.js

onmessage = e => {
  if (typeof e.data === 'string' && e.data === 'close') {
    close();
    return;
  }

  console.log('开始后台任务');
  const result= +e.data[0]+ +e.data[1];
  console.log('计算结束');

  postMessage(result);
};
```

### 处理错误
当 Worker 线程在运行过程中发生错误时，我们在主线程通过 Worker 实例的 `error` 事件可以接收到 Worker 线程抛出的错误；`error` 事件的回调函数会返回 `ErrorEvent` 对象，我们主要关心它的三个属性：

- `filename`，发生错误的脚本文件名。
- `lineno`，发生错误时所在脚本文件的行号。
- `message`，可读性良好的错误消息。

[Demo](https://github.com/Sam618/Blog/raw/master/HTML5/example/performance-and-integration/web-workers/handling-errors)

```JavaScript
// main.js

const button = document.querySelector('#button');

const worker = new Worker('./worker.js');

button.addEventListener('click', () => {
  console.log('主线程发送消息，让 Worker 线程触发错误');
  worker.postMessage('send');
});

worker.addEventListener('error', e => {
  console.log('主线程接收错误，错误消息：');
  console.log('filename:', e.filename);
  console.log('lineno:', e.lineno);
  console.log('message:', e.message);
});
```

```JavaScript
// worker.js

onmessage = e => {
  // 利用未声明的变量触发错误
  console.log('Worker 线程利用未声明的 x 变量触发错误');
  postMessage(x * 10);
};
```

### 生成 Sub Worker
Worker 线程本身也能创建 Worker，这样的 Worker 线程被称为 Sub Worker，它们必须与当前页面同源。另外，在创建 Sub Worker 时传入的地址是相对与当前 Worker 线程而不是页面地址，因为这样有助于记录依赖关系。

[Demo](https://github.com/Sam618/Blog/raw/master/HTML5/example/performance-and-integration/web-workers/sub-worker)

```JavaScript
// main.js

const button = document.querySelector('#button');

const worker = new Worker('./worker.js');

button.addEventListener('click', () => {
  console.log('主线程发送消息给 Worker 线程');
  worker.postMessage('send');
});

worker.addEventListener('message', e => {
  console.log('主线程接收到 Worker 线程回复的消息');
});
```

```JavaScript
// worker.js

onmessage = e => {
  console.log('Worker 线程接收到主线程发送的消息');
  const subWorker = new Worker('./sub-worker.js');
  console.log('Worker 线程发送消息给 Sub Worker 线程');
  subWorker.postMessage('send');
  subWorker.addEventListener('message', () => {
    console.log('Worker 线程接收到 Sub Worker 线程回复的消息');
    console.log('Worker 线程回复消息给主线程');

    postMessage('reply');
  })
};
```

```JavaScript
// sub-worker.js

self.addEventListener('message', e => {
  console.log('Sub Worker 线程接收到 Worker 线程的发送消息');
  console.log('Sub Worker 线程回复消息给 Worker 线程，并销毁自身')
  self.postMessage('reply');
  self.close();
})
```

### 引入脚本
Worker 线程中提供了 `importScripts` 函数来引入脚本，该函数接收零个或者多个 URI；需要注意的是，无论引入的资源是何种类型的文件，`importScripts` 都会将这个文件的内容当作 `JavaScript` 进行解析。

`importScripts` 的加载过程和 `<script>` 标签类似，因此使用这个函数引入脚本并 **不存在跨域问题**。在脚本下载时，它们的下载顺序并不固定；但是，在执行时，脚本还是会按照书写的顺序执行；并且，这一系列过程都是 **同步** 进行的。加载成功后，每个脚本中的全局上下文都能够在 Worker 线程中使用；另外，如果脚本无法加载，将会抛出错误，并且之后的代码也无法执行了。

[Demo](https://github.com/Sam618/Blog/raw/master/HTML5/example/performance-and-integration/web-workers/import-scripts)

```JavaScript
// main.js

const button = document.querySelector('#button');

const worker = new Worker('./worker.js');

button.addEventListener('click', () => {
  worker.postMessage('send');
});

worker.addEventListener('message', e => {
  console.log('接收到 Worker 线程发送的消息：');
  console.log(e.data);
});
```

```JavaScript
// worker.js

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
```

```JavaScript
// import-script.js

console.log('在 import-script 中测试同步');
postMessage('我在 importScripts 引入的脚本中');

self.addProp = '在全局上下文中增加 addProp 属性';
```

## 嵌入式 Web Workers
嵌入式 Web Workers 本质上就是把代码当作字符串处理；如果是字符串我们可存放的地方就太多了，可以放在 `JavaScript` 的变量中、利用函数的 `toString` 方法能够输出本函数所有代码的字符串的特性、放在 `type` 没有被指定可运行的 `mime-type` 的 `<script>` 标签中等等。

但是，我们会发现一个问题，字符串怎么当作一个地址传入 Worker 的构造器呢？有什么 API 能够生成 URL 呢？`URL.createObjectURL` 方法可以，可是这个 API 能够接收字符串吗？[查阅文档](https://developer.mozilla.org/zh-CN/docs/Web/API/URL/createObjectURL)，我们知道这个方法接收一个 [`Blob` 对象](https://developer.mozilla.org/zh-CN/docs/Web/API/Blob)，这个对象实例在创建时，第一个参数允许接收字符串，第二个参数接收一个配置对象，其中的 `type` 属性能够指定生成的对象实例的类型。现在，我们已经知道了嵌入式 Web Workers 的工作原理，接下来，我们通过 [Demo](https://github.com/Sam618/Blog/raw/master/HTML5/example/performance-and-integration/web-workers/import-scripts) 来看下代码：

```HTML
<!-- index.html -->

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>嵌入式 Web Workers</title>
</head>
<body>
  <button id="button">发送消息</button>

  <script type="text/javascript-worker">
    self.addEventListener('message', e => {
      postMessage('我在嵌入式的 Web Workers 中');
    });
  </script>
  <script src="./main.js"></script>
</body>
</html>
```

```JavaScript
// mian.js

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
```

## 数据通讯
Worker 线程和主线程进行通信，除了使用上面例子中 Worker 实例的 `postMessage` 方法之外，还可以使用 [Broadcast Channel（广播通道）](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)。

### Broadcast Channel（广播通道）
Broadcast Channel 允许我们在同源的所有上下文中发送和接收消息，包括浏览器标签页、iframe 和 Web Workers。需要注意的是这个 API 的兼容性并不好，在 [caniuse](https://caniuse.com/#feat=broadcastchannel) 中我们可以查看浏览器的支持情况。另外，下图能帮助我们更好的理解 Broadcast Channel 的通信过程：

![Broadcast Channel Communication process](https://github.com/Sam618/Blog/raw/master/HTML5/assets/broadcast-channel.png)

这个 API 的使用方法与 Web Workers 类似，发送和接收也是通过实例的 `postMessage` 方法和 `message` 事件；不同在于构造器是 `BroadcastChannel`，并且它会接收一个频道名称字符串；有着相同频道名称的 `Broadcast Channel` 实例在同一个广播通道中，因此，它们可以相互通信。

[Demo](https://github.com/Sam618/Blog/raw/master/HTML5/example/performance-and-integration/web-workers/broadcast-channel)

```JavaScript
// main.js

const number1 = document.querySelector('#number1');
const number2 = document.querySelector('#number2');
const button = document.querySelector('#button');
const close = document.querySelector('#close');
const result = document.querySelector('#result');

const worker = new Worker('./worker.js');
const channel = new BroadcastChannel('channel');

button.addEventListener('click', () => {
  channel.postMessage([number1.value, number2.value]);
});

// 销毁 BroadcastChannel，之后再发送消息会抛出错误
close.addEventListener('click', () => {
  console.log('销毁 BroadcastChannel，之后再发送消息会抛出错误');
  channel.close();
});

channel.addEventListener('message', e => {
  result.textContent = e.data;
  console.log('执行完毕');
});
```

```JavaScript
// worker.js

const channel = new BroadcastChannel('channel');

channel.onmessage = e => {
  console.log('开始后台任务');
  const result= +e.data[0]+ +e.data[1];
  console.log('计算结束');

  channel.postMessage(result);
};
```

### 消息机制
在 Web Workers 中根据不同的消息格式，有两种发送消息的方式：

- 拷贝消息（Copying the message）：这种方式下消息会被序列化、拷贝然后再发送出去，接收方接收后则进行反序列化取得消息；这与我们使用 `JSON.stringify` 方法把 `JSON` 数据转换成字符串，再通过 `JSON.parse` 方法进行解析是一样的过程，只不过浏览器自动帮我们做了这些工作。经过编码/解码的过程后，我们知道主线程和 Worker 线程并不会共用一个消息实例，它们每次通信都会创建消息副本；这样一来，传递的 **消息越大**，**时间开销就越多**。另外，不同的浏览器实现会有所差别，并且旧版本还有兼容问题，因此比较推荐 **手动** 编码成 **字符串** /解码成序列化数据来传递复杂格式的消息。
- 转移消息（Transferring the message）：这种方式传递的是 [可转让对象](https://html.spec.whatwg.org/multipage/structured-data.html#transferable-objects)，可转让对象从一个上下文转移到另一个上下文并不会经过任何拷贝操作；因此，一旦对象转让，那么它在原来上下文的那个版本将不复存在，该对象的所有权被转让到新的上下文内；这意味着消息发送者一旦发送消息，就再也无法使用发出的消息数据了。这样的消息传递几乎是瞬时的，在传递大数据时会获得极大的性能提升。

我们通过 [Demo](https://github.com/Sam618/Blog/raw/master/HTML5/example/performance-and-integration/web-workers/transferable-objects) 来观察下两者的时间差异：

![Transferable performance](https://github.com/Sam618/Blog/raw/master/HTML5/assets/transferable-performance.png)

10 次比较都使用了相同的数据（1024 * 1024 * 32），0 列表示拷贝消息，1 列表示转移消息；可以发现转移消息损失的时间基本可以忽略不计，而拷贝消息消耗的时间非常的大；因此，我们在传递消息时，如果数据比较小，可以直接使用拷贝消息，但是如果数据非常大，那最好使用可转让对象进行消息转移。

## 跨域
Worker 在实例化时必须传入同源脚本的地址，否则就会报跨域错误：

![Cross domain error](https://github.com/Sam618/Blog/raw/master/HTML5/assets/cross-domain.png)

很多时候，我们都需要把脚本放在 CDN 上面，很容易出现跨域问题，有什么办法能避免跨域呢？

### 异步
我们看完上文后知道 **嵌入式 Web Workers** 的本质就是利用了字符串，那我们通过异步的方式先获取到 `JavaScript` 文件的内容，然后再生成同源的 URL，这样 Worker 的构造器自然就能顺利运行了；因此，这种方案主要需要解决的问题是异步跨域；异步跨域最简单的方式莫过于使用 [CORS](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Access_control_CORS) 了，我们来看下 [Demo](https://github.com/Sam618/Blog/raw/master/HTML5/example/performance-and-integration/web-workers/cross-domain-cors)（本地的两个 `server*.js` 都要通过 `node` 运行）。

```JavaScript
// main.js
// localhost:3000

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
```

```JavaScript
// worker.js
// localhost:3001

onmessage = e => {
  postMessage('我在 Worker 中');
};
```

### `importScripts`
这种方式实际上也是 **嵌入式 Web Workers**，不过利用了 `importScripts` 引入脚本没有跨域问题这一特性；首先我们生成引入脚本的代码字符串，然后创建同源的 URL，最后运行 Worker 线程；此时，**嵌入式 Web Workers** 执行 `importScripts` 引入了跨域的脚本，最终的执行效果就跟放在同源一样了。

[Demo](https://github.com/Sam618/Blog/raw/master/HTML5/example/performance-and-integration/web-workers/cross-domain-import-scripts)

```JavaScript
// main.js

// 代码字符串
const proxyScript = `importScripts('http://localhost:3001/worker.js')`;
console.log('生成代码字符串');
const proxyURL = window.URL.createObjectURL(
  new Blob(
    [proxyScript],
    {
      type: 'text/javascript',
    },
  ),
);
// blob:http://localhost:3000/cb45199f-ca39-4800-8bfd-1c16b97c8910
console.log(proxyURL);
console.log('生成同源 URL');
const worker = new Worker(proxyURL);

worker.postMessage('send');

worker.addEventListener('message', e => {
  console.log(e.data);
  console.log('成功跨域');
});
```

```JavaScript
// worker.js

onmessage = e => {
  postMessage('我在 Worker 中');
};
```

#### 相对路径
另外，在使用这个方法跨域时，如果通过 `importScripts` 函数使用相对路径的脚本，会有报错，提示我们脚本没有加载成功。

![Cross domain error](https://github.com/Sam618/Blog/raw/master/HTML5/assets/cross-domain-error.png)

出现这个报错的原因在于通过 `window.URL.createObjectURL` 生成的 `blob` 链接，指向的是内存中的数据，这些数据只为当前页面提供服务，因此，在浏览器的地址栏中访问 `blob` 链接，并不会找到实际的文件；同样的，我们在 `blob` 链接指向的内存数据中访问相对地址，肯定是找不到任何东西的。

所以，如果想要在这种场景中访问文件，那我们必须向服务器发送 HTTP 请求来获取数据。

### 总结
到此为止，我们已经对 Worker 有了深入的了解，知道了它的作用、使用方式和限制；在真实的场景中，我们也就能够针对最适合的业务使用正确的方式进行使用和规避限制了。

最后，我们可以畅想一下 Web Workers 的使用场景：
- 在 React 中使用 Web Workers，可以通过这篇 [文章](https://www.zcfy.cc/article/using-webworkers-to-make-react-faster) 了解。
- [redux-worker](https://github.com/chikeichan/redux-worker)，使用 Web Workers 把计算函数放到后台线程运行，具体介绍可以看 [这里](https://zhuanlan.zhihu.com/p/28525821)。
- [Angular WebWorker Renderer](https://github.com/angular/angular/tree/master/packages/platform-webworker)，解密文章 [一](https://zhuanlan.zhihu.com/p/28365967)、[二](https://zhuanlan.zhihu.com/p/28366193)。
- 代码编辑器，例如 [Monaco Editor](https://microsoft.github.io/monaco-editor/)。

还有好多应用场景，可以看参考资料中的文章进行了解。

## 参考资料
1. [优化 JavaScript 执行 —— 降低复杂性或使用 Web Worker](https://developers.google.com/web/fundamentals/performance/rendering/optimize-javascript-execution#web_worker)
2. [使用 Web Workers](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Using_web_workers)
3. [深入 HTML5 Web Worker 应用实践：多线程编程](https://www.ibm.com/developerworks/cn/web/1112_sunch_webworker/index.html)
4. [JS与多线程](https://fed.renren.com/2017/05/21/js-threads/)
5. [【转向Javascript系列】深入理解Web Worker](http://www.alloyteam.com/2015/11/deep-in-web-worker/)
6. [Web Worker在WebKit中的实现机制](https://blog.csdn.net/codigger/article/details/40581343)
7. [广播频道-BroadcastChannel](http://www.zhangyunling.com/772.html)
8. [聊聊 webworker](https://juejin.im/entry/591946e0da2f60005df4ce5b)
9. [[译] JavaScript 工作原理：Web Worker 的内部构造以及 5 种你应当使用它的场景](https://juejin.im/post/5a90233bf265da4e92683de3)
10. [HTML5 Web Worker是利器还是摆设](http://www.qttc.net/201501457.html)
11. [[译文]web workers到底有多快？](http://www.alloyteam.com/2015/08/web-worker/)