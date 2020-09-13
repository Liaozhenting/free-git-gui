import React from "react";
import Tree from "antd/lib/tree";
import { FolderOutlined, FileOutlined } from "@ant-design/icons";
import { ContextMenu, MenuItem, ContextMenuTrigger } from "react-contextmenu";
import FileDrop from "../compoenents/FileDrop";
import "./index.css";
import { pathToTree, getFiles} from "../utils/files";
import trim from "lodash/trim";
import each from "lodash/each";
const shell = window.shell;

const { ipcRenderer } = window.electron;
const { TreeNode } = Tree;

function handleClick(e, data) {
  console.log(data.foo);
}
 

function cmdFactory(_cmd){
  return new Promise((resolve, reject)=>{
    shell.exec(_cmd, (code, stdout, stderr) => {
      if(code){
        reject(stderr)
      } else {
        resolve(stdout)
      }
    })
  })
}

/**
 * 分割命令，全部执行
 * @param {string|string[]} _cmd 
 */
async function execAllCommand(_cmd){
  console.log('_cdm', _cmd)
  let commandArr
  if(typeof _cmd === 'string'){
    commandArr = _cmd.trim().split('\n');
    
  } else if(Array.isArray(_cmd)){
    commandArr = _cmd
  }
  console.log('commandArr', commandArr)
  await cmdFactory(commandArr.shift().trim())
  if(commandArr.length){
    setTimeout(()=>execAllCommand(commandArr), 2000)
  }
  
}

/**
 * 获取git log
 * @param {string} rootPath 
 */
async function getLog(rootPath) {
  // let _cmd = `git log \
  // --date=iso --pretty=format:'{"commit": "%h","author": "%aN <%aE>","date": "%ad","message": "%s","branch": "%T"},' \
  // $@ | \
  // perl -pe 'BEGIN{print "["}; END{print "]\n"}' | \
  // perl -pe 's/},]/}]/'`;
  let _cmd = `cd ${rootPath}
  git log --all --decorate --oneline`;
  let result = await cmdFactory(_cmd)
  return result.trim().split("\n")
}


async function commit(rootPath) {
  let _gitLog = await getLog(rootPath);
  console.log(_gitLog);
  return _gitLog;
}

function formatLog(stdout) {
  const logReg = /^([0-9a-zA-Z]{7})( \(.*\))?( .*)$/;
  const logRes = logReg.exec(stdout);
  console.log(logRes);
  if (!logRes) {
    return stdout;
  }
  let hash = logRes[1];
  let branches, message;
  branches = trim(logRes[2]);
  message = trim(logRes[3]);
  return { hash, branches, message };
}

class Page extends React.Component {
  state = {
    treeData: null,
    originData: [],
    onWorking: false,
    rootPath: "",
    rootName: "",
    formatLogs: [],
    selectedLogIndex: -1,
  };

  componentDidMount(){
    let rootPath = localStorage.getItem('rootPath');
    let rootName = localStorage.getItem('rootName');
    if(rootPath){
      let originRootPath = JSON.parse(rootPath);
      let originRootName = JSON.parse(rootName);
      this.onDrop(originRootPath, originRootName);
    }
  }

  onDrop = async (rootPath, rootName) => {

    /* 文件结构start */
    // let filterFiles = files.map(({ path }) => {
    //   return path.replace(rootPath, "");
    // });
    // let treeData = pathToTree(filterFiles, (newNode) => {
    //   if (newNode.isFolder) {
    //     newNode.icon = <FolderOutlined />;
    //   } else {
    //     newNode.icon = <FileOutlined />;
    //   }
    //   return newNode;
    // });
    // console.log(treeData);
    /* 文件结构start end*/

    let commitLogs = await commit(rootPath);
    let formatLogs = commitLogs.map(formatLog);
    console.log(formatLogs);
    this.setState({
      // treeData,
      onWorking: true,
      rootPath,
      rootName,
      formatLogs: formatLogs,
    });
  };


  onSelect = (index) => {
    console.log(index, this.state)
    let message = this.state.formatLogs[index].message;
    console.log("selectedLog", message);
    this.setState({selectedLogIndex: index})
  };

  /**
   * 合并log
   */
  gitSquash = async ()=>{
    let {formatLogs, selectedLogIndex, rootName} = this.state;
    let message = formatLogs[selectedLogIndex].message;
    let _cmd = `cd ${this.state.rootPath} && git reset --mixed HEAD~${selectedLogIndex}
    git add .
    git commit -m '${message}'
    `;
    execAllCommand(_cmd);
    setTimeout(()=>{
      this.onDrop(this.state.rootPath, rootName)
    }, 1000)
  }


  onCheck = (checkedKeys, info) => {
    console.log("onCheck", checkedKeys, info);
  };

  render() {
    let { treeData, onWorking, rootPath, formatLogs } = this.state;
    return (
      <div className="main">
        <FileDrop onDrop={this.onDrop}>
          {!onWorking && <div className="main">休眠中</div>}
          {onWorking && (
            <div>
              工作中
              <p>根路径{rootPath}</p>
              <div
                className="split-view-view visible"
                style={{
                  left: "0px",
                  height: "100%",
                  background: "#fff",
                  overflow: "scroll",
                }}
              >
                {formatLogs.map((log, index) => {
                  return this.renderFormatLogs(log, index);
                })}
              </div>
              <div
                className="split-view-view visible"
                style={{
                  right: "0px",
                  width: "198px",
                  height: "100%",
                  background: "#e4e4e4",
                  overflow: "scroll",
                }}
              >
                <Tree
                  style={{ background: "#e4e4e4" }}
                  showIcon
                  onSelect={this.onSelect}
                  onCheck={this.onCheck}
                  treeData={treeData}
                />
              </div>
            </div>
          )}
        </FileDrop>
        <ContextMenu id="git-function">
          <MenuItem data={{foo: 'bar'}} onClick={this.gitSquash}>
            <div style={{width: '150px', height: '22px', background: 'pink'}}>
            git squash 
            </div>
          </MenuItem>
        </ContextMenu>
      </div>
    );
  }

  renderFormatLogs(log, index) {
    let {selectedLogIndex} = this.state;
    return (
      <ContextMenuTrigger id="git-function">
        <div key={`${log.hash}`} onClick={()=> this.onSelect(index)} style={ index === selectedLogIndex? {backgroundColor: '#c2ccd0'}: null}>
      
          <span style={{ backgroundColor: "pink", width: '250px',height: '20px' }}>
            {log.branches}
          </span>
          {!!log.branches && '-------------'}
          <span style={{width: '200px', height: '20px'}}>{log.message}</span>
          <span>{log.hash}</span>
        </div>
      </ContextMenuTrigger>
      
    );
  }
}

export default Page;
