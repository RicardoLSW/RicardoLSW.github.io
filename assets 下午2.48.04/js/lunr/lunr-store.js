var store = [{
        "title": "iOS端UI控件-循环滚动表格",
        "excerpt":"前言 学习iOS开发一个多月了，最近做项目的时候碰到一个这样的需求：一个展示数据的面板，里面有一个表格，表格的数据循环滚动。类似下图： 我这个人又比较懒，一开始直接上Google看看有没有现成的控件使用，翻了半天也没找到一些能用的东西，基本上都满足不了我的需求，然后我就打算自己写一个用吧，有一篇文章的思路倒是给了我很大的启发，这篇文章讲述的代码使用swift写的，由于我用的是Objective-C，最后我自己封装了一个控件。 思路 控件：一个父view，一个headerView，两个TableView。其中headerView是表头，两个TableView加载的是相同的数据。父视图的clipsToBounds属性一定要设置为YES。 滚动：如何让它滚动起来呢？这里我用的是一个定时器，通过控制时间间隔和位移距离，让其滚动的效果平滑顺畅。 循环：如何让其循环滚动呢？在第1步中使用到的两个TableView，把这两个TableView上下拼接起来，当地一个TableView滚动出视图外的时候，就把它移到第二个TableView的下面，如此循环往复就实现的循环滚动。 代码 新建ScrollTableView.h和ScrollTableView.m，其中ScrollTableView.h代码如下： #import &lt;UIKit/UIKit.h&gt; NS_ASSUME_NONNULL_BEGIN @interface LSWScrollTableView : UIView /** * * @param frame 位置 * @param columns 表头数据 [{key:\"\", value:\"\", width:\"\"}, ...] key为表头名字，value为与表头对应的字段，width为单元格宽度 * @param data 表格数据 * @param cellHeight 单元格高度 * @param headerHeight 表头高度 * @param cellBackgroundColor 单元格背景色只支持斑马纹 需要传两个UIColor组成的数组，例：@[[UIColor redColor], [UIColor...","categories": ["Blog"],
        "tags": ["Objective-C"],
        "url": "http://localhost:4000/blog/iOS%E7%AB%AFUI%E6%8E%A7%E4%BB%B6-%E5%BE%AA%E7%8E%AF%E6%BB%9A%E5%8A%A8%E8%A1%A8%E6%A0%BC/",
        "teaser": null
      },{
        "title": "webpack基础",
        "excerpt":"前言 webpack是一款非常流行的前端用于构建自动化开发的工具，与之前的gulp和grunt功能非常相似，它们都是一款通过JavaScript来构建Web网站的自动化工具！ 本质上，webpack是一个现代JavaScript应用程序的静态模块打包器(module bundler)。当webpack处理应用时，它会递归构建一个依赖关系图(dependency graph)，其中包含应用程序需要的每个模块，然后将所有这些模块打包成一个或多个bundle。 我们可以通过下面的一张图来理解这一部分功能 webpack可以让一切都变得非常简单，它提倡模块化进行开发，并提供通过工具的操作简化和提高前端开发工作 入门 webpack是基于NodeJs平台运行的，所以，在使用webpack之前，请先保证自己的开发环境下有NodeJs的运行环境 安装webpack 目前最新的webpack版本是：4.42.1。要安装最新版本或者特定版本，运行以下命令： $ npm install --save-dev webpack $ npm install --save-dev webpack@&lt;version&gt; 如果使用webpack 4+ 版本，你还需要安装CLI。 $ npm install --seve-dev webpack-cli 编写JS代码，通过webpack来进行打包处理 我在上面的代码中，创建了一个app.js和person.js，然后在app.js中通过ES6的模块化开发，引入这个文件。 正常情况下，我们是不可能在浏览器中使用export与import等这些关键字的，现在，我们可以在这里通过webpack来处理一下 $ webpack app.js -o bundle.js 说明：上面的命令是将app.js通过webpack打包以后，编译成bundle.js，打包完成以后，我们就可以在浏览器中正常使用这个JS文件了，下面编译过后的代码： 运行结果如图： 通过上面的入门，我们可以得出以下结论： webpack可以将ES6的代码转换成我们浏览器能使用的代码（正常情况下，ES6的代码需要在NodeJS环境下面才能够运行） 我们可以通过webpack进行模块化开发，同时，在模块化开发的过程中，把这些模块化的代码运行在浏览器上面 在这里，我们的NodeJs的一切比较良好的模块化开发特性，以及ES6甚至更高的一些高效语法就可以在这里进行使用了。 webpack.config.js的配置 在上面的入门代码里面，我们知道，如果要把我们的代码进行打包处理，则需要手动的去执行一条命令，但是这样操作非常麻烦，我们不可能每次更改代码后都去手动的执行一次命令，这个时候，我们可以通过一个配置文件，来配置我们的webpak操作。 webpack的配置文件，我们一般命名为webpack.config.js这个文件，在这个文件里，有四大部分，如下： 入口（entry） 出口（output） loader 插件（plugins）...","categories": ["Blog"],
        "tags": ["JavaScript"],
        "url": "http://localhost:4000/blog/webpack%E5%9F%BA%E7%A1%80/",
        "teaser": null
      },{
        "title": "Vue使用ESLint+Prettier格式化代码",
        "excerpt":"前言 代码规范是程序员的根本，入门第一步，从规范代码开始，而ESLint就是一款检查JavaScript代码风格/错误的工具，其他类似的还有TSLint、stylelint。 ESLint包含三个功能： 检查语法 发现错误 格式化代码 而下面介绍的Prettier就只有格式化代码这个功能。Perttier只是一个代码格式化工具，只负责格式化代码。那么为什么要把ESLint的格式化代码交给Perttier来做呢？ 更好更先进的代码规范 支持更多的语言 安装依赖 $ npm install @vue/cli-plugin-eslint @vue/eslint-config-prettier eslint-plugin-prettier eslint-plugin-vue prettier eslint babel-eslint @vue/eslint-config-airbnb --save-dev \"devDependencies\": { \"@vue/cli-plugin-eslint\": \"^4.1.0\", \"@vue/eslint-config-airbnb\": \"^4.0.0\", \"@vue/eslint-config-prettier\": \"^6.0.0\", \"babel-eslint\": \"^10.0.3\", \"eslint\": \"^5.16.0\", \"eslint-plugin-prettier\": \"^3.1.3\", \"eslint-plugin-vue\": \"^5.0.0\", \"prettier\": \"^2.0.5\", } 修改配置文件 以package.json为例，这是我自己写的一个简单配置，在package.json写入以下配置： \"eslintConfig\": { \"root\": true, \"env\": { \"node\":...","categories": ["Blog"],
        "tags": ["JavaScript"],
        "url": "http://localhost:4000/blog/Vue%E4%BD%BF%E7%94%A8ESlint+Prettier%E6%A0%BC%E5%BC%8F%E5%8C%96%E4%BB%A3%E7%A0%81/",
        "teaser": null
      },{
        "title": "Vue从零开始（1）：前端环境搭建",
        "excerpt":"前言 Vue是一套用于构建用户界面的渐进式框架。与其它大型框架不同的是，Vue被设计为可以自底向上逐层应用。Vue的核心库只关注视图层，不仅易于上手，还便于与第三方库或既有项目整合。另一方面，当与现代化的工具链以及各种支持类库结合使用时，Vue也完全能够为复杂的单页应用提供驱动。 本系列将带着大家从零开始快速入门Vue。 环境搭建 1.安装nvm（Node.js版本管理器） Node.js是一个基于Chrome V8引擎的JavaScript运行环境，它是一个让JavaScript运行在服务端的开发平台。目前Node.js最新版本为v14.0.0。由于Node.js更新速度快，有时候新版本还会将旧版本的一些API废除，以至于写好的代码不能向下兼容。为了应对这种情况，我们可以使用nvm管理器，它是一款Node.js版本管理器，它能够在一台机器上维护多个版本的Node.js，可以按需切换。 Mac使用curl或者wget方式安装nvm： $ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash $ wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash Windows安装在这里，下载安装包进行安装。 安装完成后，输入nvm --version查看当前安装版本： $ nvm --version 使用nvm安装Node.js： $ nvm install 10.19.0 #安装指定版本Node.js(v10.19.0) 安装完成后使用nvm ls查看当前安装的Node.js列表（我这里还安装了v8.12.0和v13.13.0两个版本）： $ nvm ls 上面第四行：default -&gt; 10 (-&gt; v10.19.0) 表示当前所使用的默认版本是v10.19.0 使用nvm alias default &lt;version&gt;指定全局默认的Node.js版本，使用nvm use &lt;version&gt;将Node.js切换至指定版本。 注意：nvm...","categories": ["Vue从零开始"],
        "tags": ["Vue"],
        "url": "http://localhost:4000/vue%E4%BB%8E%E9%9B%B6%E5%BC%80%E5%A7%8B/Vue%E4%BB%8E%E9%9B%B6%E5%BC%80%E5%A7%8B-1-%E5%89%8D%E7%AB%AF%E7%8E%AF%E5%A2%83%E6%90%AD%E5%BB%BA/",
        "teaser": null
      },{
        "title": "Vue从零开始（2）：使用Vue CLI快速生成项目脚手架",
        "excerpt":"前言 上一篇讲到如何搭建前端环境，这一篇我们开始使用Vue CLI来快速生成一个Vue的项目脚手架。 目前Vue CLI有两个版本，新版本Vue CLI3对应@vue/cli，老版本Vue CLI2对应vue-cli。这里分别介绍这两个版本如何创建一个项目。 首先全局安装这两个的其中一个（看过我第一篇已经安装过的可以忽略掉）： $ cnpm install -g @vue/cli $ cnpm install -g vue-cli 注意：在同一个环境安装Vue CLI3和Vue CLI2的话，因为他们都是用相同的vue命令，Vue CLI2会被覆盖掉，这时候想要使用Vue CLI2的vue init来搭建项目的话，需要全局安装一个桥接工具： $ cnpm install -g @vue/cli-init 使用Vue CLI3创建一个项目 运行以下命令创建一个项目： $ vue create vue-demo 选择Manually select features进行手动配置： 依次勾选Babel (语法编译器)、Router (Vue路由)、Vuex (Vue全局状态管理)、CSS Pre-processors (CSS预处理)、Linter/Formatter (代码检查/格式化) 询问是否使用history模式的路由，它的区别是使用history模式的话url不会带有#，这里我们选择y 选择一种CSS的类型，这里我们使用sass，选择第一个Sass/SCSS (with dart-sass)...","categories": ["Vue从零开始"],
        "tags": ["Vue"],
        "url": "http://localhost:4000/vue%E4%BB%8E%E9%9B%B6%E5%BC%80%E5%A7%8B/Vue%E4%BB%8E%E9%9B%B6%E5%BC%80%E5%A7%8B-2-%E4%BD%BF%E7%94%A8Vue-CLI%E5%BF%AB%E9%80%9F%E7%94%9F%E6%88%90%E9%A1%B9%E7%9B%AE%E8%84%9A%E6%89%8B%E6%9E%B6/",
        "teaser": null
      },{
        "title": "Vue从零开始（3）：创建页面+添加路由+Mock模拟数据",
        "excerpt":"前言 本来这篇想讲讲怎么打包项目的，但是刚好最近在做一个后台维护的前端项目，然后想想打包这部分可以往后放一放，可以先通过这个项目讲一讲怎么创建页面、添加路由然后如何使用Mock模拟数据。 上一篇大家对于Vue CLI搭建脚手架有了一些了解，这篇介绍一款比较容易上手的企业级中后台前端/设计解决方案Ant Design Pro。它基于Ant Design Vue并提供了一些常用的模板、组件，可以帮助你快速搭建企业级中后台产品原型。 创建项目 创建一个名为my-project的项目： $ git clone --depth=1 https://github.com/sendya/ant-design-pro-vue.git my-project 目录结构 ├── public │ └── logo.png # LOGO | └── index.html # Vue 入口模板 ├── src │ ├── api # Api ajax 等 │ ├── assets # 本地静态资源 │ ├── config # 项目基础配置，包含路由，全局设置 │...","categories": ["Vue从零开始"],
        "tags": ["Vue"],
        "url": "http://localhost:4000/vue%E4%BB%8E%E9%9B%B6%E5%BC%80%E5%A7%8B/Vue%E4%BB%8E%E9%9B%B6%E5%BC%80%E5%A7%8B-3-%E5%88%9B%E5%BB%BA%E9%A1%B5%E9%9D%A2+%E6%B7%BB%E5%8A%A0%E8%B7%AF%E7%94%B1+Mock%E6%A8%A1%E6%8B%9F%E6%95%B0%E6%8D%AE/",
        "teaser": null
      },{
        "title": "Typora配置图床",
        "excerpt":"待更新。。。   ","categories": ["Blog"],
        "tags": ["Typora","图床"],
        "url": "http://localhost:4000/blog/Typora%E9%85%8D%E7%BD%AE%E5%9B%BE%E5%BA%8A/",
        "teaser": null
      }]
