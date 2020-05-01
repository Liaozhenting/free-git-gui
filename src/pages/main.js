import React from "react";
import Tree from "antd/lib/tree";
import {FolderOutlined, FileOutlined} from "@ant-design/icons"
import FileDrop from "../compoenents/FileDrop";
import "./main.css";
import { pathToTree } from "../utils/files";

const { TreeNode } = Tree;

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
    console.log(filterFiles);
    let treeData = pathToTree(filterFiles, (newNode)=>{
      if(newNode.isFolder){
        newNode.icon = <FolderOutlined />
      } else {
        newNode.icon = <FileOutlined />
      }
      return newNode
    });
    console.log(treeData);
    this.setState({ treeData, onWorking: true, rootPath });
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
              <Tree
                showIcon
                onSelect={this.onSelect}
                onCheck={this.onCheck}
                treeData={treeData}
              />
            </div>
          )}
        </FileDrop>
      </div>
    );
  }
}

export default Page;
