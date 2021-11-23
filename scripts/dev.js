// monerepo打包

//获取文件
const execa = require('execa');
//获取打包目录,过滤文件夹

//进行打包,并行打包
const build = async(target) => {
    //execa -c执行rollup配置,环境变量-env cw监听
    await execa("rollup", ['-c', '--environment', `TARGET:${target}`], { stdio: "inherit" }) //子进程的输出在父包中输出

}


//打包单个模块
build("reactivity")
    .then(() => { //promise
        console.log("打包成功");
    })
    .catch(err => console.error(err));