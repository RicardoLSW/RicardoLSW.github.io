var store = [{
        "title": "iOS端UI控件-循环滚动表格",
        "excerpt":"前言 学习iOS开发一个多月了，最近做项目的时候碰到一个这样的需求：一个展示数据的面板，里面有一个表格，表格的数据循环滚动。类似下图： 我这个人又比较懒，一开始直接上Google看看有没有现成的控件使用，翻了半天也没找到一些能用的东西，基本上都满足不了我的需求，然后我就打算自己写一个用吧，有一篇文章的思路倒是给了我很大的启发，这篇文章讲述的代码使用swift写的，由于我用的是Objective-C，最后我自己封装了一个控件。 思路 控件：一个父view，一个headerView，两个TableView。其中headerView是表头，两个TableView加载的是相同的数据。父视图的clipsToBounds属性一定要设置为YES。 滚动：如何让它滚动起来呢？这里我用的是一个定时器，通过控制时间间隔和位移距离，让其滚动的效果平滑顺畅。 循环：如何让其循环滚动呢？在第1步中使用到的两个TableView，把这两个TableView上下拼接起来，当地一个TableView滚动出视图外的时候，就把它移到第二个TableView的下面，如此循环往复就实现的循环滚动。 代码 新建ScrollTableView.h和ScrollTableView.m，其中ScrollTableView.h代码如下： #import &lt;UIKit/UIKit.h&gt; NS_ASSUME_NONNULL_BEGIN @interface LSWScrollTableView : UIView /** * * @param frame 位置 * @param columns 表头数据 [{key:\"\", value:\"\", width:\"\"}, ...] key为表头名字，value为与表头对应的字段，width为单元格宽度 * @param data 表格数据 * @param cellHeight 单元格高度 * @param headerHeight 表头高度 * @param cellBackgroundColor 单元格背景色只支持斑马纹 需要传两个UIColor组成的数组，例：@[[UIColor redColor], [UIColor...","categories": ["移动端"],
        "tags": ["Objective-C"],
        "url": "/%E7%A7%BB%E5%8A%A8%E7%AB%AF/iOS%E7%AB%AFUI%E6%8E%A7%E4%BB%B6-%E5%BE%AA%E7%8E%AF%E6%BB%9A%E5%8A%A8%E8%A1%A8%E6%A0%BC/",
        "teaser": null
      },{
        "title": "webpack基础",
        "excerpt":"前言 webpack是一款非常流行的前端用于构建自动化开发的工具，与之前的gulp和grunt功能非常相似，它们都是一款通过JavaScript来构建Web网站的自动化工具！ 本质上，webpack是一个现代JavaScript应用程序的静态模块打包器(module bundler)。当webpack处理应用时，它会递归构建一个依赖关系图(dependency graph)，其中包含应用程序需要的每个模块，然后将所有这些模块打包成一个或多个bundle。 我们可以通过下面的一张图来理解这一部分功能 webpack可以让一切都变得非常简单，它提倡模块化进行开发，并提供通过工具的操作简化和提高前端开发工作 入门 webpack是基于NodeJs平台运行的，所以，在使用webpack之前，请先保证自己的开发环境下有NodeJs的运行环境 安装webpack 目前最新的webpack版本是：4.42.1。要安装最新版本或者特定版本，运行以下命令： $ npm install --save-dev webpack $ npm install --save-dev webpack@&lt;version&gt; 如果使用webpack 4+ 版本，你还需要安装CLI。 $ npm install --seve-dev webpack-cli 编写JS代码，通过webpack来进行打包处理 我在上面的代码中，创建了一个app.js和person.js，然后在app.js中通过ES6的模块化开发，引入这个文件。 正常情况下，我们是不可能在浏览器中使用export与import等这些关键字的，现在，我们可以在这里通过webpack来处理一下 $ webpack app.js -o bundle.js 说明：上面的命令是将app.js通过webpack打包以后，编译成bundle.js，打包完成以后，我们就可以在浏览器中正常使用这个JS文件了，下面编译过后的代码： 运行结果如图： 通过上面的入门，我们可以得出以下结论： webpack可以将ES6的代码转换成我们浏览器能使用的代码（正常情况下，ES6的代码需要在NodeJS环境下面才能够运行） 我们可以通过webpack进行模块化开发，同时，在模块化开发的过程中，把这些模块化的代码运行在浏览器上面 在这里，我们的NodeJs的一切比较良好的模块化开发特性，以及ES6甚至更高的一些高效语法就可以在这里进行使用了。 webpack.config.js的配置 在上面的入门代码里面，我们知道，如果要把我们的代码进行打包处理，则需要手动的去执行一条命令，但是这样操作非常麻烦，我们不可能每次更改代码后都去手动的执行一次命令，这个时候，我们可以通过一个配置文件，来配置我们的webpak操作。 webpack的配置文件，我们一般命名为webpack.config.js这个文件，在这个文件里，有四大部分，如下： 入口（entry） 出口（output） loader 插件（plugins）...","categories": ["前端"],
        "tags": ["JavaScript"],
        "url": "/%E5%89%8D%E7%AB%AF/webpack%E5%9F%BA%E7%A1%80/",
        "teaser": null
      },{
        "title": "Vue使用ESLint+Prettier格式化代码",
        "excerpt":"前言 代码规范是程序员的根本，入门第一步，从规范代码开始，而ESLint就是一款检查JavaScript代码风格/错误的工具，其他类似的还有TSLint、stylelint。 ESLint包含三个功能： 检查语法 发现错误 格式化代码 而下面介绍的Prettier就只有格式化代码这个功能。Perttier只是一个代码格式化工具，只负责格式化代码。那么为什么要把ESLint的格式化代码交给Perttier来做呢？ 更好更先进的代码规范 支持更多的语言 安装依赖 $ npm install @vue/cli-plugin-eslint @vue/eslint-config-prettier eslint-plugin-prettier eslint-plugin-vue prettier eslint babel-eslint @vue/eslint-config-airbnb --save-dev \"devDependencies\": { \"@vue/cli-plugin-eslint\": \"^4.1.0\", \"@vue/eslint-config-airbnb\": \"^4.0.0\", \"@vue/eslint-config-prettier\": \"^6.0.0\", \"babel-eslint\": \"^10.0.3\", \"eslint\": \"^5.16.0\", \"eslint-plugin-prettier\": \"^3.1.3\", \"eslint-plugin-vue\": \"^5.0.0\", \"prettier\": \"^2.0.5\", } 修改配置文件 以package.json为例，这是我自己写的一个简单配置，在package.json写入以下配置： \"eslintConfig\": { \"root\": true, \"env\": { \"node\":...","categories": ["前端"],
        "tags": ["JavaScript"],
        "url": "/%E5%89%8D%E7%AB%AF/Vue%E4%BD%BF%E7%94%A8ESlint+Prettier%E6%A0%BC%E5%BC%8F%E5%8C%96%E4%BB%A3%E7%A0%81/",
        "teaser": null
      },{
        "title": "Vue从零开始（1）：前端环境搭建",
        "excerpt":"前言 Vue是一套用于构建用户界面的渐进式框架。与其它大型框架不同的是，Vue被设计为可以自底向上逐层应用。Vue的核心库只关注视图层，不仅易于上手，还便于与第三方库或既有项目整合。另一方面，当与现代化的工具链以及各种支持类库结合使用时，Vue也完全能够为复杂的单页应用提供驱动。 本系列将带着大家从零开始快速入门Vue。 环境搭建 1.安装nvm（Node.js版本管理器） Node.js是一个基于Chrome V8引擎的JavaScript运行环境，它是一个让JavaScript运行在服务端的开发平台。目前Node.js最新版本为v14.0.0。由于Node.js更新速度快，有时候新版本还会将旧版本的一些API废除，以至于写好的代码不能向下兼容。为了应对这种情况，我们可以使用nvm管理器，它是一款Node.js版本管理器，它能够在一台机器上维护多个版本的Node.js，可以按需切换。 Mac使用curl或者wget方式安装nvm： $ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash $ wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash Windows安装在这里，下载安装包进行安装。 安装完成后，输入nvm --version查看当前安装版本： $ nvm --version 使用nvm安装Node.js： $ nvm install 10.19.0 #安装指定版本Node.js(v10.19.0) 安装完成后使用nvm ls查看当前安装的Node.js列表（我这里还安装了v8.12.0和v13.13.0两个版本）： $ nvm ls 上面第四行：default -&gt; 10 (-&gt; v10.19.0) 表示当前所使用的默认版本是v10.19.0 使用nvm alias default &lt;version&gt;指定全局默认的Node.js版本，使用nvm use &lt;version&gt;将Node.js切换至指定版本。 注意：nvm...","categories": ["Vue从零开始"],
        "tags": ["Vue"],
        "url": "/vue%E4%BB%8E%E9%9B%B6%E5%BC%80%E5%A7%8B/Vue%E4%BB%8E%E9%9B%B6%E5%BC%80%E5%A7%8B-1-%E5%89%8D%E7%AB%AF%E7%8E%AF%E5%A2%83%E6%90%AD%E5%BB%BA/",
        "teaser": null
      },{
        "title": "Vue从零开始（2）：使用Vue CLI快速生成项目脚手架",
        "excerpt":"前言 上一篇讲到如何搭建前端环境，这一篇我们开始使用Vue CLI来快速生成一个Vue的项目脚手架。 目前Vue CLI有两个版本，新版本Vue CLI3对应@vue/cli，老版本Vue CLI2对应vue-cli。这里分别介绍这两个版本如何创建一个项目。 首先全局安装这两个的其中一个（看过我第一篇已经安装过的可以忽略掉）： $ cnpm install -g @vue/cli $ cnpm install -g vue-cli 注意：在同一个环境安装Vue CLI3和Vue CLI2的话，因为他们都是用相同的vue命令，Vue CLI2会被覆盖掉，这时候想要使用Vue CLI2的vue init来搭建项目的话，需要全局安装一个桥接工具： $ cnpm install -g @vue/cli-init 使用Vue CLI3创建一个项目 运行以下命令创建一个项目： $ vue create vue-demo 选择Manually select features进行手动配置： 依次勾选Babel (语法编译器)、Router (Vue路由)、Vuex (Vue全局状态管理)、CSS Pre-processors (CSS预处理)、Linter/Formatter (代码检查/格式化) 询问是否使用history模式的路由，它的区别是使用history模式的话url不会带有#，这里我们选择y 选择一种CSS的类型，这里我们使用sass，选择第一个Sass/SCSS (with dart-sass)...","categories": ["Vue从零开始"],
        "tags": ["Vue"],
        "url": "/vue%E4%BB%8E%E9%9B%B6%E5%BC%80%E5%A7%8B/Vue%E4%BB%8E%E9%9B%B6%E5%BC%80%E5%A7%8B-2-%E4%BD%BF%E7%94%A8Vue-CLI%E5%BF%AB%E9%80%9F%E7%94%9F%E6%88%90%E9%A1%B9%E7%9B%AE%E8%84%9A%E6%89%8B%E6%9E%B6/",
        "teaser": null
      },{
        "title": "Vue从零开始（3）：创建页面+添加路由+Mock模拟数据",
        "excerpt":"前言 本来这篇想讲讲怎么打包项目的，但是刚好最近在做一个后台维护的前端项目，然后想想打包这部分可以往后放一放，可以先通过这个项目讲一讲怎么创建页面、添加路由然后如何使用Mock模拟数据。 上一篇大家对于Vue CLI搭建脚手架有了一些了解，这篇介绍一款比较容易上手的企业级中后台前端/设计解决方案Ant Design Pro。它基于Ant Design Vue并提供了一些常用的模板、组件，可以帮助你快速搭建企业级中后台产品原型。 创建项目 创建一个名为my-project的项目： $ git clone --depth=1 https://github.com/sendya/ant-design-pro-vue.git my-project 目录结构 ├── public │ └── logo.png # LOGO | └── index.html # Vue 入口模板 ├── src │ ├── api # Api ajax 等 │ ├── assets # 本地静态资源 │ ├── config # 项目基础配置，包含路由，全局设置 │...","categories": ["Vue从零开始"],
        "tags": ["Vue"],
        "url": "/vue%E4%BB%8E%E9%9B%B6%E5%BC%80%E5%A7%8B/Vue%E4%BB%8E%E9%9B%B6%E5%BC%80%E5%A7%8B-3-%E5%88%9B%E5%BB%BA%E9%A1%B5%E9%9D%A2+%E6%B7%BB%E5%8A%A0%E8%B7%AF%E7%94%B1+Mock%E6%A8%A1%E6%8B%9F%E6%95%B0%E6%8D%AE/",
        "teaser": null
      },{
        "title": "将页面元素转为canvas并导出为PDF文件",
        "excerpt":"前言 这几天在做一个电子收据系统的项目，涉及到收据开具、审核、收款、打印这些功能，说道收款，就想起来前两天测试扫码付款导致我血亏7分钱巨款~诶~不提了，今天这篇主要说一下收据打印功能，收据收款完成后，需要导出PDF用于打印盖章。 原型图 代码实现 先把页面给弄出来，这里我用的Vue和Ant Design组件库： &lt;template&gt; &lt;a-card :bordered=\"false\"&gt; &lt;div class=\"flex-row\" style=\"justify-content: space-between; align-items: center;\"&gt; &lt;div class=\"flex-row\" style=\"align-items: center;\"&gt; &lt;a-avatar shape=\"square\" :size=\"16\" :src=\"icon[0]\" /&gt; &lt;span style=\" color: rgba(0, 0, 0, 0.847058823529412); font-size: 16px; font-family: 'PingFangSC-Regular', 'PingFang SC'; font-weight: 400; margin-left: 5px; \" &gt;收据&lt;/span &gt; &lt;/div&gt; &lt;a-button type=\"primary\" @click=\"print\" v-action:print&gt;收据打印&lt;/a-button&gt; &lt;/div&gt;...","categories": ["前端"],
        "tags": ["Vue","JavaScript"],
        "url": "/%E5%89%8D%E7%AB%AF/%E5%B0%86%E9%A1%B5%E9%9D%A2%E5%85%83%E7%B4%A0%E8%BD%AC%E4%B8%BAcanvas%E5%B9%B6%E5%AF%BC%E5%87%BA%E4%B8%BAPDF%E6%96%87%E4%BB%B6/",
        "teaser": null
      },{
        "title": "Vue从零开始（4）：动态路由菜单+权限控制",
        "excerpt":"前言 上一篇讲到了如何通过路由创建页面以及Mock的使用，然而在实际项目中，大部分中后台前端项目对于菜单都有一个权限控制，像某某角色只能看到这些菜单页面，某某角色只能看到另一些菜单页面，还有一些角色他们能看到同一个页面，但是其中一个只能查看看，而另一个就可以编辑。本篇文章通过一个实际的案例给大家介绍如何实现这些功能，主要涉及到Vue的以下三个知识点： Vue Router Vuex 自定义指令 需求 这是A、B、C三个角色分别所看的菜单： A角色 B角色 C角色 思路 判断是否有 AccessToken 如果没有则跳转到登录页面 获取用户信息和拥有权限store.dispatch('GetInfo') 用户信息获取成功后, 调用 store.dispatch('GenerateRoutes', userInfo) 根据获取到的用户信息构建出一个已经过滤好权限的路由结构(src/store/modules/permission.js) 将构建的路由结构信息利用 Vue-Router 提供的动态增加路由方法 router.addRoutes 加入到路由表中 加入路由表后将页面跳转到用户原始要访问的页面,如果没有 redirect 则进入默认页面 代码实现 配置路由表 首先新建一个router.config.js文件，asyncRouterMap用于存放要根据角色权限动态添加的路由，constantRouterMap用于存放基础路由，constantRouterMap这个里面的路由页面所有角色都可看见，例如登录页、注册页之类的页面可以放在这个里面 // eslint-disable-next-line import { UserLayout, BasicLayout, RouteView, BlankLayout, PageView } from '@/layouts' import { dashboard, file, tableIcon }...","categories": ["Vue从零开始"],
        "tags": ["Vue"],
        "url": "/vue%E4%BB%8E%E9%9B%B6%E5%BC%80%E5%A7%8B/Vue%E4%BB%8E%E9%9B%B6%E5%BC%80%E5%A7%8B-4-%E5%8A%A8%E6%80%81%E8%B7%AF%E7%94%B1%E8%8F%9C%E5%8D%95+%E6%9D%83%E9%99%90%E6%8E%A7%E5%88%B6/",
        "teaser": null
      },{
        "title": "玩转GitHub（1）：GitHub Gist",
        "excerpt":"前言   我们平时的工作中，GitHub是必不可少的代码托管平台，但是大多数同学也只是把它做为了托管代码的地方，并没有合理的去运用。   其实GitHub里面有非常多好玩或者有趣的地方的。当然，这些技巧也能对你的工作效率有很大的提升。   这里整理了一些比较常用一些功能/技巧，也希望能给大家的工作带来一些帮助！   GitHub Gist介绍   Github作为代码分享平台在开发者中非常流行。此平台托管了包括游戏、书籍以至于字体在内的千万个项目，这使其成为互联网上最大的代码库。   GitHub还有另一个非常有用的功能，那就是Gist。   我们通常用它来存放代码片段，但Gist不仅仅是为了这些，我们每个人都可以用到它，如果您听说过类似Pastebin或者 Pastie这样的web应用的话，那你就可以看到它们和Gist很像。   你甚至不需要有GitHub账号就能使用它，用浏览器直接打开gist.github.com，也可以在GitHub下面选择New gist来创建一个gist：      然后在窗口中输入你想说的，点击创建，一个gist就创建好了：         你也可以创建一个私有gist    嵌入到页面中   我们创建好一个gist之后，我们选择Embed，可以拿到一个script标签，它可以嵌入到任意网页中，即可在相应的网页中嵌入来自Gist的数据，并保持语法高亮等功能。例如，我们新建一个html把这个script标签粘贴过去就会看到下面这样的效果：               它就像Markdown代码块一样，看起来非常的舒服    刚刚说了，它不止于代码块，它支持非常多的文件格式，它还可以写Markdown文档，像这位老哥，把接口文档给扔上面了~      Cacher工具   我觉得这样在web页上一个一个添加管理gist太麻烦了，然后我就发现一款工具，对于管理gist非常方便，Cacher是一款管理和快速创建gist的工具，使用起来也很方便，可以使用GitHub账号登录，所有创建的gist都会同步到GitHub Gist上面，也可以给gist添加标签分类什么的便于查找。      Cacher还可以运行你的代码片段，如下图：           开启web服务，运行代码                   然后它就跑起来了呀              奇怪的知识又增加了-Cacher插件   看到这里你们可能会想，我存这么些个代码片段干嘛呢？   Cacher在Idea和VSCode等IDE都有同款插件，以webstorm为例，在插件中心下载安装好Cacher插件之后，登陆上自己的账号，就看到下面这样的工具栏：      这玩意能干嘛用呢？就比如说吧，我要封装一些axios的常用的请求，手写嫌麻烦，从别的项目复制粘贴我也嫌麻烦，我们可以直接使用之前存下来的代码片段，我们可以通过下面的Cacher工具栏，双击Axios封装（2）标题，它的代码就可以快速插入到我们的项目代码中。以后碰到优秀的、常用的代码片段，我们都可以存起来，方便使用～     ","categories": ["工具"],
        "tags": ["GitHub"],
        "url": "/%E5%B7%A5%E5%85%B7/%E7%8E%A9%E8%BD%ACGitHub-1-GitHub-Gist/",
        "teaser": null
      },{
        "title": "关于Object.entries()，你还知道Object.fromEntries()吗？",
        "excerpt":"前言 我们知道要把一个Object转换成Array，可以使用Object.entries()。但是如果你想把一个Array转换成Object怎么办？我们可以使用Object.fromEntries()，它来自ES10语法。 const keyValueArr = [ ['key1', 'value1'], ['key2', 'value2'], ]; Object.fromEntries(keyValueArr); // {key1: 'value1', key2: 'value2'} Object.fromEntries() Object是一个存储着键值对的一个东西，所以我们想要把某物转换成对象，就必须有key和value，满足这些条件的有两种： 能存储键值对的数组 Map对象 用Object.fromEntries将数组转为对象 只是存有键值对的数组： const keyValueArr = [ ['key1', 'value1'], ['key2', 'value2'], ]; 可以使用Object.fromEntries()，将数组转为对象： Object.fromEntries(keyValueArr); // { key1: \"value1\", key2: \"value2\"} 用Object.fromEntries将Map转为对象 Map来自ES6语法，创建一个Map对象： const map = new Map([ ['key1', 'value1'], ['key1',...","categories": ["前端"],
        "tags": ["JavaScript"],
        "url": "/%E5%89%8D%E7%AB%AF/%E5%85%B3%E4%BA%8EObject.entries()-%E4%BD%A0%E8%BF%98%E7%9F%A5%E9%81%93Object.fromEntries()%E5%90%97/",
        "teaser": null
      },{
        "title": "你必须知道的Git分支开发规范",
        "excerpt":"分支管理 分支命名 master 分支 master 分支为主分支，用于部署生产环境，需要确保master分支的稳定性。 此分支属于只读分支，只能从 release 分支合并过来，任何时候都不能在此分支修改代码。 所有向master分支的推送，都要打上tag标签记录，方便追溯。 此分支只能前进，不能有回退操作。 hotfix/* 分支 生产环境 bug 修复分支，基于 master 分支检出。 属于临时分支，当生产环境出现 bug ，管理员基于 tag 创建 hotfix/ 分支、 release/ 分支，由开发人员在hotfix分支修复bug，修复完成后，并且在开发集成环境自测通过、单元测试通过、Sona扫描通过后，再向 release 分支提交 pull request 申请。bug修复完成上线之后可删除此分支。 release/* 分支 release 分支为预上线分支，基于 develop 或 master 分支检出。用于准备发布新阶段版本或者修复线上bug版本。 此分支用于上线前bug测试，文档生成和其他面向发布任务。 此分支属于只读分支，只能由 master 分支或者 develop 分支检出，或者从 bugfix 分支、hotfix 分支合并过来，任何时候都不能在此分支修改代码。 此分支属于临时分支，在发布提测阶段，会以...","categories": ["工具"],
        "tags": ["git"],
        "url": "/%E5%B7%A5%E5%85%B7/%E4%BD%A0%E5%BF%85%E9%A1%BB%E7%9F%A5%E9%81%93%E7%9A%84Git%E5%88%86%E6%94%AF%E5%BC%80%E5%8F%91%E8%A7%84%E8%8C%83/",
        "teaser": null
      },{
        "title": "Flutter：WebSocket封装-实现心跳、重连机制",
        "excerpt":"前言 Flutter简介 Flutter 是 Google推出并开源的移动应用开发框架，主打跨平台、高保真、高性能。开发者可以通过 Dart语言开发 App，一套代码同时运行在 iOS 和 Android平台。 Flutter提供了丰富的组件、接口，开发者可以很快地为 Flutter添加 native扩展。同时 Flutter还使用 Native引擎渲染视图，这无疑能为用户提供良好的体验。 WebSocket简介 Http协议是无状态的，只能由客户端主动发起，服务端再被动响应，服务端无法向客户端主动推送内容，并且一旦服务器响应结束，链接就会断开(见注解部分)，所以无法进行实时通信。WebSocket协议正是为解决客户端与服务端实时通信而产生的技术，现在已经被主流浏览器支持，所以对于Web开发者来说应该比较熟悉了，Flutter也提供了专门的包来支持WebSocket协议。 注意：Http协议中虽然可以通过keep-alive机制使服务器在响应结束后链接会保持一段时间，但最终还是会断开，keep-alive机制主要是用于避免在同一台服务器请求多个资源时频繁创建链接，它本质上是支持链接复用的技术，而并非用于实时通信，读者需要知道这两者的区别。 WebSocket协议本质上是一个基于tcp的协议，它是先通过HTTP协议发起一条特殊的http请求进行握手后，如果服务端支持WebSocket协议，则会进行协议升级。WebSocket会使用http协议握手后创建的tcp链接，和http协议不同的是，WebSocket的tcp链接是个长链接（不会断开），所以服务端与客户端就可以通过此TCP连接进行实时通信。有关WebSocket协议细节，读者可以看RFC文档，下面我们重点看看Flutter中如何使用WebSocket。 话不多说，直接撸代码 添加依赖： web_socket_channel: ^1.1.0 # WebSocket 新建web_socket_utility.dart工具类： import 'dart:async'; import 'package:web_socket_channel/io.dart'; import 'package:web_socket_channel/web_socket_channel.dart'; /// WebSocket地址 const String _SOCKET_URL = 'ws://121.40.165.18:8800'; /// WebSocket状态 enum SocketStatus { SocketStatusConnected, // 已连接 SocketStatusFailed, // 失败...","categories": ["Blog"],
        "tags": ["Flutter","Dart"],
        "url": "/blog/Flutter-WebSocket%E5%B0%81%E8%A3%85-%E5%AE%9E%E7%8E%B0%E5%BF%83%E8%B7%B3-%E9%87%8D%E8%BF%9E%E6%9C%BA%E5%88%B6/",
        "teaser": null
      },{
        "title": "记一次前端项目优化实战",
        "excerpt":"前言 前几天接到某项目的一个前端问题，一个移动端的H5页面，用手机4G网打开加载要十几秒，长达十几秒的白屏让用户接受不了。第二天就跑去现场看了下问题，然后给这个项目做了一些优化，晚上回来就想着把这事给记下来整理成文档，希望能给大家在前端项目优化上有所帮助。 问题收集 在拿到代码还有去现场之前，就拿到了以下几个问题： 所有手机都会出现这个问题，我这边的三星，苹果还有客户的华为折叠屏都有这种情况。 安卓和ios在清理缓存重新打开应用后会出现这个问题。 这边的情况是在用4G网的情况下，清理手机缓存后有很大的几率会出现这个问题，这个问题是显示空白页面，无法显示内容，跟群里的截图一样。在用WiFi的情况下，清理手机缓存，然后再进应用第一次加载比较慢，但是能进去，跟前面的进不去问题不一样。 问题分析 拿到这几个问题之后我首先想到这几个点： 接口慢 网络慢 静态资源、js体积大导致加载慢 后来拿到url地址之后，我用微信开发者工具看了一下，这个微信开发者工具那来看移动端页面还是蛮方便的。我的电脑用的是WiFi（我这WiFi网速只有450k/s左右），发现加载确实有点慢，用了4s多。 然后我把网络切到Fast 3G，页面加载完花费了11s。 从图中可以看到，一个js文件达到了1.6M，WiFi下加载了4s多，问了下他们那边服务器有用到Gzip压缩，也就是说这个js原本比我们现在看到的还要大，然后找他们拿到了部署在服务器上的前端包，我发现这个js有4.8M。 看到这只能去拿代码分析了，我怀疑可能是引入了不必要的依赖导致的。 webpack插件：webpack-bundle-analyzer 分析代码之前，先讲一下这个东西，webpack-bundle-analyzer是一款webpack的可视化资源分析工具。它能够帮助我们真正的了解到包里的内容，并且能展示出各个模块在包里所占用的空间大小，最终能够帮助我们优化它。 安装依赖 # npm $ npm install --save-dev webpack-bundle-analyzer # yarn $ yarn add -D webpack-bundle-analyzer 作为插件使用 在webpack.config.js中： const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin; module.exports = { plugins: [ new BundleAnalyzerPlugin() ] } 在package.json的scripts里加入下面这条命令，就可以npm...","categories": ["前端"],
        "tags": ["Webpack"],
        "url": "/%E5%89%8D%E7%AB%AF/%E8%AE%B0%E4%B8%80%E6%AC%A1%E5%89%8D%E7%AB%AF%E9%A1%B9%E7%9B%AE%E4%BC%98%E5%8C%96%E5%AE%9E%E6%88%98/",
        "teaser": null
      },{
        "title": "Mac下使用Charles抓包工具",
        "excerpt":"介绍   Charles是Mac下常用的网络封包截取工具，在做移动开发时，我们为了调试与服务器的网络通讯协议，常常需要截取网络封包进行分析。除了在做移动开发中调试端口外，Charles 也可以用于分析第三方应用的通讯协议。配合 Charles 的 SSL 功能，Charles还可以分析 Https 协议。   Charles 通过将自己设置成系统的网络访问代理服务器，使得所有的网络访问请求都通过它来完成，从而实现了网络封包的截取和分析。   下载   这玩意收费，给你萌个破解版           百度云下载地址： https://pan.baidu.com/s/1U6oGu61qH30YyJvcFAMg4w （网盘提取密码：9ybz）            DMG 安装包打开密码 www.ifunmac.com            运行软件后，使用下面的注册信息激活即可： ￼Registered Name：macenjoy.co ￼License Key：BBF36640E8D382CAA3       界面      PC端抓包   macOS Proxy是默认勾选的，一打开Charles就开始抓取了。      但是你会发现http接口是正常的，而https接口返回的报文却是乱码。      通过查看Notes提示需要配置代理。      在Proxy→SSL Proxying Setting中include添加规则，这里我配置的*.*      重启Charles，依然报错，Notes提示需要安装根证书。      选择Help→SSL Proxying→Install Charles Root Certificate选项，在弹出的钥匙传中，双击该证书，选择信任。         重启Charles，https封包抓取正常。      移动端抓包   我手头只有iOS设备，这里只演示iOS端，其实Android端设置也差不多。   首先手机和电脑必须在同一个局域网内，在Proxy→Proxy Settings选项卡中配置端口号，这里我配的8889      然后打开手机WLAN，点击已连接WIFI右侧的感叹号。      进入页面后在最下面有一个HTTP代理-配置代理选项，选择手动，在服务器和端口分别输入电脑的ip和端口，最后点击存储。      这是电脑会弹出一个窗口，选择allow。      同样，移动端也需要安装证书，打开浏览器输入chls.pro/ssl，下载证书，安装证书。         这时候就可以正常抓取http和https请求了。      ","categories": ["工具"],
        "tags": ["工具"],
        "url": "/%E5%B7%A5%E5%85%B7/%E4%BD%BF%E7%94%A8Charles%E6%8A%93%E5%8C%85%E5%B7%A5%E5%85%B7/",
        "teaser": null
      },{
        "title": "微信小程序将页面保存成图片",
        "excerpt":"前言：这玩意是真的坑 开发环境 chameleon框架 原型图 代码实现（各种踩坑） 页面具体怎么画的这里就不多说了，具体讲保存图片这个功能，一看到这个功能就觉得似曾相识，我以前好像做过，立马想到了html2cavas这个插件，开开心心的把这玩意下载下来。这玩意怎么用我在《将页面元素转为canvas并导出为PDF文件》里面有讲到过，它需要传入一个原生DOM元素，它会把这个DOM绘制成canvas并且返回出来。 这个时候第一个坑来了 当使用document.querySelector的时候，直接报错了。 翻阅文档发现，小程序不支持上面那种方式获取DOM，需要使用小程序提供的api来获取。 但是使用该api获取到的并不是原生DOM，翻阅了很多资料也没找到解决方案，因此我就放弃了使用html2canvas这个插件。 使用chameleon多态协议调用wx.createCanvasContext 我只能老老实实的手动去把这个页面用canvas画出来，微信小程序提供了画布的相关api，但是呢，chameleon框架并不能直接访问这些api，它需要使用一个被称作多态协议的一个东西。 在src/component/html2image/下新建index.interface &lt;script cml-type=\"interface\"&gt; interface html2ImageInterface { saveImage(title: string, code: string, desc: string, img: string): void; } &lt;/script&gt; &lt;script cml-type=\"wx\"&gt; class Method implements html2ImageInterface { /** * * @param title 标题 * @param code 合同号 * @param desc 描述...","categories": ["前端"],
        "tags": ["微信小程序"],
        "url": "/%E5%89%8D%E7%AB%AF/%E5%BE%AE%E4%BF%A1%E5%B0%8F%E7%A8%8B%E5%BA%8F%E5%B0%86%E9%A1%B5%E9%9D%A2%E4%BF%9D%E5%AD%98%E6%88%90%E5%9B%BE%E7%89%87/",
        "teaser": null
      },{
        "title": "Nginx负载均衡",
        "excerpt":" ","categories": ["服务器"],
        "tags": ["网络","工具"],
        "url": "/%E6%9C%8D%E5%8A%A1%E5%99%A8/Nginx%E8%B4%9F%E8%BD%BD%E5%9D%87%E8%A1%A1/",
        "teaser": null
      },{
        "title": "Vue3前传：创建工程时必须要做的事",
        "excerpt":"前言 Vue3 跟 Vite 正式版发布有很长一段时间了，可我到现在Vue2都还没整明白，学不动了呀，Angular和React也都快忘完了。但该学还是要学，今天再开个专栏，记录下学习Vue3的过程。 言归正传，这篇主要讲怎么搭建一套规范的前端工程，这篇内容不限于Vue3，同样也适用Vue2等其他前端工程。篇幅较长，先列一下目录： 项目搭建 代码规范 提交规范 单元测试 番外：自动部署（Github Actions） 项目地址 github：https://github.com/RicardoLSW/vue-basic 技术栈 前端框架：Vue 3 构建工具：Vite 2 路由：Vue Router 4 状态管理：Vuex 4 HTTP：Axios UI框架：Ant Design Vue 2 CSS预编译：Less/Sass 代码规范：EditorConfig + Eslint + Prettier + Airbnb JavaScript Style Guide Git Hook：huksy + lint-staged 提交规范：Commitizen + Commitlint 单元测试：vue-test-utils + jest...","categories": ["Vue"],
        "tags": ["Vue3"],
        "url": "/vue/Vue3%E5%89%8D%E4%BC%A0-%E5%88%9B%E5%BB%BA%E5%B7%A5%E7%A8%8B%E6%97%B6%E5%BF%85%E9%A1%BB%E8%A6%81%E5%81%9A%E7%9A%84%E4%BA%8B/",
        "teaser": null
      },{
        "title": "番外篇：自动部署（GitHub Actions）",
        "excerpt":" ","categories": ["工具"],
        "tags": ["CI/CD"],
        "url": "/%E5%B7%A5%E5%85%B7/%E7%95%AA%E5%A4%96%E7%AF%87-%E8%87%AA%E5%8A%A8%E9%83%A8%E7%BD%B2-GitHub-Actions/",
        "teaser": null
      },{
        "title": "gitflow流程示例",
        "excerpt":"分支管理 分支命名 master 分支 master 分支为主分支，用于部署生产环境，需要确保master分支的稳定性。 此分支属于只读分支，只能从 release 分支合并过来，任何时候都不能在此分支修改代码。 所有向master分支的推送，都要打上tag标签记录，方便追溯。 此分支只能前进，不能有回退操作。 hotfix/* 分支 生产环境 bug 修复分支，基于 master 分支检出。 属于临时分支，当生产环境出现 bug ，管理员基于 tag 创建 hotfix/ 分支、 release/ 分支，由开发人员在hotfix分支修复bug，修复完成后，并且在开发集成环境自测通过、单元测试通过、Sona扫描通过后，再向 release 分支提交 pull request 申请。bug修复完成上线之后可删除此分支。 release/* 分支 release 分支为预上线分支，基于 develop 或 master 分支检出。用于准备发布新阶段版本或者修复线上bug版本。 此分支用于上线前bug测试，文档生成和其他面向发布任务。 此分支属于只读分支，只能由 master 分支或者 develop 分支检出，或者从 bugfix 分支、hotfix 分支合并过来，任何时候都不能在此分支修改代码。 此分支属于临时分支，在发布提测阶段，会以...","categories": ["工具"],
        "tags": ["git"],
        "url": "/%E5%B7%A5%E5%85%B7/gitflow%E6%B5%81%E7%A8%8B%E7%A4%BA%E4%BE%8B/",
        "teaser": null
      },{
        "title": "清明假期重庆游",
        "excerpt":"           ","categories": ["旅游"],
        "tags": ["摄影"],
        "url": "/%E6%97%85%E6%B8%B8/%E9%87%8D%E5%BA%86/",
        "teaser": null
      }]
