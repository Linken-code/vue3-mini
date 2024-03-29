// rollup打包

//获取文件
const fs = require('fs');
const execa = require('execa');
//获取打包目录,过滤文件夹
const dirs = fs.readdirSync("packages").filter(f => fs.statSync(`packages/${f}`).isDirectory())

//进行打包,并行打包
const build = async(target) => {
    //execa -c执行rollup配置,环境变量-env
    await execa("rollup", ['-c', '--environment', `TARGET:${target}`], { stdio: "inherit" }) //子进程的输出在父包中输出
}

const runParaller = async(dirs, fn) => {
        let result = []
            //遍历
        for (let item of dirs) {
            result.push(fn(item))
        }
        return Promise.all(result) //存放打包的promise，等待这里的打包执行完毕之后，调用成功
    }
    //打包全部文件
runParaller(dirs, build)
    .then(() => { //promise
        console.log("打包成功");
    })
    .catch(err => console.error(err));