/*
 * @Author: Linken
 * @Date: 2021-10-24 14:26:33
 * @LastEditTime: 2021-12-27 20:43:48
 * @LastEditors: Linken
 * @Description: 学习vue3源码
 * @FilePath: \vue3-mini\scripts\dev.js
 * 仿写vue3源码，实现vue3-mini
 */
// monerepo打包

//获取文件
const execa = require('execa')
//获取打包目录,过滤文件夹

//进行打包,并行打包
const build = async target => {
  //execa -c执行rollup配置,环境变量-env cw监听
  await execa('rollup', ['-c', '--environment', `TARGET:${target}`], { stdio: 'inherit' }) //子进程的输出在父包中输出
}

//打包单个模块
build('vue')
  .then(() => {
    //promise
    console.log('打包成功')
  })
  .catch(err => console.error(err))
