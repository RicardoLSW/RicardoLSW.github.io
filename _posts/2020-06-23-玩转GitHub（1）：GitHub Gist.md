---
classes: wide
title: "玩转GitHub（1）：GitHub Gist"
last_modified_at: 2020-06-23 10:51:29
categories:
  - 工具
tags:
  - GitHub
---

### 前言

我们平时的工作中，`GitHub`是必不可少的代码托管平台，但是大多数同学也只是把它做为了托管代码的地方，并没有合理的去运用。

其实`GitHub`里面有非常多好玩或者有趣的地方的。当然，这些技巧也能对你的工作效率有很大的提升。

这里整理了一些比较常用一些功能/技巧，也希望能给大家的工作带来一些帮助！

### GitHub Gist介绍

Github作为代码分享平台在开发者中非常流行。此平台托管了包括游戏、书籍以至于字体在内的千万个项目，这使其成为互联网上最大的代码库。

GitHub还有另一个非常有用的功能，那就是Gist。

我们通常用它来存放代码片段，但Gist不仅仅是为了这些，我们每个人都可以用到它，如果您听说过类似Pastebin或者 Pastie这样的web应用的话，那你就可以看到它们和Gist很像。

你甚至不需要有GitHub账号就能使用它，用浏览器直接打开[gist.github.com](https://gist.github.com)，也可以在GitHub下面选择New gist来创建一个gist：

![image-20200623131804508](https://blog.ricardolsw.com/image/2Z92jQdYlilUeSjsNdw9kzuEqtmEA6YP.jpg)

然后在窗口中输入你想说的，点击创建，一个gist就创建好了：

![image-20200623131923747](https://blog.ricardolsw.com/image/PNhr2FpF9Jd18ekC8FhovtuNyiDGFRox.jpg)

> 你也可以创建一个私有gist

### 嵌入到页面中

我们创建好一个gist之后，我们选择Embed，可以拿到一个`script`标签，它可以嵌入到任意网页中，即可在相应的网页中嵌入来自`Gist`的数据，并保持语法高亮等功能。例如，我们新建一个html把这个script标签粘贴过去就会看到下面这样的效果：

![image-20200623133304254](https://blog.ricardolsw.com/image/XXMdQab5VzpTNqPoHP9JDneISgh3MhSD.jpg)

![image-20200623133109851](https://blog.ricardolsw.com/image/lrTaOFWAEeqMuFv5eaoTIbO3cFedhcSP.jpg)

![image-20200623133128531](https://blog.ricardolsw.com/image/fmknzCLFAcJo4IEy07EJjGIOyKby3bRn.jpg)

> 它就像Markdown代码块一样，看起来非常的舒服

### Cacher工具

我觉得这样在web页上一个一个添加管理gist太麻烦了，然后我就发现一款工具，对于管理gist非常方便，[Cacher](https://www.cacher.io/)是一款管理和快速创建gist的工具，使用起来也很方便，可以使用GitHub账号登录，所有创建的gist都会同步到GitHub Gist上面，也可以给gist添加标签分类什么的便于查找。

![image-20200623134204986](https://blog.ricardolsw.com/image/SNXWEIEaP7Arbhhua34pShDCzgONDJAs.jpg)

Cacher还可以运行你的代码片段，如下图：

1. 开启web服务，运行代码

   ![image-20200623134958682](https://blog.ricardolsw.com/image/vGCR91eFW0nZCWFGAoyAUiK7OQArhVeh.jpg)

2. 然后它就跑起来了呀

   ![image-20200623135127706](https://blog.ricardolsw.com/image/aRh3dqlZefeNThjfPBPddvrVWLpwZHf3.jpg)

### 奇怪的知识又增加了-Cacher插件

看到这里你们可能会想，我存这么些个代码片段干嘛呢？那么我告诉你萌，一切都是为了更愉快的摸鱼~这让我从此告别复制粘贴，只需要点点点~

Cacher在Idea和VSCode等IDE都有同款插件，以webstorm为例，在插件中心下载安装好Cacher插件之后，登陆上自己的账号，就看到下面这样的工具栏：

![image-20200623140141546](https://blog.ricardolsw.com/image/I2Z2pgoBN6msXWlH8Kb8QoQkkmPQaeai.jpg)

这玩意能干嘛用呢？就比如说吧，我要封装一些axios的常用的请求，手写嫌麻烦，从别的项目复制粘贴我也嫌麻烦，我们可以通过下面的Cacher工具栏，双击`Axios封装（2）`标题，它的代码就可以快速插入到我们的项目代码中。以后碰到优秀的、常用的代码片段，我们都可以存起来，方便每一次使用~

![真香](https://blog.ricardolsw.com/image/vPS1LEaByheP3VzeRFtVZFpnG7kHrndE.jpg)



