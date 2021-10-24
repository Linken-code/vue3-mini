// monerepo打包

//获取文件
const fs = require('fs');
const execa = require('execa');
//获取打包目录,过滤文件夹
const dirs = fs.readdirSync("packages").filter((p) => {
    if (!fs.statSync(`packages/${p}`).isDirectory()) {
        return false;
    }
    return p;
})

//进行打包,并行打包
const build = async(target) => {
    //execa -c执行rollup配置,环境变量-env
    await execa("rollup", ['-c', '--environment', `TARGET:${target}`], { stdio: "inherit" }) //子进程的输出在父包中输出

}

const runParaller = async(dirs, itemfn) => {
    let result = []
        //遍历
    for (let item of dirs) {
        result.push(itemfn(item))
    }
    return Promise.all(result) //存放打包的promise，等待这里的打包执行完毕之后，调用成功
}

runParaller(dirs, build)
    .then(() => { //promise
        console.log("打包成功");
    })
    .catch(err => console.error(err));