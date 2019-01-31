# 【深入吧，HTML 5】 性能 & 集成 —— History API

[博客](https://github.com/Sam618/Blog) 有更多精品文章哟。

## 前言
在深入了解 History API 之前，我们需要讨论一下前端路由；路由指的是通过不同 URL 展示不同页面或者内容的功能，这个概念最初是由后端提出的，因此，在传统的 Web 开发模式中，路由都是服务器来控制和管理的。

既然已经有了后端路由，为什么还需要前端路由呢？我们知道跳转页面实际上就是为了展示那个页面的内容，那么无论是选择 AJAX 异步的方式获取数据还是将页面内容保存在本地，都是为了让页面之间的交互不必每次都刷新页面，这样用户体验会有极大的提升，也就能被称为 **SPA**（单页面应用）了；但是，不够完美，因为这种场景下缺少路由功能，所以会导致用户多次获取页面之后，不小心刷新当前页面，会直接退回到页面的 **初始状态**，用户体验极差。

那么前端路由是怎样解决改变页面内容的同时改变 URL 并保持页面不刷新呢？这就引出了我们这篇文章的主题：**History API**。

## History API
DOM `window` 对象通过 `history` 对象提供了对 **当前会话**（标签页或者 `frame`）浏览历史的访问，在 HTML4 的时候我们已经能够操纵浏览历史向前或向后跳转了；当时，我们能够使用的属性和方法有下面这些：

- `window.history.length`：返回当前会话浏览过的页面数量。
- `window.history.go(?delta)`：接受一个整数作为参数，按照当前页面在会话浏览历史记录中的位置为基准进行移动。如果参数为 0 或 undefined、null、false，将刷新页面，相当于执行 `window.location.reload()`。如果在运行这个方法的过程中，发现移动后会超出会话浏览历史记录的边界时，将没有任何效果，并且也不会报错。
- `window.history.back()`：移动到上一页，相当于点击浏览器的后退按钮，等价于 `window.history.go(-1)`。
- `window.history.forward()`：移动到下一页，相当于点击浏览器的前进按钮，等价于 `window.history.go(1)`。

> `window.history.back()` 和 `window.history.forward()` 就是通过 `window.history.go(?delta)` 实现的，因此，如果没有上一页或者下一页，那表示会超出边界，所以它们的处理方式和 `window.history.go(?delta)` 是一样的。

HTML4 的时候并没有能够改变 URL 的 API；但是，从 HTML5 开始，History API 新增了操作会话浏览历史记录的功能。以下是新增的属性和方法：

- `window.history.state`：这个参数是只读的，表示与会话浏览历史的当前记录相关联的状态对象。
- `window.history.pushState(data, title, ?url)`：在会话浏览历史记录中添加一条记录。以下是方法的参数详情：
  - `data`（状态对象）：是一个能被序列化的任何东西，例如 object、array、string、null 等。为了方便用户重新载入时使用，状态对象会在序列化之后保存在本地；此外，**序列化之后** 的状态对象根据浏览器的不同有不一样的大小限制（注意：[规范](https://html.spec.whatwg.org/multipage/history.html#dom-history-pushstate) 并没有说需要限制大小），如果超出，将会抛出异常。
  - `title`（页面标题）：当前所有的浏览器都会忽略这个参数，因此可以置为空字符串。
  - `url`（页面地址）：如果新的 URL 不是绝对路径，那么将会相对于当前 URL 处理；并且，新的 URL 必须与当前 URL **同源**，否则将抛出错误。另外，该参数是可选的，默认为当前页面地址。
- `window.history.replaceState(data, title, ?url)`：与 `window.history.pushState(data, title, ?url)` 类似，区别在于 `replaceState` 将修改会话浏览历史的当前记录，而不是新增一条记录；但是，需要注意：调用 `replaceState` 方法还是会在 **全局** 浏览历史记录中创建新记录 。

调用 `pushState` 和 `replaceState` 方法之后，地址栏会更改 URL，却不会立即加载新的页面，等到用户重新载入时，才会真正进行加载。因此，**同源的目的** 是为了防止恶意代码让用户以为自己处于另一个页面。

### `popstate` 事件
每当用户导航会话浏览历史的记录时，就会触发 `popstate` 事件；例如，用户点击浏览器的倒退和前进按钮；当然这些操作在 JavaScript 中也有对应的 `window.history.back()`、`window.history.forward()` 和 `window.history.go(?delta)` 方法能够达到同样的效果。

![User navigation](https://github.com/Sam618/Blog/raw/master/HTML5/assets/user-navigation.png)

如果导航到的记录是由 `window.history.pushState(data, title, ?url)` 创建或者 `window.history.replaceState(data, title, ?url)` 修改的，那么 `popstate` 事件对象的 `state` 属性将包含导航到的记录的状态对象的一个 **拷贝**。

![Jump to pushState](https://github.com/Sam618/Blog/raw/master/HTML5/assets/jump-to-pushState.gif)

另外，如果用户在地址栏中 **手动** 修改 `hash` 或者通过写入 `window.location.hash` 的方式来 **模拟用户** 行为，那么也会触发 `popstate` 事件，并且还会在会话浏览历史中新增一条记录。需要注意的是，在调用 `window.history.pushState(data, title, ?url)` 时，如果 `url` 参数中有 `hash`，并不会触发这一条规则；因为我们要知道，`pushState` 只是导致会话浏览历史的记录发生变化，让地址栏有所反应，并不是 **用户导航** 或者通过脚本来 **模拟用户** 的行为。

![Jump to hash](https://github.com/Sam618/Blog/raw/master/HTML5/assets/jump-to-hash.gif)

### 获取当前状态对象
在介绍 HTML5 中 `history` 对象新增的属性和方法时，有说道 `window.history.state` 属性，通过它我们也能得到 `popstate` 事件触发时获取的状态对象。

在用户重新载入页面时，`popstate` 事件并不会触发，因此，想要获取会话浏览历史的当前记录的状态对象，只能通过 `window.history.state` 属性。

## Location 对象
Location 对象提供了 URL 相关的信息和操作方法，通过 `document.location` 和 `window.location` 属性都能访问这个对象。

History API 和 Location 对象实际上是通过地址栏中的 **URL 关联** 的，因为 Location 对象的值始终与地址栏中的 URL 保持一致，所以当我们操作会话浏览历史的记录时，Location 对象也会随之更改；当然，我们修改 Location 对象，也会触发浏览器执行相应操作并且改变地址栏中的 URL。

### 属性
Location 对象提供以下属性：
- `window.location.href`：完整的 URL；`http://username:password@www.test.com:8080/test/index.html?id=1&name=test#test`。
- `window.location.protocol`：当前 URL 的协议，包括 `:`；`http:`。
- `window.location.host`：主机名和端口号，如果端口号是 `80`（http）或者 `443`（https），那就会省略端口号，因此只会包含主机名；`www.test.com:8080`。
- `window.location.hostname`：主机名；`www.test.com`。
- `window.location.port`：端口号；`8080`。
- `window.location.pathname`：URL 的路径部分，从 `/` 开始；`/test/index.html`。
- `window.location.search`：查询参数，从 `?` 开始；`?id=1&name=test`。
- `window.location.hash`：片段标识符，从 `#` 开始；`#test`。
- `window.location.username`：域名前的用户名；`username`。
- `window.location.password`：域名前的密码；`password`。
- `window.location.origin`：只读，包含 URL 的协议、主机名和端口号；`http://username:password@www.test.com:8080`。

除了 `window.location.origin` 之外，其他属性都是可读写的；因此，改变属性的值能让页面做出相应变化。例如对 `window.location.href` 写入新的 URL，浏览器就会立即跳转到相应页面；另外，改变 `window.location` 也能达到同样的效果。

```javascript
// window.location = 'https://www.example.com';
window.location.href = 'https://www.example.com';
```

需要注意的是，如果想要在同一标签页下的不同 `frame`（例如父窗口和子窗口）之间 **跨域** 改写 URL，那么只能通过 `window.location.href` 属性，其他的属性写入都会抛出跨域错误。

[Demo](https://github.com/Sam618/Blog/raw/master/HTML5/example/performance-and-integration/history-api/cross-domain)

![window.location.href cross domain](https://github.com/Sam618/Blog/raw/master/HTML5/assets/window-location-href-cross-domain.png)

![window.location.href cross domain error](https://github.com/Sam618/Blog/raw/master/HTML5/assets/window-location-href-cross-domain-error.png)

#### 改变 `hash`

改变 `hash` 并不会触发页面跳转，因为 `hash` 链接的是当前页面中的某个片段，所以如果 `hash` 有变化，那么页面将会滚动到 `hash` 所链接的位置；当然，页面中如果 **不存在** `hash` 对应的片段，则没有 **任何效果**。这和 `window.history.pushState(data, title, ?url)` 方法非常类似，都能在不刷新页面的情况下更改 URL；因此，我们也可以使用 `hash` 来实现前端路由，但是 `hash` 相比 `pushState` 来说有以下缺点：

- `hash` 只能修改 URL 的片段标识符部分，并且必须从 `#` 开始；而 `pushState` 却能修改路径、查询参数和片段标识符；因此，在新增会话浏览历史的记录时，`pushState` 比起 `hash` 来说更符合以前后端路由的访问方式，也更加优雅。

  ```
  // hash
  http://www.example.com/#/example

  // pushState
  http://www.example.com/example
  ```

- `hash` 必须与原先的值不同，才能新增会话浏览历史的记录；而 `pushState` 却能新增相同 URL 的记录。
- `hash` 想为新增的会话浏览历史记录关联数据，只能通过字符串的形式放入 URL 中；而 `pushState` 方法却能关联所有能被序列化的数据。
- `hash` 不能修改页面标题，虽然 `pushState` 现在设置的标题会被浏览器忽略，但是并不代表以后不会支持。

##### `hashchange` 事件
我们可以通过 `hashchange` 事件监听 `hash` 的变化，这个事件会在用户导航到有 `hash` 的记录时触发，它的事件对象将包含 `hash` 改变前的 `oldURL` 属性和 `hash` 改变后的 `newURL` 属性。

另外，`hashchange` 事件与 `popstate` 事件一样也不会通过 `window.history.pushState(data, title, ?url)` 触发。

![hashchange](https://github.com/Sam618/Blog/raw/master/HTML5/assets/hashchange.gif)

### 方法
Location 对象提供以下方法：

- `window.location.assign(url)` 方法接受一个 URL 字符串作为参数，使得浏览器立刻跳转到新的 URL。

  ```JavaScript
  document.location.assign('http://www.example.com');
  // or
  // document.location = 'http://www.example.com';
  ```

- `window.location.replace(url)` 方法与`window.location.assign(url)` 实现一样的功能，区别在于 `replace` 方法执行后跳转的 URL 会 **覆盖** 浏览历史中的当前记录，因此原先的当前记录就在浏览历史中 **删除** 了。
- `window.location.reload(boolean)` 方法使得浏览器重新加载当前 URL。如果该方法没有接受值或值为 `false`，那么就相当于用户点击浏览器的刷新按钮，这将导致浏览器 **拉取缓存** 中的页面；当然，如果没有缓存，那就会像执行 `window.location.reload(true)` 一样，**重新请求** 页面。
- `window.location.toString()` 方法返回整个 URL 字符串。

  ```JavaScript
  window.location.toString();
  // or
  // window.location.href;
  ```

## 路由实现
在使用 History API 实现路由时，我们要注意这个 API 里的方法（`pushState` 和 `replaceState`）在改变 URL 时，并不会触发事件；因此想要像 `hash` 一样 **只通过** 事件（`hashchange`）实现路由是不太可能了。

既然如此，我们就需要知道哪些方式能够触发 URL 的更新了；在单页面应用中，URL 改变只能由下面三种情况引起：

1. 点击浏览器的前进或后退按钮。
2. 点击 `a` 标签。
3. 调用 `pushState` 或者 `replaceState` 方法。

对于用户手动点击浏览器的前进或后退按钮的操作，通过监听 `popstate` 事件，我们就能知道 URL 是否改变了；点击 `a` 标签实际上也是调用了 `pushState` 或者 `replaceState` 方法，只不过因为 `a` 标签会有 **默认行为**，所以需要阻止它，以避免进行跳转。

[Demo](https://github.com/Sam618/Blog/raw/master/HTML5/example/performance-and-integration/history-api/router)

```html
<!-- index.html -->

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>前端路由实现</title>
  <style>
    .link {
      color: #00f;
      cursor: pointer;
    }
    .link:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <ul>
    <li><a class="link" data-href="/111">111</a></li>
    <li><a class="link" data-href="/222">222</a></li>
    <li><a class="link" data-href="/333">333</a></li>
  </ul>

  <div id="content"></div>

  <script src="./router.js"></script>
  <script>
    // 创建实例
    const router = new Router();
    const contentDOM = document.querySelector('#content');
    // 注册路由
    router.route('/111', state => {
      contentDOM.innerHTML = '111';
    });
    router.route('/222', state => {
      contentDOM.innerHTML = '222';
    });
    router.route('/333', state => {
      contentDOM.innerHTML = '333';
    });
  </script>
</body>
</html>
```

```JavaScript
// router.js

const noop = () => undefined;

class Router {
  constructor() {
    this.init();
  }

  // 初始化
  init() {
    this.routes = {};
    this.listen();
    this.bindLink();
  }

  // 全部的监听事件
  listen() {
    window.addEventListener('DOMContentLoaded', this.listenEventInstance.bind(this));
    window.addEventListener('popstate', this.listenEventInstance.bind(this));
  }

  unlisten() {
    window.removeEventListener('DOMContentLoaded', this.listenEventInstance);
    window.removeEventListener('popstate', this.listenEventInstance);
  }

  // 监听事件后，触发路由的回调
  listenEventInstance() {
    this.trigger(this.getCurrentPathname());
  };

  getCurrentPathname() {
    return window.location.pathname;
  }

  // 注册路由
  route(pathname, callback = noop) {
    this.routes[pathname] = callback;
  }

  // 触发回调
  trigger(pathname) {
    if (!this.routes[pathname]) {
      return;
    }
    const {state} = window.history;
    this.routes[pathname](state);
  }

  // 绑定 a 标签，阻止默认行为
  bindLink() {
    document.addEventListener('click', e => {
      const {target} = e;
      const {nodeName, dataset: {href}} = target;
      if (!nodeName === 'A' || !href) {
        return;
      }
      e.preventDefault();
      window.history.pushState(null, '', href);
      this.trigger(href);
    });
  }
}
```

生成 `Router` 的实例时，我们需要做以下工作：
- 初始化路由映射；这个映射实际上就是一个对象，`key` 是路径名，`value` 是触发的回调。
- 监听 `popstate` 和 `DOMContentLoaded` 事件；在上文我们已经知道 `popstate` 事件在页面加载时并不会触发，因此需要监听 `DOMContentLoaded` 事件来触发初始的 URL 的回调。
- 绑定全部 `a` 标签，以便我们在阻止默认行为之后，能够调用 `pushState` 或 `replaceState` 方法来更新 URL，并触发回调。

注册路由其实上就是在 **路由映射对象** 中为 **路径** 绑定 **回调**，因为 `URL` 改变后会执行回调，所以我们可以在回调中改变内容；这样一个很简单的前端路由就实现了。

## 总结
到此为止，我们深入的了解了 History API 和 Location 对象，并理清了它们之间的关系。最重要的是需要明白为什么需要前端路由以及适合在什么样的场景下使用；另外，我们也通过 History API 实现了一个小巧的前端路由，虽然这个实现很简单，但是五脏俱全，通过它能很清晰的知道像 React、Vue 之类的前端框架的路由实现原理。

## 参考资料
1. [Manipulating the browser history
](https://developer.mozilla.org/zh-CN/docs/Web/API/History_API)
2. [HTML5 History API 和 Location 对象剖析](https://hijiangtao.github.io/2017/08/20/History-API-and-Location-Object/)
3. [技术选型 — 关于前端路由和后端路由的个人思考](https://www.cnblogs.com/zichi/p/7582215.html)
4. [History 对象](https://wangdoc.com/javascript/bom/history.html)
5. [Location 对象，URL 对象，URLSearchParams 对象](https://wangdoc.com/javascript/bom/location.html)
6. [Session history and navigation](https://html.spec.whatwg.org/multipage/history.html#the-history-interface)
7. [前端路由实现与 react-router 源码分析](https://github.com/joeyguo/blog/issues/2)
8. [剖析单页面应用路由实现原理](https://zhuanlan.zhihu.com/p/31874420)
9. [由浅入深地教你开发自己的 React Router v4](https://segmentfault.com/a/1190000009004928)
10. [单页面应用路由实现原理：以 React-Router 为例](https://github.com/youngwind/blog/issues/109)