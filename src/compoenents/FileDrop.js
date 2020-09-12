import React from "react";
import { fromEvent } from "file-selector";
import {getFiles} from '../utils/files'
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
      getFiles(evt, this.props.onDrop)
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
