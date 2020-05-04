import React from "react";
import Tree from "antd/lib/tree";
import { FolderOutlined, FileOutlined } from "@ant-design/icons";
import FileDrop from "../compoenents/FileDrop";
import "./index.css";
import { pathToTree } from "../utils/files";
const shell = window.shell;

const { ipcRenderer } = window.electron;
const { TreeNode } = Tree;
function getLog() {
  let _cmd = `git log \
  --date=iso --pretty=format:'{"commit": "%h","author": "%aN <%aE>","date": "%ad","message": "%s"},' \
  $@ | \
  perl -pe 'BEGIN{print "["}; END{print "]\n"}' | \
  perl -pe 's/},]/}]/'`;
  return new Promise((resolve, reject) => {
    shell.exec(_cmd, (code, stdout, stderr) => {
      if (code) {
        reject(stderr);
      } else {
        resolve(JSON.parse(stdout));
      }
    });
  });
}

async function commit() {
  let _gitLog = await getLog();
  console.log(_gitLog);
  return _gitLog;
}

class Page extends React.Component {
  state = {
    treeData: null,
    originData: [],
    onWorking: false,
    rootPath: "",
  };
  onDrop = (files, rootPath, rooName) => {
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
    this.setState({ treeData, onWorking: true, rootPath });
    // console.log("commitLog", commit());
    commit();
  };
  onSelect = (selectedKeys, info) => {
    console.log("selected", selectedKeys, info);
  };

  onCheck = (checkedKeys, info) => {
    console.log("onCheck", checkedKeys, info);
  };

  render() {
    let { treeData, onWorking, rootPath } = this.state;
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
                style={{right: '0px', width: '198px',height: '100%', background: '#e4e4e4', overflow: 'scroll'}}
              >
                <Tree
                  style={{background: '#e4e4e4'}}
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
}

export default Page;
