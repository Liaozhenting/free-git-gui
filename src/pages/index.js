import React from "react";
import Tree from "antd/lib/tree";
import { FolderOutlined, FileOutlined } from "@ant-design/icons";
import { ContextMenu, MenuItem, ContextMenuTrigger } from "react-contextmenu";
import FileDrop from "../compoenents/FileDrop";
import "./index.css";
import { pathToTree, getFiles} from "../utils/files";
import trim from "lodash/trim";
import each from "lodash/each";
import find from "lodash/find";
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
  try{

    await cmdFactory(commandArr.shift().trim())
  } catch(err){
    console.log('execAllCommandErr', err)
  }
  if(commandArr.length){
    await execAllCommand(commandArr)
  }
  
}

/**
 * 获取git log，参考ungit
 * @param {string} rootPath 
 */
async function getLog(rootPath) {
  // let _cmd = `git log \
  // --date=iso --pretty=format:'{"commit": "%h","author": "%aN <%aE>","date": "%ad","message": "%s","branch": "%T"},' \
  // $@ | \
  // perl -pe 'BEGIN{print "["}; END{print "]\n"}' | \
  // perl -pe 's/},]/}]/'`;
  let _cmd = `cd ${rootPath}
  git log --cc --decorate=full --show-signature --date=default --pretty=fuller -z --branches --tags --remotes --parents --no-notes --numstat --date-order`;
  let result = await cmdFactory(_cmd)
  return result.trim().split("\n")
}


async function getCommit(rootPath) {
  let _gitLog = await getLog(rootPath);
  console.log(_gitLog);
  return parseCommitLog(_gitLog);
}

function parseCommitLog (data){
  const commits = [];
  let currentCommmit;
  const parseCommitLine = (row) => {
    if (!row.trim()) return;
    currentCommmit = { refs: [], fileLineDiffs: [], additions: 0, deletions: 0 };
    const refStartIndex = row.indexOf('(');
    const sha1s = row
      .substring(0, refStartIndex < 0 ? row.length : refStartIndex)
      .split(' ')
      .slice(1)
      .filter((sha1) => {
        return sha1 && sha1.length;
      });
    currentCommmit.sha1 = sha1s[0];
    currentCommmit.parents = sha1s.slice(1);
    if (refStartIndex > 0) {
      const refs = row.substring(refStartIndex + 1, row.length - 1);
      currentCommmit.refs = refs.split(/ -> |, /g);
    }
    currentCommmit.isHead = !!find(currentCommmit.refs, (item) => {
      return item.trim() === 'HEAD';
    });
    commits.isHeadExist = commits.isHeadExist || currentCommmit.isHead;
    commits.push(currentCommmit);
  };
  const rows = data.split('\n');
  rows.forEach((row)=>{
    parseCommitLine(row);
  })
  return commits;
}

function formatLog(stdout) {
  const logReg = /^([0-9a-zA-Z]{7,8})( \(.*\))?( .*)$/;
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

    let commitLogs = await getCommit(rootPath);
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
    let _cmd = `cd ${this.state.rootPath} && git reset --mixed HEAD~${selectedLogIndex+1}
    cd ${this.state.rootPath} && git add .
    cd ${this.state.rootPath} && git commit -m '${message}'
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
          -----
          <span>{log.hash}</span>
        </div>
      </ContextMenuTrigger>
      
    );
  }
}

export default Page;
