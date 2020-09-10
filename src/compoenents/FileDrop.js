import React from "react";
import { fromEvent } from "file-selector";
class DropArea extends React.Component {
  constructor(props) {
    super(props);
    this.dropRef = React.createRef();
  }
  componentDidMount() {
    this.dropRef.current.addEventListener("dragover", async (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
    });
    this.dropRef.current.addEventListener("drop", async (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      let rootPath = evt.dataTransfer.files[0].path;
      let rootName = evt.dataTransfer.files[0].name;
      console.log('rootPath', rootPath);
      console.log('rootName', rootName);
      let files = await fromEvent(evt);
      files = files.filter(file=>{
        return !file.path.startsWith(`${rootPath}/.git/`)
      })
      if (this.props.onDrop) {
        this.props.onDrop(files, rootPath, rootName);
      }
    });
  }
  componentWillUnmount(){
    this.dropRef.current.removeEventListener("dragover");
    this.dropRef.current.removeEventListener("drop");
  }
  render() {
    return (
      <div ref={this.dropRef} style={{ width: "100%", height: "100%" }}>
        {this.props.children}
      </div>
    );
  }
}

export default DropArea;
