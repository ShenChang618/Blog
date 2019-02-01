# 网页渲染性能优化

[博客](https://github.com/Sam618/Blog) 有更多精品文章哟。

## 渲染原理
在讨论性能优化之前，我们有必要了解一些浏览器的渲染原理。不同的浏览器进行渲染有着不同的实现方式，但是大体流程都是差不多的，我们通过 Chrome 浏览器来大致了解一下这个渲染流程。

![渲染流程](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/rendering.png)

### 关键渲染路径
关键渲染路径是指浏览器将 HTML、CSS 和 JavaScript 转换成实际运作的网站必须采取的一系列步骤，通过渲染流程图我们可以大致概括如下：

1. 处理 HTML 并构建 DOM Tree。
2. 处理 CSS 并构建 CSSOM Tree。
3. 将 DOM Tree 和 CSSOM Tree 合并成 Render Object Tree。
4. 根据 Render Object Tree 计算节点的几何信息并以此进行布局。
5. 绘制页面需要先构建 Render Layer Tree 以便用正确的顺序展示页面，这棵树的生成与 Render Object Tree 的构建同步进行。然后还要构建 Graphics Layer Tree 来避免不必要的绘制和使用硬件加速渲染，最终才能在屏幕上展示页面。

### DOM Tree
> DOM（Document Object Model——文档对象模型）是用来呈现以及与任意 HTML 或 XML 交互的 API 文档。DOM 是载入到浏览器中的文档模型，它用节点树的形式来表现文档，每个节点代表文档的构成部分。

需要说明的是 DOM 只是构建了文档标记的属性和关系，并没有说明元素需要呈现的样式，这需要 CSSOM 来处理。

#### 构建流程
获取到 HTML 字节数据后，会通过以下流程构建 DOM Tree：

![DOM 解析流程](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/DOM-parsing-process.jpg)

1. 编码：HTML 原始字节数据转换为文件指定编码的字符串。
2. 词法分析（标记化）：对输入字符串进行逐字扫描，根据 [构词规则](http://w3c.github.io/html/syntax.html#tokenization) 识别单词和符号，分割成一个个我们可以理解的词汇（学名叫 Token）的过程。
3. 语法分析（解析器）：对 Tokens 应用 HTML 的语法规则，进行配对标记、确立节点关系和绑定属性等操作，从而构建 DOM Tree 的过程。

词法分析和语法分析在每次处理 HTML 字符串时都会执行这个过程，比如使用 `document.write` 方法。

![HTML 字符串处理过程](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/parsing-model-overview.png)

#### 词法分析（标记化）
HTML 结构不算太复杂，大部分情况下识别的标记会有开始标记、内容标记和结束标记，对应一个 HTML 元素。除此之外还有 DOCTYPE、Comment、EndOfFile 等标记。

标记化是通过状态机来实现的，状态机模型在 [W3C](http://w3c.github.io/html/syntax.html#tokenization) 中已经定义好了。

想要得到一个标记，必须要经历一些状态，才能完成解析。我们通过一个简单的例子来了解一下流程。

```HTML
<a href="www.w3c.org">W3C</a>
```

![标记化流程](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/tokenizing.png)

- 开始标记：`<a href="www.w3c.org">`
  1. Data state：碰到 **<**，进入 Tag open state
  2. Tag open state：碰到 **a**，进入 Tag name state 状态
  3. Tag name state：碰到 **空格**，进入 Before attribute name state
  4. Before attribute name state：碰到 **h**，进入 Attribute name state
  5. Attribute name state：碰到 **=**，进入 Before attribute value state
  6. Before attribute value state：碰到 **"**，进入 Attribute value (double-quoted) state
  7. Attribute value (double-quoted) state：碰到 **w**，保持当前状态
  8. Attribute value (double-quoted) state：碰到 **"**，进入 After attribute value (quoted) state
  9. After attribute value (quoted) state：碰到 **>**，进入 Data state，完成解析
- 内容标记：`W3C`
  1. Data state：碰到 **W**，保持当前状态，提取内容
  2. Data state：碰到 **<**，进入 Tag open state，完成解析
- 结束标记：`</a>`
  1. Tag open state：碰到 **/**，进入 End tag open state
  2. End tag open state：碰到 **a**，进入 Tag name state
  3. Tag name state：碰到 **>**，进入 Data state，完成解析

通过上面这个例子，可以发现属性是**开始标记**的一部分。

#### 语法分析（解析器）
在创建解析器后，会关联一个 Document 对象作为根节点。

我会简单介绍一下流程，具体的实现过程可以在 [Tree construction](https://www.w3.org/TR/html5/syntax.html#tree-construction) 查看。

解析器在运行过程中，会对 Tokens 进行迭代；并根据当前 Token 的类型转换到对应的模式，再在当前模式下处理 Token；此时，如果 Token 是一个开始标记，就会创建对应的元素，添加到 DOM Tree 中，并压入还未遇到结束标记的开始标记栈中；此栈的主要目的是实现浏览器的容错机制，纠正嵌套错误，具体的策略在 [W3C](https://www.w3.org/TR/html5/syntax.html#the-list-of-active-formatting-elements) 中定义。更多标记的处理可以在 [状态机算法](https://www.w3.org/TR/html5/syntax.html#the-rules-for-parsing-tokens-in-html-content) 中查看。

#### 参考资料
1. [浏览器的工作原理：新式网络浏览器幕后揭秘 —— 解析器和词法分析器的组合](https://www.html5rocks.com/zh/tutorials/internals/howbrowserswork/#Parser_Lexer_combination)
2. [浏览器渲染过程与性能优化 —— 构建DOM树与CSSOM树](https://sylvanassun.github.io/2017/10/03/2017-10-03-BrowserCriticalRenderingPath/#%E6%9E%84%E5%BB%BADOM%E6%A0%91%E4%B8%8ECSSOM%E6%A0%91)
3. [在浏览器的背后（一） —— HTML语言的词法解析](http://www.cnblogs.com/winter-cn/archive/2013/05/21/3091127.html)
4. [在浏览器的背后（二） —— HTML语言的语法解析](http://www.cnblogs.com/winter-cn/p/3141990.html)
5. [50 行代码的 HTML 编译器](https://ewind.us/2016/toy-html-parser/)
6. [AST解析基础: 如何写一个简单的html语法分析库](https://www.jianshu.com/p/7055c5a4cd27)
7. [WebKit中的HTML词法分析](https://wenku.baidu.com/view/0f5f781614791711cc791748.html)
8. [HTML文档解析和DOM树的构建](https://blog.csdn.net/Alan_1550587588/article/details/80297765)
9. [从Chrome源码看浏览器如何构建DOM树](https://fed.renren.com/2017/01/30/chrome-build-dom/)
10. [构建对象模型 —— 文档对象模型 (DOM)](https://developers.google.com/web/fundamentals/performance/critical-rendering-path/constructing-the-object-model#dom?hl=zh-cn)

### CSSOM Tree

#### 加载
在构建 DOM Tree 的过程中，如果遇到 link 标记，浏览器就会立即发送请求获取样式文件。当然我们也可以直接使用内联样式或嵌入样式，来减少请求；但是会失去模块化和可维护性，并且像缓存和其他一些优化措施也无效了，利大于弊，性价比实在太低了；除非是为了极致优化首页加载等操作，否则不推荐这样做。

#### 阻塞
CSS 的加载和解析并不会阻塞 DOM Tree 的构建，因为 DOM Tree 和 CSSOM Tree 是两棵相互独立的树结构。但是这个过程会阻塞页面渲染，也就是说在没有处理完 CSS 之前，文档是不会在页面上显示出来的，这个策略的好处在于页面不会重复渲染；如果 DOM Tree 构建完毕直接渲染，这时显示的是一个原始的样式，等待 CSSOM Tree 构建完毕，再重新渲染又会突然变成另外一个模样，除了开销变大之外，用户体验也是相当差劲的。另外 link 标记会阻塞 JavaScript 运行，在这种情况下，DOM Tree 是不会继续构建的，因为 JavaScript 也会阻塞 DOM Tree 的构建，这就会造成很长时间的白屏。

通过一个例子来更加详细的说明：

```HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <script>
    var startDate = new Date();
  </script>
  <link href="https://cdn.bootcss.com/bootstrap/4.0.0-alpha.6/css/bootstrap.css" rel="stylesheet">
  <script>
    console.log("link after script", document.querySelector("h2"));
    console.log("经过 " + (new Date() - startDate) + " ms");
  </script>
  <title>性能</title>
</head>
<body>
  <h1>标题</h1>
  <h2>标题2</h2>
</body>
</html>
```

首先需要在 Chrome 控制台的 Network 面板设置网络节流，让网络速度变慢，以便更好进行调试。

![debug throttling](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/debug-throttling.png)

下图说明 JavaScript 的确需要在 CSS 加载并解析完毕之后才会执行。

![debug css parse block](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/debug-css-parse-block.png)

##### 为什么需要阻塞 JavaScript 的运行呢？
因为 JavaScript 可以操作 DOM 和 CSSOM，如果 link 标记不阻塞 JavaScript 运行，这时 JavaScript 操作 CSSOM，就会发生冲突。更详细的说明可以在 [使用 JavaScript 添加交互](https://developers.google.com/web/fundamentals/performance/critical-rendering-path/adding-interactivity-with-javascript) 这篇文章中查阅。

#### 解析
CSS 解析的步骤与 HTML 的解析是非常类似的。

##### 词法分析
CSS 会被拆分成如下一些标记：

![CSS token](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/css-token.png)

###### CSS 的色值使用十六进制优于函数形式的表示？
函数形式是需要再次计算的，在进行词法分析时会将它变成一个函数标记，由此看来使用十六进制的确有所优化。

![CSS token](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/css-function-token.png)

##### 语法分析
每个 CSS 文件或嵌入样式都会对应一个 CSSStyleSheet 对象（authorStyleSheet），这个对象由一系列的 Rule（规则） 组成；每一条 Rule 都会包含 Selectors（选择器） 和若干 Declearation（声明），Declearation 又由 Property（属性）和 Value（值）组成。另外，浏览器默认样式表（defaultStyleSheet）和用户样式表（UserStyleSheet）也会有对应的 CSSStyleSheet 对象，因为它们都是单独的 CSS 文件。至于内联样式，在构建 DOM Tree 的时候会直接解析成 Declearation 集合。

![CSSStyleSheet](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/CSSStyleSheet.png)

###### 内联样式和 authorStyleSheet 的区别

所有的 authorStyleSheet 都挂载在 `document` 节点上，我们可以在浏览器中通过 `document.styleSheets` 获取到这个集合。内联样式可以直接通过节点的 `style` 属性查看。

通过一个例子，来了解下内联样式和 authorStyleSheet 的区别：

```HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <style>
    body .div1 {
      line-height: 1em;
    }
  </style>
  <link rel="stylesheet" href="./style.css">
  <style>
    .div1 {
      background-color: #f0f;
      height: 20px;
    }
  </style>
  <title>Document</title>
</head>
<body>
  <div class="div1" style="background-color: #f00;font-size: 20px;">test</div>
</body>
</html>
```

可以看到一共有三个 CSSStyleSheet 对象，每个 CSSStyleSheet 对象的 rules 里面会有一个 CSSStyleDeclaration，而内联样式获取到的直接就是 CSSStyleDeclaration。

![styleSheets](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/styleSheets.png)

###### 需要属性合并吗？
在解析 Declearation 时遇到属性合并，会把单条声明转变成对应的多条声明，比如：

```CSS
.box {
  margin: 20px;
}
```

`margin: 20px` 就会被转变成四条声明；这说明 CSS 虽然提倡属性合并，但是最终还是会进行拆分的；所以属性合并的作用应该在于减少 CSS 的代码量。

#### 计算

##### 为什么需要计算？
因为一个节点可能会有多个 Selector 命中它，这就需要把所有匹配的 Rule 组合起来，再设置最后的样式。

##### 准备工作
为了便于计算，在生成 CSSStyleSheet 对象后，会把 CSSStyleSheet 对象最右边 Selector 类型相同的 Rules 存放到对应的 Hash Map 中，比如说所有最右边 Selector 类型是 id 的 Rules 就会存放到 ID Rule Map 中；使用最右边 Selector 的原因是为了更快的匹配当前元素的所有 Rule，然后每条 Rule 再检查自己的下一个 Selector 是否匹配当前元素。

```
idRules
classRules
tagRules
...
*
```

##### 选择器命中
一个节点想要获取到所有匹配的 Rule，需要依次判断 Hash Map 中的 Selector 类型（id、class、tagName 等）是否匹配当前节点，如果匹配就会筛选当前 Selector 类型的所有 Rule，找到符合的 Rule 就会放入结果集合中；需要注意的是通配符总会在最后进行筛选。

###### 从右向左匹配规则
上文说过 Hash Map 存放的是最右边 Selector 类型的 Rule，所以在查找符合的 Rule 最开始，检验的是当前 Rule 最右边的 Selector；如果这一步通过，下面就要判断当前的 Selector 是不是最左边的 Selector；如果是，匹配成功，放入结果集合；否则，说明左边还有 Selector，递归检查左边的 Selector 是否匹配，如果不匹配，继续检查下一个 Rule。

###### 为什么需要从右向左匹配呢？
先思考一下正向匹配是什么流程，我们用 `div p .yellow` 来举例，先查找所有 `div` 节点，再向下查找后代是否是 `p` 节点，如果是，再向下查找是否存在包含 `class="yellow"` 的节点，如果存在则匹配；但是不存在呢？就浪费一次查询，如果一个页面有上千个 `div` 节点，而只有一个节点符合 Rule，就会造成大量无效查询，并且如果大多数无效查询都在最后发现，那损失的性能就实在太大了。

这时再思考从右向左匹配的好处，如果一个节点想要找到匹配的 Rule，会先查询最右边 Selector 是当前节点的 Rule，再向左依次检验 Selector；在这种匹配规则下，开始就能避免大多无效的查询，当然性能就更好，速度更快了。

##### 设置样式
设置样式的顺序是先继承父节点，然后使用默认样式（defaultStyleSheet），之后是用户样式（UserStyleSheet），最后使用开发者（authorStyleSheet）的样式。另外，如果用户样式表中有值设置了 `!important`，那么这个声明的优先级就会变成最大，我们作为开发人员其实只需要关注下面所讲的优先级就行了。

###### authorStyleSheet 优先级
放入结果集合的同时会计算这条 Rule 的优先级；来看看 blink 内核对优先级权重的定义：

```C++
switch (m_match) {
  case Id: 
    return 0x010000;
  case PseudoClass:
    return 0x000100;
  case Class:
  case PseudoElement:
  case AttributeExact:
  case AttributeSet:
  case AttributeList:
  case AttributeHyphen:
  case AttributeContain:
  case AttributeBegin:
  case AttributeEnd:
    return 0x000100;
  case Tag:
    return 0x000001;
  case Unknown:
    return 0;
}
return 0;
```

因为解析 Rule 的顺序是从右向左进行的，所以计算优先级也会按照这个顺序取得对应 Selector 的权重后相加。来看几个例子：

```CSS
/*
 * 65793 = 65536 + 1 + 256
 */
#container p .text {
  font-size: 16px;
}

/*
 * 2 = 1 + 1
 */
div p {
  font-size: 14px;
}
```

当前节点所有匹配的 Rule 都放入结果集合之后，先根据优先级从小到大排序，如果有优先级相同的 Rule，则比较它们的位置。

另外，为了便于理解，对于权重一般会分成四个部分进行相加，具体的划分如下：

- 内联样式，加 `1, 0, 0, 0`；
- ID 选择器，加 `0, 1, 0, 0`；
- Class 选择器、属性选择器、伪类，加 `0, 0, 1, 0`；
- 元素选择器和伪元素，加 `0, 0, 0, 1`。 

因为计算方式是从左向右进行排序的，所以 `0, 1, 0, 1` 要比 `0, 0, 13, 21` 更大。

###### 内联样式优先级
authorStyleSheet 的 Rule 处理完毕，才会设置内联样式；内联样式在构建 DOM Tree 的时候就已经处理完成并存放到节点的 `style` 属性上了。

内联样式会放到已经排序的结果集合最后，所以如果不设置 `!important`，内联样式的优先级是最大的。

###### `!important` 优先级
在设置 `!important` 的声明前，会先设置不包含 `!important` 的所有声明，之后再添加到结果集合的尾部；因为这个集合是按照优先级从小到大排序好的，所以 `!important` 的优先级就变成最大的了。

###### 书写 CSS 的规则
结果集合最后会生成 ComputedStyle 对象，可以通过 `window.getComputedStyle` 方法来查看所有声明。

![ComputedStyle](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/computed-style-1.png)

![ComputedStyle](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/computed-style-2.png)

可以发现图中的声明是没有顺序的，说明书写规则的最大作用是为了良好的阅读体验，利于团队协作。

##### 调整 Style
这一步会调整相关的声明；例如声明了 `position: absolute;`，当前节点的 `display` 就会设置成 `block`。

#### 参考资料
1. [从Chrome源码看浏览器如何计算CSS](https://fed.renren.com/2017/02/22/chrome-css/)
2. [探究 CSS 解析原理](http://jartto.wang/2017/11/13/Exploring-the-principle-of-CSS-parsing/)
3. [Webkit内核探究【2】——Webkit CSS实现](https://blog.csdn.net/Li_Jiayu/article/details/5123727)
4. [Webkit CSS引擎分析](https://blog.csdn.net/scusyq/article/details/7059063)
5. [css加载会造成阻塞吗？](http://www.cnblogs.com/libin-1/p/7127330.html)
6. [原来 CSS 与 JS 是这样阻塞 DOM 解析和渲染的](https://juejin.im/post/59c60691518825396f4f71a1)
7. [外链 CSS 延迟 DOM 解析和 DOMContentLoaded](https://harttle.land/2016/05/15/stylesheet-delay-domcontentloaded.html)
8. [CSS/JS 阻塞 DOM 解析和渲染](https://harttle.land/2016/11/26/static-dom-render-blocking.html)
9. [构建对象模型 —— CSS 对象模型 (CSSOM)](https://developers.google.com/web/fundamentals/performance/critical-rendering-path/constructing-the-object-model#css_cssom?hl=zh-cn)
10. [阻塞渲染的 CSS](https://developers.google.com/web/fundamentals/performance/critical-rendering-path/render-blocking-css?hl=zh-cn)

### Render Object Tree
在 DOM Tree 和 CSSOM Tree 构建完毕之后，才会开始生成 Render Object Tree（Document 节点是特例）。

#### 创建 Render Object
在创建 Document 节点的时候，会同时创建一个 Render Object 作为树根。Render Object 是一个描述节点位置、大小等样式的可视化对象。

每个非 `display: none | contents` 的节点都会创建一个 Render Object，流程大致如下：生成 ComputedStyle（在 CSSOM Tree 计算这一节中有讲），之后比较新旧 ComputedStyle（开始时旧的 ComputedStyle 默认是空）；不同则创建一个新的 Render Object，并与当前处理的节点关联，再建立父子兄弟关系，从而形成一棵完整的 Render Object Tree。

#### 布局（重排）
Render Object 在添加到树之后，还需要重新计算位置和大小；ComputedStyle 里面已经包含了这些信息，为什么还需要重新计算呢？因为像 `margin: 0 auto;` 这样的声明是不能直接使用的，需要转化成实际的大小，才能通过绘图引擎绘制节点；这也是 DOM Tree 和 CSSOM Tree 需要组合成 Render Object Tree 的原因之一。

布局是从 Root Render Object 开始递归的，每一个 Render Object 都有对自身进行布局的方法。为什么需要递归（也就是先计算子节点再回头计算父节点）计算位置和大小呢？因为有些布局信息需要子节点先计算，之后才能通过子节点的布局信息计算出父节点的位置和大小；例如父节点的高度需要子节点撑起。如果子节点的宽度是父节点高度的 50%，要怎么办呢？这就需要在计算子节点之前，先计算自身的布局信息，再传递给子节点，子节点根据这些信息计算好之后就会告诉父节点是否需要重新计算。

##### 数值类型
所有相对的测量值（`rem`、`em`、百分比...）都必须转换成屏幕上的绝对像素。如果是 `em` 或 `rem`，则需要根据父节点或根节点计算出像素。如果是百分比，则需要乘以父节点宽或高的最大值。如果是 `auto`，需要用 `(父节点的宽或高 - 当前节点的宽或高) / 2` 计算出两侧的值。

##### 盒模型
众所周知，文档的每个元素都被表示为一个矩形的盒子（盒模型），通过它可以清晰的描述 Render Object 的布局结构；在 blink 的源码注释中，已经生动的描述了[盒模型](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Box_Model/Introduction_to_the_CSS_box_model)，与原先耳熟能详的不同，滚动条也包含在了盒模型中，但是滚动条的大小并不是所有的浏览器都能修改的。

```
// ***** THE BOX MODEL *****
// The CSS box model is based on a series of nested boxes:
// http://www.w3.org/TR/CSS21/box.html
//                              top
//       |----------------------------------------------------|
//       |                                                    |
//       |                   margin-top                       |
//       |                                                    |
//       |     |-----------------------------------------|    |
//       |     |                                         |    |
//       |     |             border-top                  |    |
//       |     |                                         |    |
//       |     |    |--------------------------|----|    |    |
//       |     |    |                          |    |    |    |
//       |     |    |       padding-top        |####|    |    |
//       |     |    |                          |####|    |    |
//       |     |    |    |----------------|    |####|    |    |
//       |     |    |    |                |    |    |    |    |
//  left | ML  | BL | PL |  content box   | PR | SW | BR | MR |
//       |     |    |    |                |    |    |    |    |
//       |     |    |    |----------------|    |    |    |    |
//       |     |    |                          |    |    |    |
//       |     |    |      padding-bottom      |    |    |    |
//       |     |    |--------------------------|----|    |    |
//       |     |    |                      ####|    |    |    |
//       |     |    |     scrollbar height ####| SC |    |    |
//       |     |    |                      ####|    |    |    |
//       |     |    |-------------------------------|    |    |
//       |     |                                         |    |
//       |     |           border-bottom                 |    |
//       |     |                                         |    |
//       |     |-----------------------------------------|    |
//       |                                                    |
//       |                 margin-bottom                      |
//       |                                                    |
//       |----------------------------------------------------|
//
// BL = border-left
// BR = border-right
// ML = margin-left
// MR = margin-right
// PL = padding-left
// PR = padding-right
// SC = scroll corner (contains UI for resizing (see the 'resize' property)
// SW = scrollbar width
```

##### `box-sizing`
`box-sizing: content-box | border-box`，`content-box` 遵循标准的 W3C 盒子模型，`border-box` 遵守 IE 盒子模型。

它们的区别在于 `content-box` 只包含 content area，而 `border-box` 则一直包含到 border。通过一个例子说明：

```CSS
// width
// content-box: 40
// border-box: 40 + (2 * 2) + (1 * 2)
div {
  width: 40px;
  height: 40px;
  padding: 2px;
  border: 1px solid #ccc;
}
```

#### 参考资料
1. [从Chrome源码看浏览器如何layout布局](https://fed.renren.com/2017/02/26/chrome-layout/)
2. [Chromium网页Render Object Tree创建过程分析](https://blog.csdn.net/Luoshengyang/article/details/50615628)
3. [浏览器的工作原理：新式网络浏览器幕后揭秘 —— 呈现树和 DOM 树的关系](https://www.html5rocks.com/zh/tutorials/internals/howbrowserswork/#The_render_tree_relation_to_the_DOM_tree)
4. [谈谈我对盒模型的理解](https://link.jianshu.com/?t=https://wanghan0.github.io/2017/03/31/css-box/)
5. [渲染树构建、布局及绘制](https://developers.google.com/web/fundamentals/performance/critical-rendering-path/render-tree-construction?hl=zh-cn)

### Render Layer Tree
Render Layer 是在 Render Object 创建的同时生成的，具有相同坐标空间的 Render Object 属于同一个 Render Layer。这棵树主要用来实现[层叠上下文](https://developer.mozilla.org/zh-CN/docs/Web/Guide/CSS/Understanding_z_index/The_stacking_context)，以保证用正确的顺序合成页面。

#### 创建 Render Layer
满足层叠上下文条件的 Render Object 一定会为其创建新的 Render Layer，不过一些特殊的 Render Object 也会创建一个新的 Render Layer。

创建 Render Layer 的原因如下：

- NormalLayer
  - position 属性为 relative、fixed、sticky、absolute
  - 透明的（opacity 小于 1）、滤镜（filter）、遮罩（mask）、混合模式（mix-blend-mode 不为 normal）
  - 剪切路径（clip-path）
  - 2D 或 3D 转换（transform 不为 none）
  - 隐藏背面（backface-visibility: hidden）
  - 倒影（box-reflect）
  - column-count（不为 auto）或者column-widthZ（不为 auto）
  - 对不透明度（opacity）、变换（transform）、滤镜（filter）应用动画
- OverflowClipLayer
  - 剪切溢出内容（overflow: hidden）

另外以下 DOM 元素对应的 Render Object 也会创建单独的 Render Layer：
- Document
- HTML
- Canvas
- Video

如果是 NoLayer 类型，那它并不会创建 Render Layer，而是与其第一个拥有 Render Layer 的父节点共用一个。

#### 参考资料
1. [无线性能优化：Composite —— 从 LayoutObjects 到 PaintLayers](http://taobaofed.org/blog/2016/04/25/performance-composite/#%E4%BB%8E-LayoutObjects-%E5%88%B0-PaintLayers)
2. [Chromium网页Render Layer Tree创建过程分析](https://blog.csdn.net/Luoshengyang/article/details/50648792)
3. [WEBKIT 渲染不可不知的这四棵树](https://juejin.im/entry/57f9eb9e0bd1d00058bc0a1b)

### Graphics Layer Tree

#### 软件渲染
软件渲染是浏览器最早采用的渲染方式。在这种方式中，渲染是从后向前（递归）绘制 Render Layer 的；在绘制一个 Render Layer 的过程中，它的 Render Objects 不断向一个共享的 Graphics Context 发送绘制请求来将自己绘制到一张共享的[位图](https://zh.wikipedia.org/wiki/%E4%BD%8D%E5%9B%BE)中。

#### 硬件渲染
有些特殊的 Render Layer 会绘制到自己的后端存储（当前 Render Layer 会有自己的位图），而不是整个网页共享的位图中，这些 Layer 被称为 Composited Layer（Graphics Layer）。最后，当所有的 Composited Layer 都绘制完成之后，会将它们合成到一张最终的位图中，这一过程被称为 Compositing；这意味着如果网页某个 Render Layer 成为 Composited Layer，那整个网页只能通过合成来渲染。除此之外，Compositing 还包括 transform、scale、opacity 等操作，所以这就是硬件加速性能好的原因，上面的动画操作不需要重绘，只需要重新合成就好。

上文提到软件渲染只会有一个 Graphics Context，并且所有的 Render Layer 都会使用同一个 Graphics Context 绘制。而硬件渲染需要多张位图合成才能得到一张完整的图像，这就需要引入 Graphics Layer Tree。

Graphics Layer Tree 是根据 Render Layer Tree 创建的，但并不是每一个 Render Layer 都会有对应的 Composited Layer；这是因为创建大量的 Composited Layer 会消耗非常多的系统内存，所以 Render Layer 想要成为 Composited Layer，必须要给出创建的理由，这些理由实际上就是在描述 Render Layer 具备的特征。如果一个 Render Layer 不是 Compositing Layer，那就和它的祖先共用一个。

每一个 Graphics Layer 都会有对应的 Graphics Context。Graphics Context 负责输出当前 Render Layer 的位图，位图存储在系统内存中，作为纹理（可以理解为 GPU 中的位图）上传到 GPU 中，最后 GPU 将多张位图合成，然后绘制到屏幕上。因为 Graphics Layer 会有单独的位图，所以在一般情况下更新网页的时候硬件渲染不像软件渲染那样重新绘制相关的 Render Layer；而是重新绘制发生更新的 Graphics Layer。

##### 提升原因
Render Layer 提升为 Composited Layer 的理由大致概括如下，更为详细的说明可以查看 [无线性能优化：Composite —— 从 PaintLayers 到 GraphicsLayers](http://taobaofed.org/blog/2016/04/25/performance-composite/#%E4%BB%8E-PaintLayers-%E5%88%B0-GraphicsLayers)。
  - iframe 元素具有 Composited Layer。
  - video 元素及它的控制栏。
  - 使用 WebGL 的 canvas 元素。
  - 硬件加速插件，例如 flash。
  - 3D 或透视变换（perspective transform） CSS 属性。
  - backface-visibility 为 hidden。
  - 对 opacity、transform、fliter、backdropfilter 应用了 animation 或者 transition（需要是 active 的 animation 或者 transition，当 animation 或者 transition 效果未开始或结束后，提升的 Composited Layer 会恢复成普通图层）。
  - will-change 设置为 opacity、transform、top、left、bottom、right（其中 top、left 等需要设置明确的定位属性，如 relative 等）。
  - 有 Composited Layer 后代并本身具有某些属性。
  - 元素有一个 z-index 较低且为 Composited Layer 的兄弟元素。

##### 为什么需要 Composited Layer？
1. 避免不必要的重绘。例如网页中有两个 Layer a 和 b，如果 a Layer 的元素发生改变，b Layer 没有发生改变；那只需要重新绘制 a Layer，然后再与 b Layer 进行 Compositing，就可以得到整个网页。
2. 利用硬件加速高效实现某些 UI 特性。例如滚动、3D 变换、透明度或者滤镜效果，可以通过 GPU（硬件渲染）高效实现。

##### 层压缩
由于重叠的原因，可能会产生大量的 Composited Layer，就会浪费很多资源，严重影响性能，这个问题被称为层爆炸。浏览器通过 Layer Squashing（层压缩）处理这个问题，当有多个 Render Layer 与 Composited Layer 重叠，这些 Render Layer 会被压缩到同一个 Composited Layer。来看一个例子：

```HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <style>
    div {
      position: absolute;
      width: 100px;
      height: 100px;
    }
    .div1 {
      z-index: 1;
      top: 10px;
      left: 10px;
      will-change: transform;
      background-color: #f00;
    }
    .div2 {
      z-index: 2;
      top: 80px;
      left: 80px;
      background-color: #f0f;
    }
    .div3 {
      z-index: 2;
      top: 100px;
      left: 100px;
      background-color: #ff0;
    }
  </style>
  <title>Document</title>
</head>
<body>
  <div class="div1"></div>
  <div class="div2"></div>
  <div class="div3"></div>
</body>
</html>
```

![层压缩](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/layer-squashing.png)

![层压缩](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/layer-squashing-composited.png)

可以看到后面两个节点重叠而压缩到了同一个 Composited Layer。

有一些不能被压缩的情况，可以在 [无线性能优化：Composite —— 层压缩](http://taobaofed.org/blog/2016/04/25/performance-composite/#%E5%B1%82%E5%8E%8B%E7%BC%A9) 中查看。

#### 参考资料
1. [无线性能优化：Composite —— 从-PaintLayers-到-GraphicsLayers](http://taobaofed.org/blog/2016/04/25/performance-composite/从-PaintLayers-到-GraphicsLayers)
2. [Webkit 渲染基础与硬件加速](https://segmentfault.com/a/1190000013627093)
3. [Chromium网页Graphics Layer Tree创建过程分析](https://blog.csdn.net/luoshengyang/article/details/50661553)
4. [Chrome中的硬件加速合成](https://blog.csdn.net/chq123456/article/details/24998695)
5. [浏览器渲染流程 详细分析](https://juejin.im/entry/59f010fdf265da4315231caa)
6. [WebKit 渲染流程基础及分层加速](http://www.yangzicong.com/article/8)

## 性能优化
上文简单介绍了浏览器渲染流程上的各个组成部分，下面我们通过像素管道来研究如何优化视觉变化效果所引发的更新。

### 像素管道

![像素管道](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/frame-full.jpg)

> JavaScript。一般来说，我们会使用 JavaScript 来实现一些视觉变化的效果。比如用 jQuery 的 animate 函数做一个动画、对一个数据集进行排序或者往页面里添加一些 DOM 元素等。当然，除了 JavaScript，还有其他一些常用方法也可以实现视觉变化效果，比如：CSS Animations、Transitions 和 Web Animation API。

> 样式计算。此过程是根据匹配选择器（例如 .headline 或 .nav > .nav__item）计算出哪些元素应用哪些 CSS 规则的过程。从中知道规则之后，将应用规则并计算每个元素的最终样式。

> 布局。在知道对一个元素应用哪些规则之后，浏览器即可开始计算它要占据的空间大小及其在屏幕的位置。网页的布局模式意味着一个元素可能影响其他元素，例如 <body> 元素的宽度一般会影响其子元素的宽度以及树中各处的节点，因此对于浏览器来说，布局过程是经常发生的。

> 绘制。绘制是填充像素的过程。它涉及绘出文本、颜色、图像、边框和阴影，基本上包括元素的每个可视部分。绘制一般是在多个表面（通常称为层）上完成的。

> 合成。由于页面的各部分可能被绘制到多层，由此它们需要按正确顺序绘制到屏幕上，以便正确渲染页面。对于与另一元素重叠的元素来说，这点特别重要，因为一个错误可能使一个元素错误地出现在另一个元素的上层。

渲染时的每一帧都会经过管道的各部分进行处理，但并不意味着所有的部分都会执行。实际上，在实现视觉变化效果时，管道针对指定帧通常有三种方式：

1. JS / CSS > 样式 > 布局 > 绘制 > 合成

![像素管道](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/frame-full.jpg)

> 如果你修改一个 DOM 元素的 Layout 属性，也就是改变了元素的样式（比如 width、height 或者 position 等），那么浏览器会检查哪些元素需要重新布局，然后对页面激发一个 reflow（重排）过程完成重新布局。被 reflow（重排）的元素，接下来也会激发绘制过程，最后激发渲染层合并过程，生成最后的画面。

2. JS / CSS > 样式 > 绘制 > 合成

![像素管道](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/frame-no-layout.jpg)

> 如果你修改一个 DOM 元素的 Paint Only 属性，比如背景图片、文字颜色或阴影等，这些属性不会影响页面的布局，因此浏览器会在完成样式计算之后，跳过布局过程，只会绘制和渲染层合并过程。

3. JS / CSS > 样式 > 合成

![像素管道](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/frame-no-layout-paint.jpg)

> 如果你修改一个非样式且非绘制的 CSS 属性，那么浏览器会在完成样式计算之后，跳过布局和绘制的过程，直接做渲染层合并。这种方式在性能上是最理想的，对于动画和滚动这种负荷很重的渲染，我们要争取使用第三种渲染过程。

影响 Layout、Paint 和 Composite 的属性都可以通过 [CSS Triggers](https://csstriggers.com/) 网站查阅。

### 刷新率
上面提到每一帧都要经过像素管道处理，也就是说每一帧都是一次重新渲染。我们需要引出另外一个概念：刷新率。

刷新率是一秒钟能够重新渲染多少次数的指标。目前大多数设备的屏幕刷新率为 **60 次/秒**；因此如果在页面中有动画、渐变、滚动效果，那么浏览器每一次重新渲染的时间间隔必须跟设备的每一次刷新保持一致，才能比较流畅。需要注意的是，大多数浏览器也会对重新渲染的时间间隔进行限制，因为即使超过屏幕刷新率，用户体验也不会提升。

> 刷新率（Hz）取决与显示器的硬件水平。
> 帧率（FPS）取决于显卡或者软件制约。

每次重新渲染的时间不能超过 16.66 ms（1 秒 / 60 次）。但实际上，浏览器还有很多整理工作，因此我们的所有工作最好在 10 毫秒之内完成。如果超过时间，刷新率下降，就会导致页面抖动，感觉卡顿。

![帧速度](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/frame-speed.png)

### 优化 JavaScript 执行
JavaScript 是触发视觉变化的主要因素，时机不当或长时间运行的 JavaScript 可能是导致性能下降的常见原因。针对 JavaScript 的执行，下面有一些常用的优化措施。

#### `window.requestAnimationFrame`
在没有 `requestAnimationFrame` 方法的时候，执行动画，我们可能使用 `setTimeout` 或 `setInterval` 来触发视觉变化；但是这种做法的问题是：回调函数执行的时间是不固定的，可能刚好就在末尾，或者直接就不执行了，经常会引起丢帧而导致页面卡顿。

![丢帧](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/settimeout.jpg)

归根到底发生上面这个问题的原因在于时机，也就是浏览器要知道何时对回调函数进行响应。`setTimeout` 或 `setInterval` 是使用定时器来触发回调函数的，而定时器并无法保证能够准确无误的执行，有许多因素会影响它的运行时机，比如说：当有同步代码执行时，会先等同步代码执行完毕，异步队列中没有其他任务，才会轮到自己执行。并且，我们知道每一次重新渲染的最佳时间大约是 16.6 ms，如果定时器的时间间隔过短，就会造成 [过度渲染](https://www.zhangxinxu.com/wordpress/2013/09/css3-animation-requestanimationframe-tween-%E5%8A%A8%E7%94%BB%E7%AE%97%E6%B3%95/)，增加开销；过长又会延迟渲染，使动画不流畅。

`requestAnimationFrame` 方法不同与 `setTimeout` 或 `setInterval`，它是由系统来决定回调函数的执行时机的，会请求浏览器在下一次重新渲染之前执行回调函数。无论设备的刷新率是多少，`requestAnimationFrame` 的时间间隔都会紧跟屏幕刷新一次所需要的时间；例如某一设备的刷新率是 75 Hz，那这时的时间间隔就是 13.3 ms（1 秒 / 75 次）。需要注意的是这个方法虽然能够保证回调函数在每一帧内只渲染一次，但是如果这一帧有太多任务执行，还是会造成卡顿的；因此它只能保证重新渲染的时间间隔最短是屏幕的刷新时间。

`requestAnimationFrame` 方法的具体说明可以看 [MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestAnimationFrame) 的相关文档，下面通过一个网页动画的示例来了解一下如何使用。

```JavaScript
let offsetTop = 0;
const div = document.querySelector(".div");
const run = () => {
  div.style.transform = `translate3d(0, ${offsetTop += 10}px, 0)`;
  window.requestAnimationFrame(run);
};
run();
```

如果想要实现动画效果，每一次执行回调函数，必须要再次调用 `requestAnimationFrame` 方法；与 `setTimeout` 实现动画效果的方式是一样的，只不过不需要设置时间间隔。

##### 参考资料
1. [被誉为神器的requestAnimationFrame](https://www.w3cplus.com/javascript/requestAnimationFrame.html)
2. [requestAnimationFrame 知多少？](https://www.cnblogs.com/onepixel/p/7078617.html)
3. [浅析 requestAnimationFrame](http://taobaofed.org/blog/2017/03/02/thinking-in-request-animation-frame/)
4. [告别定时器，走向 window.requestAnimationFrame()](https://github.com/Monine/study/issues/3)
5. [requestAnimationFrame 性能更好](https://jinlong.github.io/2013/06/24/better-performance-with-requestanimationframe/)
6. [谈谈requestAnimationFrame的动画循环](http://www.dengzhr.com/js/937)

#### `window.requestIdleCallback`
`requestIdleCallback` 方法只在一帧末尾有空闲的时候，才会执行回调函数；它很适合处理一些需要在浏览器空闲的时候进行处理的任务，比如：统计上传、数据预加载、模板渲染等。

以前如果需要处理复杂的逻辑，不进行分片，用户界面很可能就会出现假死状态，任何的交互操作都将无效；这时使用 `setTimeout` 就可以把任务拆分成多个模块，每次只处理一个模块，这样能很大程度上缓解这个问题。但是这种方式具有很强的不确定性，我们不知道这一帧是否空闲，如果已经塞满了一大堆任务，这时在处理模块就不太合适了。因此，在这种情况下，我们也可以使用 `requestIdleCallback` 方法来尽可能高效地利用空闲来处理分片任务。

如果一直没有空闲，`requestIdleCallback` 就只能永远在等待状态吗？当然不是，它的参数除了回调函数之外，还有一个可选的配置对象，可以使用 `timeout` 属性设置超时时间；当到达这个时间，`requestIdleCallback` 的回调就会立即推入事件队列。来看下如何使用：

```JavaScript
// 任务队列
const tasks = [
  () => {
    console.log("第一个任务");
  },
  () => {
    console.log("第二个任务");
  },
  () => {
    console.log("第三个任务");
  },
];

// 设置超时时间
const rIC = () => window.requestIdleCallback(runTask, {timeout: 3000})

function work() {
  tasks.shift()();
}

function runTask(deadline) {
  if (
    (
      deadline.timeRemaining() > 0 ||
      deadline.didTimeout
    ) &&
    tasks.length > 0
  ) {
    work();
  }

  if (tasks.length > 0) {
    rIC();
  }
}

rIC();
```

回调函数参数的详细说明可以查看 [MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestIdleCallback) 的文档。

##### 改变 DOM
不应该在 `requestIdleCallback` 方法的回调函数中改变 DOM。我们来看下在某一帧的末尾，回调函数被触发，它在一帧中的位置：

![requestIdleCallback 位置](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/idle-run.png)

回调函数安排在帧提交之后，也就是说这时渲染已经完成了，布局已经重新计算过；如果我们在回调中改变样式，并且在下一帧中读取布局信息，那之前所作的所有布局计算全都浪费掉了，浏览器会强制重新进行布局计算，这也被称为 [强制同步布局](https://developers.google.com/web/fundamentals/performance/rendering/avoid-large-complex-layouts-and-layout-thrashing#_2)。

如果真的想要修改 DOM，那么最佳实践是：在 `requestIdleCallback` 的回调中构建 Document Fragment，然后在下一帧的 `requestAnimationFrame` 回调进行真实的 DOM 变动。

##### Fiber
React 16 推出了新的协调器，Fiber Reconciler（纤维协调器）。它和原先 Stack Reconciler（栈协调器）不同的是：整个渲染过程不是连续不中断完成的；而是进行了分片，分段处理任务，这就需要用到 `requestIdleCallback` 和 `requestAnimationFrame` 方法来实现。`requestIdleCallback` 负责低优先级的任务，`requestAnimationFrame` 负责动画相关的高优先级任务。

##### 参考资料
1. [requestIdleCallback-后台任务调度](http://www.zhangyunling.com/702.html)
2. [你应该知道的requestIdleCallback](https://juejin.im/post/5ad71f39f265da239f07e862)
3. [使用requestIdleCallback](https://div.io/topic/1370)
4. [React Fiber初探 —— 调和（Reconciliation）](http://blog.codingplayboy.com/2017/12/02/react_fiber/#Reconciliation)

#### Web Worker
JavaScript 采用的是单线程模型，也就是说，所有任务都要在一个线程上完成，一次只能执行一个任务。有时，我们需要处理大量的计算逻辑，这是比较耗费时间的，用户界面很有可能会出现假死状态，非常影响用户体验。这时，我们就可以使用 Web Worker 来处理这些计算。

Web Worker 是 HTML5 中定义的规范，它允许 JavaScript 脚本运行在主线程之外的后台线程中。这就为 JavaScript 创造了 [多线程](https://zh.wikipedia.org/wiki/%E5%A4%9A%E7%BA%BF%E7%A8%8B) 的环境，在主线程，我们可以创建 Worker 线程，并将一些任务分配给它。Worker 线程与主线程同时运行，两者互不干扰。等到 Worker 线程完成任务，就把结果发送给主线程。

> Web Worker 与其说创造了多线程环境，不如说是一种回调机制。毕竟 Worker 线程只能用于计算，不能执行更改 DOM 这些操作；它也不能共享内存，没有 [线程同步](https://baike.baidu.com/item/%E7%BA%BF%E7%A8%8B%E5%90%8C%E6%AD%A5) 的概念。

Web Worker 的优点是显而易见的，它可以使主线程能够腾出手来，更好的响应用户的交互操作，而不必被一些计算密集或者高延迟的任务所阻塞。但是，Worker 线程也是比较耗费资源的，因为它一旦创建，就一直运行，不会被用户的操作所中断；所以当任务执行完毕，Worker 线程就应该关闭。

##### Web Workers API
一个 Worker 线程是由 `new` 命令调用 `Worker()` 构造函数创建的；构造函数的参数是：包含执行任务代码的脚本文件，引入脚本文件的 [URI](https://zh.wikipedia.org/wiki/%E7%BB%9F%E4%B8%80%E8%B5%84%E6%BA%90%E6%A0%87%E5%BF%97%E7%AC%A6) 必须遵守同源策略。

Worker 线程与主线程不在同一个全局上下文中，因此会有一些需要注意的地方：
- 两者不能直接通信，必须通过消息机制来传递数据；并且，数据在这一过程中会被复制，而不是通过 Worker 创建的实例共享。详细介绍可以查阅 [worker中数据的接收与发送：详细介绍](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Using_web_workers#worker%E4%B8%AD%E6%95%B0%E6%8D%AE%E7%9A%84%E6%8E%A5%E6%94%B6%E4%B8%8E%E5%8F%91%E9%80%81%EF%BC%9A%E8%AF%A6%E7%BB%86%E4%BB%8B%E7%BB%8D)。
- 不能使用 DOM、`window` 和 `parent` 这些对象，但是可以使用与主线程全局上下文无关的东西，例如 `WebScoket`、`indexedDB` 和 `navigator` 这些对象，更多能够使用的对象可以查看[Web Workers可以使用的函数和类](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Functions_and_classes_available_to_workers)。

##### 使用方式
Web Worker 规范中定义了两种不同类型的线程；一个是 Dedicated Worker（专用线程），它的全局上下文是 [DedicatedWorkerGlobalScope](https://developer.mozilla.org/zh-CN/docs/Web/API/DedicatedWorkerGlobalScope) 对象；另一个是 Shared Worker（共享线程），它的全局上下文是 [SharedWorkerGlobalScope](https://developer.mozilla.org/zh-CN/docs/Web/API/SharedWorkerGlobalScope) 对象。其中，Dedicated Worker 只能在一个页面使用，而 Shared Worker 则可以被多个页面共享。

下面我来简单介绍一下使用方式，更多的 API 可以查看 [使用 Web Workers](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Using_web_workers)。

###### 专用线程
下面代码最重要的部分在于两个线程之间怎么发送和接收消息，它们都是使用 `postMessage` 方法发送消息，使用 `onmessage` 事件进行监听。区别是：在主线程中，`onmessage` 事件和 `postMessage` 方法必须挂载在 Worker 的实例上；而在 Worker 线程，Worker 的实例方法本身就是挂载在全局上下文上的。

```HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Web Worker 专用线程</title>
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

###### 共享线程
共享线程虽然可以在多个页面共享，但是必须遵守同源策略，也就是说只能在相同协议、主机和端口号的网页使用。

示例基本上与专用线程的类似，区别是：
- 创建实例的构造器不同。
- 主线程与共享线程通信，必须通过一个确切打开的端口对象；在传递消息之前，两者都需要通过 `onmessage` 事件或者显式调用 `start` 方法打开端口连接。而在专用线程中这一部分是自动执行的。

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

##### 参考资料
1. [优化 JavaScript 执行 —— 降低复杂性或使用 Web Worker](https://developers.google.com/web/fundamentals/performance/rendering/optimize-javascript-execution#web_worker)
2. [使用 Web Workers](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Using_web_workers)
3. [深入 HTML5 Web Worker 应用实践：多线程编程](https://www.ibm.com/developerworks/cn/web/1112_sunch_webworker/index.html)
4. [JS与多线程](https://fed.renren.com/2017/05/21/js-threads/)

#### 防抖和节流函数
在进行改变窗口大小、滚动网页、输入内容这些操作时，事件回调会十分频繁的被触发，严重增加了浏览器的负担，导致用户体验非常糟糕。此时，我们就可以考虑采用防抖和节流函数来处理这类调动频繁的事件回调，同时它们也不会影响实际的交互效果。

我们先来简单了解一下这两个函数：
- 防抖（debounce）函数。在持续触发事件时，并不执行事件回调；只有在一段时间之内，没有再触发事件的时候，事件回调才会执行一次。

![防抖函数](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/debounce.png)

- 节流（throttle）函数。在持续触发事件时，事件回调也会不断的间隔一段时间后执行一次。

![节流函数](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/throttle.png)

这两个函数最大的区别在于执行的时机，防抖函数会在事件触发停止一段时间后执行事件回调；而节流函数会在事件触发时不断的间隔一段时间后执行事件回调。我们用定时器来简单实现一下这两个函数，详细版本可以参考 [Underscore](http://www.css88.com/doc/underscore/docs/underscore.html#section-81) 和 [Lodash —— debounce](https://github.com/lodash/lodash/blob/master/debounce.js)、[Lodash —— throttle](https://github.com/lodash/lodash/blob/master/throttle.js)。节流函数其实在浏览器拥有 `requestAnimationFrame` 方法之后，使用这个方法调用事件回调会更好一些。

##### 实现防抖函数
每次执行到 `debounce` 返回的函数，都先把上一个定时器清理掉，再重新运行一个定时器；等到最后一次执行这个返回的函数的时候，定时器不会被清理，就可以正常等待定时器结束，执行事件回调了。

```JavaScript
function debounce(func, wait) {
  let timeout = null;
  
  return function run(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  }
};
```

##### 实现节流函数
在定时器存在的时候，不在重新生成定时器；等到定时器结束，事件回调执行，就把定时器清空；在下一次执行 `throttle` 返回的函数的时候，再生成定时器，等待下一个事件回调执行。

```JavaScript
function throttle(func, wait) {
  let timeout = null;

  return function run(...args) {
    if (!timeout) {
      timeout = setTimeout(() => {
        timeout = null;
        func.apply(this, args);
      }, wait);
    }
  }
}
```

##### 参考资料
1. [JS的防抖与节流](https://juejin.im/entry/5b1d2d54f265da6e2545bfa4)
2. [使输入处理程序去除抖动](https://developers.google.com/web/fundamentals/performance/rendering/debounce-your-input-handlers)
3. [Underscore](http://www.css88.com/doc/underscore/docs/underscore.html#section-81)
4. [Lodash —— debounce](https://github.com/lodash/lodash/blob/master/debounce.js)
5. [Lodash —— throttle](https://github.com/lodash/lodash/blob/master/throttle.js)

### 降低 Style 的复杂性
我们知道 CSS 最重要的组成部分是选择器和声明，所以我会通过这两方面来讲解如何降低 Style 的复杂性。

#### 避免选择器嵌套
我们在 CSSOM Tree 这一节中了解到：嵌套的选择器会从右向左匹配，这是一个递归的过程，而递归是一种比较耗时的操作。更不用说一些 CSS3 的选择器了，它们会需要更多的计算，例如：

```CSS
.text:nth-child(2n) .strong {
  /* styles */
}
```

为了确定哪些节点应用这个样式，浏览器必须先询问这是拥有 `"strong" class` 的节点吗？其父节点恰好是偶数的 `"text" class` 节点吗？如此多的计算过程，都可以通过一个简单的 `class` 来避免：

```CSS
.text-even-strong {
  /* styles */
}
```

这么简单的选择器，浏览器只要匹配一次就可以了。为了准确描述网页结构、可复用和代码共享等方面的考虑，我们可以使用 BEM 来协助开发。

##### BEM（块，元素，修饰符）
BEM 简单来讲就是一种 `class` 的命名规范，它建议所有元素都有单个类，并且嵌套也能够很好的组织在类中：

```CSS
.nav {}
.nav__item {}
```

如果节点需要与其他节点进行区分，就可以加入修饰符来协助开发：

```CSS
.nav__item--active {}
```

更为详细的描述和用法可以查看 [Get BEM](http://getbem.com/)。

#### 使用开销更小的样式
因为屏幕显示效果的不同，所以浏览器渲染每一个样式的开销也会不一样。例如，绘制阴影肯定要比绘制普通背景的时间要长。我们来对比下这两者之间的开销。

```HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <style>
    .simple {
      background-color: #f00;
    }
    .complex {
      box-shadow: 0 4px 4px rgba(0, 0, 0, 0.5);
    }
  </style>
  <title>性能优化</title>
</head>
<body>
  <div class="container"></div>
  <script>
    const div = document.querySelector(".container");
    let str = "";
    for (let i = 0; i < 1000; i++) {
      str += "<div class=\"simple\">background-color: #f00;</div>";
      // str += "<div class=\"complex\">box-shadow: 0, 4px, 4px, rgba(0,0,0,0.5);</div>";
    }
    div.innerHTML = str;
  </script>
</body>
</html>
```

![样式阴影](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/style-box-shadow.png)

![样式背景](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/style-background.png)

可以看到阴影的 Layout 是 31.35 ms，paint 是 6.43 ms；背景的 Layout 是 10.81 ms，paint 是 4.30 ms。Layout 的差异还是相当明显的。

因此，如果可能，还是应该使用开销更小的样式替代当前样式实现最终效果。

#### 参考资料  
1. [缩小样式计算的范围并降低其复杂性](https://developers.google.com/web/fundamentals/performance/rendering/reduce-the-scope-and-complexity-of-style-calculations)
2. [CSS BEM 书写规范](https://github.com/Tencent/tmt-workflow/wiki/%E2%92%9B-%5B%E8%A7%84%E8%8C%83%5D--CSS-BEM-%E4%B9%A6%E5%86%99%E8%A7%84%E8%8C%83)

### 最小化重排（Reflow）和重绘（Repaint）
首先我们先来了解一下什么是重排和重绘。

- **重排**是指因为修改 style 或调整 DOM 结构重新构建部分或全部 Render Object Tree 从而计算布局的过程。这一过程至少会触发一次，既页面初始化。
- **重绘**是指重新绘制受影响的部分到屏幕。

观察像素通道会发现重绘不一定会触发重排，比如改变某个节点的背景色，只会重新绘制这个节点，而不会发生重排，这是因为布局信息没有发生变化；但是重排是一定会触发重绘的。

下面的情况会导致重排或者重绘：
- 调整 DOM 结构
- 修改 CSS 样式
- 用户事件，如页面滚动，改变窗口大小等

#### 浏览器优化策略
重排和重绘会不断触发，这是不可避免的。但是，它们非常消耗资源，是导致网页性能低下的根本原因。

提高网页性能，就是要降低重排和重绘的频率和成本，尽可能少的触发重新渲染。

浏览器面对集中的 DOM 操作时会有一个优化策略：创建一个变化的队列，然后一次执行，最终只渲染一次。

```JavaScript
div2.style.height = "100px";
div2.style.width = "100px";
```

上面的代码在浏览器优化后只会执行一次渲染。但是，如果代码写得不好变化的队列就会立即刷新，并进行渲染；这通常是在修改 DOM 之后，立即获取样式信息的时候。下面的样式信息会触发重新渲染：

- offsetTop/offsetLeft/offsetWidth/offsetHeight
- scrollTop/scrollLeft/scrollWidth/scrollHeight
- clientTop/clientLeft/clientWidth/clientHeight
- getComputedStyle()

#### 提高性能的技巧

1. 多利用浏览器优化策略。相同的 DOM 操作（读或写），应该放在一起。不要在读操作中间插入写操作。
2. 不要频繁计算样式。如果某个样式是通过重排得到的，那么最好缓存结果。避免下一次使用的时候，再进行重排。

```JavaScript
// Bad
const div1 = document.querySelector(".div1");
div1.style.height = div1.clientHeight + 200 + "px";
div1.style.width = div1.clientHeight * 2 + "px";

// Good
const div2 = document.querySelector(".div2");
const div2Height = div1.clientHeight + 200;
div2.style.height = div2Height + "px";
div2.style.width = div2Height * 2 + "px";
```

3. 不要逐条改变样式。通过改变 `className` 或 `cssText` 属性，一次性改变样式。

```JavaScript
// Bad
const top = 10;
const left = 10;
const div = document.querySelector(".div");
div.style.top = top + "px";
div.style.left = left + "px";

// Good
div.className += "addClass";

// Good
div.style.cssText += "top: 10px; left: 10px";
```

4. 使用离线 DOM。离线意味着不对真实的节点进行操作，可以通过以下方式实现：
  - 操纵 Document Fragment 对象，完成后再把这个对象加入 DOM Tree
  - 使用 `cloneNode` 方法，在克隆的节点上进行操作，然后再用克隆的节点替换原始节点
  - 将节点设为 `display: none;`（需要一次重排），然后对这个节点进行多次操作，最后恢复显示（需要一次重排）。这样一来，就用两次重排，避免了更多次的重新渲染。
  - 将节点设为 `visibility: hidden;` 和设为 `display: none;` 是类似的，但是这个属性只对重绘有优化，对重排是没有效果的，因为它只是隐藏，但是节点还在文档流中的。
5. 设置 `position: absolute | fixed;`。节点会脱离文档流，这时因为不用考虑这个节点对其他节点的影响，所以重排的开销会比较小。
6. 使用虚拟 DOM，例如 Vue、React 等。
7. 使用 flexbox 布局。flexbox 布局的性能要比传统的布局模型高得多，下面是对 1000 个 `div` 节点应用 `float` 或 `flex` 布局的开销对比。可以发现，对于相同数量的元素和相同视觉的外观，`flex` 布局的开销要小得多（float 37.92 ms | flex 13.16 ms）。

![float 布局](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/layout-float.png)

![flex 布局](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/layout-flex.png)

#### 参考资料
1. [网页性能管理详解](http://www.ruanyifeng.com/blog/2015/09/web-page-performance-in-depth.html)
2. [渲染优化：重排重绘与硬件加速](http://www.yangzicong.com/article/9)
3. [浏览器渲染流程 详细分析](https://juejin.im/entry/59f010fdf265da4315231caa)
4. [CSS Animation性能优化](https://www.w3cplus.com/animation/animation-performance.html)

### Composite 的优化
终于，我们到了像素管道的末尾。对于这一部分的优化策略，我们可以从为什么需要 Composited Layer（Graphics Layer）来入手。这个问题我们在构建 Graphics Layer Tree 的时候，已经说明过，现在简单回顾一下：

1. 避免不必要的重绘。
2. 利用硬件加速高效实现某些 UI 特性。

根据 Composited Layer 的这两个特点，可以总结出以下几点优化措施。


#### 使用 `transform` 和 `opacity` 属性来实现动画
上文我们说过像素管道的 Layout 和 Paint 部分是可以略过，只进行 Composite 的。实现这种渲染方式的方法很简单，就是使用只会触发 Composite 的 CSS 属性；目前，满足这个条件的 CSS 属性，只有 `transform` 和 `opacity`。

![触发 Composite 的属性](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/compositer-layer-attr.jpg)

使用 `transform` 和 `opacity` 需要注意的是：元素必须是 Composited Layer；如果不是，Paint 还是会照常触发（Layout 要看情况，一般 `transform` 会触发）。来看一个例子：

```HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <style>
    .div {
      width: 100px;
      height: 100px;
      background-color: #f00;
      /* will-change: transform; */
    }
  </style>
  <title>性能优化</title>
</head>

<body>
  <div class="div"></div>
  <script>
    const div = document.querySelector(".div");
    const run = () => {
      div.style.transform = "translate(0, 100px)";
    };
    setTimeout(run, 2000);
  </script>
</body>
</html>
```

我们将使用 `transform` 来向下位移，开始我们先不把 `div` 节点提升为 Composited Layer；通过下图可以看到：还是会触发 Layout 和 Paint 的。

![不是合成层触发 Paint](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/no-composite-paint.png)

这时，把 `div` 节点提升为 Composited Layer，我们发现 Layout 和 Paint 已经被略过了，符合我们的预期。

![合成层不触发 Paint](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/composite-not-paint.png)


#### 减少绘制的区域
如果不能避免绘制，我们就应该尽可能减少需要重绘的区域。例如，页面顶部有一块固定区域，当页面某个其他区域需要重绘的时候，很可能整块屏幕都要重绘，这时，固定区域也会被波及到。像这种情况，我们就可以把需要重绘或者受到影响的区域提升为 Composited Layer，避免不必要的绘制。

提升成 Composited Layer 的最佳方式是使用 CSS 的 `will-change` 属性，它的详细说明可以查看 [MDN](https://developer.mozilla.org/zh-CN/docs/Web/CSS/will-change) 的文档。

```CSS
.element {
  will-change: transform;
}
```

对于不支持的浏览器，最简单的 hack 方法，莫过于使用 3D 变形来提升为 Composited Layer 了。

```CSS
.element {
  transform: translateZ(0);
}
```

根据上文所讲的例子，我们尝试使用 `will-change` 属性来让固定区域避免重绘。

```HTML
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <style>
    .div {
      width: 100px;
      height: 100px;
      background-color: #f00;
    }
    .header {
      position: fixed;
      z-index: 9999;
      width: 100%;
      height: 50px;
      background-color: #ff0;
      /* will-change: transform; */
    }
  </style>
  <title>性能优化</title>
</head>

<body>
  <header class="header">固定区域</header>
  <div class="div">变动区域</div>
  <script>
    const div = document.querySelector(".div");
    const run = () => {
      div.style.opacity = 0.5;
    };
    setTimeout(run, 2000);
  </script>
</body>
</html>
```

首先，我们来看下没有经过优化的情况；顺带说明查看浏览器一帧绘制详情的过程。

1. 打开控制台的 Performance 界面。
2. 点击设置（标记 1），开启绘制分析仪（标记 2）。
3. 启动 Record（标记 3），获取到想要的信息后，点击 Stop（标记 4）， 停止 Record。
4. 点击这一帧的 Paint（标记 5）查看绘制详情。
5. 切换到 Paint Profiler 选项卡（标记 6），查看绘制的步骤。

![调试准备](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/debug-preparation.png)

![停止调试](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/debug-stop.png)

![分析调试](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/debug-analysis.png)

通过上面的图片（标记 7 和标记 8）可以看到，固定区域的确被波及到，并且触发重绘了。我们再对比使用 `will-change` 属性优化过的情况，发现固定区域没有触发重绘。

![使用 will-change](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/will-change-after.png)

并且，我们也可以通过一帧（标记 1）的布局详情（标记 2），查看固定区域（标记 3）是不是提升成 Composited Layer（标记 4），才避免的不必要绘制。

![帧分析](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/frame-analysis.png)

#### 合理管理 Composited Layer
提升成 Composited Layer 的确会优化性能；但是，要知道创建一个新的 Composited Layer 必须要额外的内存和管理，这是非常昂贵的代价。所以，在内存资源有限的设备上，Composited Layer 带来的性能提升，很可能远远抵不上创建多个 Composited Layer 的代价。同时，由于每一个 Composited Layer 的位图都需要上传到 GPU；所以，不免需要考虑 CPU 和 GPU 之间的带宽以及用多大内存处理 GPU 纹理的问题。

我们通过 1000 个 `div` 节点，来对比普通图层与提升成 Composited Layer 之后的内存使用情况。可以发现差距还是比较明显的。

![提升前内存](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/memory-before.png)

![提升后内存](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/memory-after.png)

##### 最小化提升
通过上文的说明，我们知道 Composited Layer 并不是越多越好。尤其是，千万不要通过下面的代码提升页面的所有元素，这样的资源消耗将是异常恐怖的。

```CSS
* {
  /* or transform: translateZ(0) */
  will-change: transform;
}
```

最小化提升，就是要尽量降低页面 Composited Layer 的数量。为了做到这一点，我们可以不把像 `will-change` 这样能够提升节点为 Composited Layer 的属性写在默认状态中。至于这样做的原因，我会在下面讲解。

看这个例子，我们先把 `will-change` 属性写在默认状态里；然后，再对比去掉这个属性后渲染的情况。

```CSS
.box {
  width: 100ox;
  height: 100px;
  background-color: #f00;
  will-change: transform;
  transition: transform 0.3s;
}
.box:hover {
  transform: scale(1.5);
}
```

使用 `will-change` 属性提升的 Composited Layer：

![提升成合成层的动画开始](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/composite-animation-start.png)

![提升成合成层的动画运行](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/composite-animation-run.png)

![提升成合成层的动画结束](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/composite-animation-end.png)

普通图层：

![普通图层的动画开始](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/not-composite-animation-start.png)

![普通图层的动画运行](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/not-composite-animation-run.png)

![普通图层的动画结束](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/not-composite-animation-end.png)

我们发现区别仅在于，动画的开始和结束，会触发重绘；而动画运行的时候，删除或使用 `will-change` 是没有任何分别的。

我们在构建 Graphics Layer Tree 的时候讲到过这样一条理由：

> 对 opacity、transform、fliter、backdropfilter 应用了 animation 或者 transition（需要是 active 的 animation 或者 transition，当 animation 或者 transition 效果未开始或结束后，提升的 Composited Layer 会恢复成普通图层）。

这条理由赐予了我们动态提升 Composited Layer 的权利；因此我们应该多利用这一点，来减少不必要的 Composited Layer 的数量。

##### 防止层爆炸
我们在 Graphics Layer Tree 中介绍过层爆炸，它指的是由于重叠而导致的大量额外 Composited Layer 的问题。浏览器的层压缩可以在很大程度上解决这个问题，但是，有很多特殊的情况，会导致 Composited Layer 无法被压缩；这就很可能产生一些不在我们预期中的 Composited Layer，也就是说还是会出现大量额外的 Composited Layer。

在层压缩这一节，我们已经给出了使用层压缩优化的例子，这里就不再重复了。下面再通过解决一个无法被层压缩的例子，来更为深入的了解如何防止层爆炸。

```HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <style>
    .animating {
      width: 300px;
      height: 30px;
      line-height: 30px;
      background-color: #ff0;
      will-change: transform;
      transition: transform 3s;
    }

    .animating:hover {
      transform: translateX(100px);
    }

    ul {
      padding: 0;
      border: 1px solid #000;
    }

    .box {
      position: relative;
      display: block;
      width: auto;
      background-color: #00f;
      color: #fff;
      margin: 5px;
      overflow: hidden;
    }

    .inner {
      position: relative;
      margin: 5px;
    }
  </style>
  <title>性能优化</title>
</head>

<body>
  <div class="animating">动画</div>
  <ul>
    <li class="box">
      <p class="inner">提升成合成层</p>
    </li>
    <li class="box">
      <p class="inner">提升成合成层</p>
    </li>
    <li class="box">
      <p class="inner">提升成合成层</p>
    </li>
    <li class="box">
      <p class="inner">提升成合成层</p>
    </li>
    <li class="box">
      <p class="inner">提升成合成层</p>
    </li>
  </ul>
</body>
</html>
```

当我们的鼠标移入 `.animating` 元素的时候，通过查看 Layers 面板，可以很清晰的看到出现的大量 Composited Layer。

![大量合成层](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/a-lot-of-composite-layers.png)

这个例子虽然表面上看起来没有发生重叠；但是，因为在运行动画的时候，很可能与其他元素造成重叠，所以 `.animating` 元素会假设兄弟元素在一个 Composited Layer 之上。这时，又因为 `.box` 元素设置了 `overflow: hidden;` 导致自己与 `.animating` 元素有了不同的裁剪容器（Clipping Container），所以就出现了层爆炸的现象。

解决这个问题的办法也很简单，就是让 `.animating` 元素的 `z-index` 比其他兄弟元素高。因为 Composited Layer 在普通元素之上，所以也就没有必要提升普通元素，修正渲染顺序了。这里我在顺便多说一句，默认情况下 Composited Layer 渲染顺序的优先级是比普通元素高的；但是在普通元素设置 `position: relative;` 之后，因为层叠上下文，并且在文档流后面的原因，所以会比 Composited Layer 的优先级高。

```CSS
.animating {
  position: relative;
  z-index: 1;
  ...
}
```

![正常合成层](https://github.com/Sam618/Blog/raw/master/performance-rendering/assets/normal-composite-layer.png)

当然，如果兄弟元素一定要覆盖在 Composited Layer 之上，那我们也可以把 `overflow: hidden;` 或者 `position: relative;` 去掉，来优化 Composited Layer 创建的数量或者直接就不创建 Composited Layer。

#### 参考资料
1. [无线性能优化：Composite](http://taobaofed.org/blog/2016/04/25/performance-composite/)
2. [坚持仅合成器的属性和管理层计数](https://developers.google.com/web/fundamentals/performance/rendering/stick-to-compositor-only-properties-and-manage-layer-count)
3. [简化绘制的复杂度、减小绘制区域](https://developers.google.com/web/fundamentals/performance/rendering/simplify-paint-complexity-and-reduce-paint-areas)
4. [CSS Animation性能优化](https://www.w3cplus.com/animation/animation-performance.html)
5. [使用CSS3 will-change提高页面滚动、动画等渲染性能](https://www.zhangxinxu.com/wordpress/2015/11/css3-will-change-improve-paint/)
6. [CSS3硬件加速也有坑](https://div.io/topic/1348)
7. [深入理解CSS中的层叠上下文和层叠顺序](https://www.zhangxinxu.com/wordpress/2016/01/understand-css-stacking-context-order-z-index/)

## 总结
本文首先讲了渲染需要构建的一些树，然后通过这些树与像管道各部分的紧密联系，整理了一些优化措施。例如，我们对合成所进行的优化措施，就是通过 Graphics Layer Tree 来入手的。

优化也不能盲目去做，例如，提升普通图层为 Composite Layer 来说，使用不当，反而会造成非常严重的内存消耗。应当善加利用 Google 浏览器的调试控制台，帮助我们更加详尽的了解网页各方面的情况；从而有针对性的优化网页。

文章参考了很多资料，这些资料都在每一节的末尾给出。它们具有非常大的价值，有一些细节，本文可能并没有整理，可以通过查看它们来更为深入的了解。