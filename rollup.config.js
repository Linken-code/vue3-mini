   // 通过rollup进行打包

   //引入相关依赖
   import ts from 'rollup-plugin-typescript2' //解析ts
   import json from '@rollup/plugin-json' //解析json
   import resolvePlugin from '@rollup/plugin-node-resolve' //解析第三方插件
   import path from 'path' // 处理路径
   //获取全部打包文件(路径)
   let packagesDir = path.resolve(__dirname, 'packages')

   //获取单个需要打包的文件
   let packageDir = path.resolve(packagesDir, process.env.TARGET)

   //获取到每个包的项目配置
   const resolve = p => path.resolve(packageDir, p)
   const pkg = require(resolve(`package.json`))
   const packageOptions = pkg.buildOptions || {}
   const name = path.basename(packageDir)
       //创建格式打包
   const outputOPtions = {
       "esm-bundler": {
           file: resolve(`dist/${name}.esm-bundler.js`),
           format: 'es'
       },
       "cjs": {
           file: resolve(`dist/${name}.cjs.js`),
           format: 'cjs'
       },
       "global": {
           file: resolve(`dist/${name}.global.js`),
           format: 'iife'
       }
   }

   //导出配置
   const createConfig = (format, output) => {
       //进行打包
       output.name = packageOptions.name
       output.sourcemap = true
           //生成rollup配置
       return {
           input: resolve("src/index.ts"), //入口文件
           output,
           plugins: [
               json(), //解析json
               ts({ //解析ts
                   tsconfig: path.resolve(__dirname, "tsconfig.json")
               }),
               resolvePlugin() //解析第三方插件
           ]
       }
   }
   export default packageOptions.formats.map(format => createConfig(format, outputOPtions[format]))