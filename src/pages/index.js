import React from "react";
import Tree from "antd/lib/tree";
import { FolderOutlined, FileOutlined } from "@ant-design/icons";
import { ContextMenu, MenuItem, ContextMenuTrigger } from "react-contextmenu";
import FileDrop from "../compoenents/FileDrop";
import "./index.css";
import { pathToTree, getFiles} from "../utils/files";
import fileType from "../utils/filt-type";
import _ from 'lodash';
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
 * 获取git log，参考 ungit https://github.com/FredrikNoren/ungit
 * @param {string} rootPath 
 */
async function getLog(rootPath) {
  // let _cmd = `git log \
  // --date=iso --pretty=format:'{"commit": "%h","author": "%aN <%aE>","date": "%ad","message": "%s","branch": "%T"},' \
  // $@ | \
  // perl -pe 'BEGIN{print "["}; END{print "]\n"}' | \
  // perl -pe 's/},]/}]/'`;
  let _cmd = `cd ${rootPath}
  git log \
  --cc --decorate=full --show-signature --date=default --pretty=fuller -z --branches --tags --remotes --parents --no-notes --numstat --date-order
  `;
  let result = await cmdFactory(_cmd)
  return result
}


async function getCommit(rootPath) {
  let _gitLog = await getLog(rootPath);
  console.log('_gitLog', _gitLog);
  _gitLog = parseCommitLog(_gitLog)
  return _gitLog
}

const fileChangeRegex = /(?<additions>[\d-]+)\t(?<deletions>[\d-]+)\t((?<fileName>[^\x00]+?)\x00|\x00(?<oldFileName>[^\x00]+?)\x00(?<newFileName>[^\x00]+?)\x00)/g;

const authorRegexp = /([^<]+)<([^>]+)>/;
const gitLogHeaders = {
  Author: (currentCommmit, author) => {
    const capture = authorRegexp.exec(author);
    if (capture) {
      currentCommmit.authorName = capture[1].trim();
      currentCommmit.authorEmail = capture[2].trim();
    } else {
      currentCommmit.authorName = author;
    }
  },
  Commit: (currentCommmit, author) => {
    const capture = authorRegexp.exec(author);
    if (capture) {
      currentCommmit.committerName = capture[1].trim();
      currentCommmit.committerEmail = capture[2].trim();
    } else {
      currentCommmit.committerName = author;
    }
  },
  AuthorDate: (currentCommmit, date) => {
    currentCommmit.authorDate = date;
  },
  CommitDate: (currentCommmit, date) => {
    currentCommmit.commitDate = date;
  },
  Reflog: (currentCommmit, data) => {
    currentCommmit.reflogId = /\{(.*?)\}/.exec(data)[1];
    currentCommmit.reflogName = data.substring(0, data.indexOf(' ')).replace('refs/', '');
    const author = data.substring(data.indexOf('(') + 1, data.length - 1);
    const capture = authorRegexp.exec(author);
    if (capture) {
      currentCommmit.reflogAuthorName = capture[1].trim();
      currentCommmit.reflogAuthorEmail = capture[2].trim();
    } else {
      currentCommmit.reflogAuthorName = author;
    }
  },
  gpg: (currentCommit, data) => {
    if (data.startsWith('Signature made')) {
      // extract sign date
      currentCommit.signatureDate = data.slice('Signature made '.length);
    } else if (data.indexOf('Good signature from') > -1) {
      // fully verified.
      currentCommit.signatureMade = data
        .slice('Good signature from '.length)
        .replace('[ultimate]', '')
        .trim();
    } else if (data.indexOf("Can't check signature") > -1) {
      // pgp signature attempt is made but failed to verify
      delete currentCommit.signatureDate;
    }
  },
};

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
    currentCommmit.isHead = !!_.find(currentCommmit.refs, (item) => {
      return item.trim() === 'HEAD';
    });
    commits.isHeadExist = commits.isHeadExist || currentCommmit.isHead;
    commits.push(currentCommmit);
    parser = parseHeaderLine;
  };
  const parseHeaderLine = (row) => {
    if (row.trim() == '') {
      parser = parseCommitMessage;
    } else {
      for (const key in gitLogHeaders) {
        if (row.indexOf(`${key}: `) == 0) {
          gitLogHeaders[key](currentCommmit, row.slice(`${key}: `.length).trim());
          return;
        }
      }
    }
  };
  const parseCommitMessage = (row, index) => {
    if (currentCommmit.message) currentCommmit.message += '\n';
    else currentCommmit.message = '';
    currentCommmit.message += row.trim();
    if (/[\d-]+\t[\d-]+\t.+/g.test(rows[index + 1])) {
      parser = parseFileChanges;
      return;
    }
    if (rows[index + 1] && rows[index + 1].indexOf('\x00commit ') == 0) {
      parser = parseCommitLine;
      return;
    }
  };
  const parseFileChanges = (row, index) => {
    // git log is using -z so all the file changes are on one line
    // merge commits start the file changes with a null
    if (row[0] === '\x00') {
      row = row.slice(1);
    }
    fileChangeRegex.lastIndex = 0;
    while (row[fileChangeRegex.lastIndex] && row[fileChangeRegex.lastIndex] !== '\x00') {
      const match = fileChangeRegex.exec(row);
      const fileName = match.groups.fileName || match.groups.newFileName;
      const oldFileName = match.groups.oldFileName || match.groups.fileName;
      let displayName;
      if (match.groups.oldFileName) {
        displayName = `${match.groups.oldFileName} → ${match.groups.newFileName}`;
      } else {
        displayName = fileName;
      }
      currentCommmit.fileLineDiffs.push({
        additions: match.groups.additions,
        deletions: match.groups.deletions,
        fileName: fileName,
        oldFileName: oldFileName,
        displayName: displayName,
        type: fileType(fileName),
      });
    }
    const nextRow = row.slice(fileChangeRegex.lastIndex + 1);
    for (const fileLineDiff of currentCommmit.fileLineDiffs) {
      if (!isNaN(parseInt(fileLineDiff.additions, 10))) {
        currentCommmit.additions += fileLineDiff.additions = parseInt(fileLineDiff.additions, 10);
      }
      if (!isNaN(parseInt(fileLineDiff.deletions, 10))) {
        currentCommmit.deletions += fileLineDiff.deletions = parseInt(fileLineDiff.deletions, 10);
      }
    }
    parser = parseCommitLine;
    if (nextRow) {
      parser(nextRow, index);
    }
    return;
  };
  let parser = parseCommitLine;
  const rows = data.split('\n');
  rows.forEach((row, index) => {
    parser(row, index);
  });

  commits.forEach((commit) => {
    commit.message = typeof commit.message === 'string' ? commit.message.trim() : '';
  });
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
    // let formatLogs = commitLogs.map(formatLog);
    let formatLogs = commitLogs
    console.log('formatLogs', formatLogs);
    setTimeout(()=>main(formatLogs),500);
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
              <svg id="svg-canvas" width={1000} height={800}></svg>
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
      <ContextMenuTrigger id="git-function" key={`${log.sha1}`}>
        <div  onClick={()=> this.onSelect(index)} style={ index === selectedLogIndex? {backgroundColor: '#c2ccd0'}: null}>
      
          <span style={{ backgroundColor: "pink", width: '250px',height: '20px' }}>
            {log.refs}
          </span>
          {!!log.refs && '-------------'}
          <span style={{width: '200px', height: '20px'}}>{log.message}</span>
          -----
          <span>{log.sha1}</span>
        </div>
      </ContextMenuTrigger>
      
    );
  }
}

function main(gitlog){
  var g = new window.dagreD3.graphlib.Graph()
    .setGraph({align: 'DL'})
    // .setGraph({})
    .setDefaultEdgeLabel(function () { return {}; });


  g.nodes().forEach(function (v) {
    var node = g.node(v);
    // Round the corners of the nodes
    node.rx = node.ry = 5;
  });


  console.log('gitlog', gitlog)

  const graph = {}
  gitlog.forEach(ele => {
    console.log('ele.parents', ele.parents)
    if(!ele.parents) return 
    ele.parents.forEach(parent => {
      if (graph[parent]) {
        graph[parent].push(ele.sha1);
        graph[parent] = _.uniq(graph[parent])
      } else {
        graph[parent] = [ele.sha1]
      }
      console.log('graph', { ...graph })
    })
  })

  console.log('graph', graph)
  gitlog.forEach(log=>{
    g.setNode(log.sha1, {
      label: log.message,
      class: "type-no",
      id: "status" + log.sha1
    });
  })


  // Set up edges, no special attributes.

  for (let sha1 in graph) {
    if (graph[sha1]) {

      graph[sha1].forEach(nextSha1 => {
        console.log('set edge: ', sha1, nextSha1)
        g.setEdge(sha1, nextSha1)
      })
    }
  }


  // Create the renderer
  var render = new window.dagreD3.render();

  // Set up an SVG group so that we can translate the final graph.
  var svg = window.d3.select("svg"),
    svgGroup = svg.append("g");

  // Run the renderer. This is what draws the final graph.
  render(window.d3.select("svg g"), g);

  // var xCenterOffset = (svg.attr("width") - g.graph().width) / 2;
  // svgGroup.attr("transform", "translate(" + xCenterOffset + ", 20)");
  svg.attr("width", g.graph().width + 20);
  svg.attr("height", g.graph().height + 40);

}

export default Page;
