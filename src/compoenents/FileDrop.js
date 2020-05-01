import React from "react";
import { fromEvent } from "file-selector";
const unbind = [];
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
      const files = await fromEvent(evt);
      console.log('files', files);
      if (this.props.onDrop) {
        this.props.onDrop(files, rootPath, rootName);
      }
    });
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
