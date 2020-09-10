import React from "react";
import Tree from "antd/lib/tree";
import { FolderOutlined, FileOutlined } from "@ant-design/icons";
import FileDrop from "../compoenents/FileDrop";
import "./index.css";
import { pathToTree } from "../utils/files";
import trim from "lodash/trim";
const shell = window.shell;

const { ipcRenderer } = window.electron;
const { TreeNode } = Tree;
function getLog(rootPath) {
  // let _cmd = `git log \
  // --date=iso --pretty=format:'{"commit": "%h","author": "%aN <%aE>","date": "%ad","message": "%s","branch": "%T"},' \
  // $@ | \
  // perl -pe 'BEGIN{print "["}; END{print "]\n"}' | \
  // perl -pe 's/},]/}]/'`;
  let _cmd = `cd ${rootPath} && git log --all --decorate --oneline`;
  return new Promise((resolve, reject) => {
    shell.exec(_cmd, (code, stdout, stderr) => {
      if (code) {
        reject(stderr);
      } else {
        resolve(stdout.split("\n"));
      }
    });
  });
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
    formatLogs: [],
  };

  onDrop = async (files, rootPath, rooName) => {
    let filterFiles = files.map(({ path }) => {
      return path.replace(rootPath, "");
    });
    let treeData = pathToTree(filterFiles, (newNode) => {
      if (newNode.isFolder) {
        newNode.icon = <FolderOutlined />;
      } else {
        newNode.icon = <FileOutlined />;
      }
      return newNode;
    });
    console.log(treeData);

    let commitLogs = await commit(rootPath);
    let formatLogs = commitLogs.map(formatLog);
    console.log(formatLogs);
    this.setState({
      treeData,
      onWorking: true,
      rootPath,
      formatLogs: formatLogs,
    });
  };

  onSelect = (selectedKeys, info) => {
    console.log("selected", selectedKeys, info);
  };

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
                {formatLogs.map((log) => {
                  return this.renderFormatLogs(log);
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
      </div>
    );
  }

  renderFormatLogs(log, index) {
    return (
      <div key={`${log.hash}`}>
        <span style={{ backgroundColor: "pink", width: '150px',height: '20px' }}>
          {log.branches}
        </span>
        <span>{log.message}</span>
        <span>{log.hash}</span>
      </div>
    );
  }
}

export default Page;
