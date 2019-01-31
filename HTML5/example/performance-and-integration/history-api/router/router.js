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

  // 全部监听事件
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