---
classes: wide
title: "将页面元素转为canvas并导出为PDF文件"
last_modified_at: 2020-06-10 19:34:44
categories:
  - 前端
tags:
  - Vue
  - JavaScript
---

### 前言

这几天在做一个电子收据系统的项目，涉及到收据开具、审核、收款、打印这些功能，说道收款，就想起来前两天测试扫码付款导致我血亏7分钱巨款~诶~不提了，今天这篇主要说一下收据打印功能，收据收款完成后，需要导出PDF用于打印盖章。

### 原型图

![image-20200611075929124](https://figure-b.ricardolsw.com/image/7dSzPNKpl16QTz6xxv4NDoS2qYxmPnsj.jpg)

### 代码实现

1. 先把页面给弄出来，这里我用的Vue和Ant Design组件库：

   ```vue
   <template>
     <a-card :bordered="false">
       <div class="flex-row" style="justify-content: space-between; align-items: center;">
         <div class="flex-row" style="align-items: center;">
           <a-avatar shape="square" :size="16" :src="icon[0]" />
           <span
             style="
               color: rgba(0, 0, 0, 0.847058823529412);
               font-size: 16px;
               font-family: 'PingFangSC-Regular', 'PingFang SC';
               font-weight: 400;
               margin-left: 5px;
             "
             >收据</span
           >
         </div>
         <a-button type="primary" @click="print" v-action:print>收据打印</a-button>
       </div>
       <div class="flex-row" style="justify-content: center; align-items: center; padding: 24px;">
         <div id="print-box">
           <div id="receipt" style="width: 1000px; height: 410px; background: #fccce7;">
             <div class="flex-row" style="justify-content: center; align-items: center; position: relative;">
               <div style="padding-bottom: 3px; border-bottom: 1px solid black;">
                 <div style="font-size: 32px; padding: 5px 64px; text-align: center; border-bottom: 1px solid black;">
                   收<span style="margin: 0px 24px;"></span>据
                 </div>
               </div>
               <div style="position: absolute; right: 50px; font-size: 32px; bottom: 0px;">
                 NQ<span style="color: #0c47c0;">20200610000033</span>
               </div>
             </div>
             <div class="flex-row" style="padding: 20px 30px 0px; font-size: 18px; position: relative;">
               <div>单位：XXXXXX有限公司</div>
               <div style="position: absolute; right: 250px;">2020年6月10日</div>
             </div>
             <div
               class="flex-column"
               style="
                 margin: 10px;
                 border: 1.2px solid black;
                 height: 230px;
                 justify-content: space-between;
                 align-items: center;
                 font-size: 18px;
                 font-weight: 400;
               "
             >
               <div class="flex-row" style="width: 100%; padding: 20px 10px;">
                 <div class="flex-row">
                   <span>付款单位</span>
                   <div style="width: 400px; border-bottom: 1px solid black; padding: 0 20px;">财务部</div>
                 </div>
                 <div class="flex-row">
                   <span>付款方式</span>
                   <div style="width: 400px; border-bottom: 1px solid black; padding: 0 20px;">
                     微信支付
                   </div>
                 </div>
               </div>
               <div class="flex-row" style="width: 100%; padding: 20px 10px;">
                 <div class="flex-row">
                   <span>人民币（大写）</span>
                   <div style="width: 400px; border-bottom: 1px solid black; padding: 0 20px;">壹分</div>
                 </div>
                 <div class="flex-row">
                   <span>¥</span>
                   <div style="width: 406px; border-bottom: 1px solid black; padding: 0 20px;">0.01</div>
                 </div>
               </div>
               <div class="flex-row" style="width: 100%; padding: 20px 10px;">
                 <span>系付</span>
                 <div style="width: 906px; border-bottom: 1px solid black; padding: 0 20px;">补合格证</div>
               </div>
               <div v-if="infoData.payType === 'WEIXIN'">本收据不包含微信支付手续费，手续费费率0.6%，由微信收取。</div>
             </div>
             <div class="flex-row-space-around" style="font-size: 18px; padding: 0px 30px;">
               <div>单位公章：</div>
               <div>复核人：</div>
               <div>收款人：</div>
               <div>制单：</div>
             </div>
           </div>
         </div>
       </div>
     </a-card>
   </template>
   
   <script>
   export default {
     name: 'ReceiptPrint',
     data() {
       return {
         icon: [require('@/assets/icons/u692.png')],
       }
     },
     mounted() {},
     methods: {
       print() {},
     },
   }
   </script>
   
   <style lang="scss" scoped>
   .flex-row {
     display: flex;
     flex-flow: row nowrap;
   }
   .flex-column {
     display: flex;
     flex-flow: column nowrap;
   }
   </style>
   ```

   看下效果：

   ![image-20200611075817185](https://figure-b.ricardolsw.com/image/c8BB3xcFb7KMtOc2WiUGbPRo0ye6Uoww.jpg)

2. 接下来需要把收据这部分导出为PDF文件，这里用到了两个插件，分别是html2canvas和jspdf，其中html2canvas可以把html元素转换成canvas，jspdf可以把图片文件转换成PDF文件，而刚好canvas可以生成图片文件，并且把html转成canvas还可以做到防篡改，无法通过审查元素修改其收据内容，还能给上头加些水印啥的~

   先把依赖下下来：

   ```shell
   $ npm install --save html2canvas jspdf
   ```

   这里我封装了两个工具类：

   - html转canvas

     ```javascript
     import html2canvas from 'html2canvas'
     
     /**
      * html转canvas
      * @param parentId 父元素id
      * @param canvasId 要转换的元素id
      */
     export function toCanvas(parentId, canvasId) {
       const targetDom = document.querySelector(`#${parentId}`)
       const copyDom = targetDom.cloneNode(true)
       copyDom.style.width = targetDom.scrollWidth + 'px'
       copyDom.style.height = targetDom.scrollHeight + 'px'
       document.body.appendChild(copyDom)
       html2canvas(targetDom, {
         allowTaint: false,
         useCORS: true,
         height: targetDom.scrollHeight,
         width: targetDom.scrollWidth,
       }).then((canvas) => {
         // 给生成的canvas一个id
         canvas.setAttribute('id', canvasId)
         copyDom.parentNode.removeChild(copyDom)
         canvas.style.width = parseFloat(canvas.style.width) * 1 + 'px'
         canvas.style.height = parseFloat(canvas.style.height) * 1 + 'px'
         // 移除原来的html元素
         document.querySelector(`#${parentId}`).removeChild(document.querySelector(`#${canvasId}`))
         // 替换为canvas元素
         document.querySelector(`#${parentId}`).appendChild(canvas)
       })
     }
     ```

   - 将canvas转成图片在导出为PDF文件

     ```javascript
     import jsPDF from 'jspdf'
     /**
      * canvas转pdf导出
      * @param eleId canvas元素id
      * @param pdfName pdf文件名字
      */
     export function exportPDF(eleId, pdfName) {
       const canvas = document.querySelector(`#${eleId}`)
       // 转换为图片格式
       const pageData = canvas.toDataURL('image/jpeg', 1.0)
       const contentWidth = canvas.width
       const contentHeight = canvas.height
       // 一页pdf显示html页面生成的canvas高度;
       const pageHeight = (contentWidth / 592.28) * 841.89
       // 未生成pdf的html页面高度
       let leftHeight = contentHeight
       // 页面偏移
       let position = 0
       // a4纸的尺寸[595.28,841.89]，html页面生成的canvas在pdf中图片的宽高
       const imgWidth = 595.28
       const imgHeight = (592.28 / contentWidth) * contentHeight
       const pdf = new JSPDF('', 'pt', 'a4')
       // 有两个高度需要区分，一个是html页面的实际高度，和生成pdf的页面高度(841.89)
       // 当内容未超过pdf一页显示的范围，无需分页
       if (leftHeight < pageHeight) {
         pdf.addImage(pageData, 'JPEG', 0, 0, imgWidth, imgHeight)
       } else {
         while (leftHeight > 0) {
           pdf.addImage(pageData, 'JPEG', 0, position, imgWidth, imgHeight)
           leftHeight -= pageHeight
           position -= 841.89
           // 避免添加空白页
           if (leftHeight > 0) {
             pdf.addPage()
           }
         }
       }
       pdf.save(`${pdfName}.pdf`)
     }
     ```

   - 然后在页面上调用这两个工具类

     ```vue
     <script>
     import { exportPDF, toCanvas } from '@/utils/util'
     
     export default {
       name: 'ReceiptPrint',
       data() {
         return {
           icon: [require('@/assets/icons/u692.png')],
         }
       },
       mounted() {
         // 将print-box下面的receipt替换为canvas
         toCanvas('print-box', 'receipt')
       },
       methods: {
         print() {
           // 打印，文件名为：收据
           exportPDF('receipt', '收据')
         },
       },
     }
     </script>
     ```

   这是点击打印按钮后导出来的PDF效果

   ![image-20200611075848765](https://figure-b.ricardolsw.com/image/62UzEDmbUAE3FGucf08TxSTLN4EwR87f.jpg)

### 写在最后

功能比较简单，但是也很实用，希望能对大家有所帮助~顺带再混点积分~
