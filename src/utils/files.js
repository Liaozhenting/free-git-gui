// const {fromEvent} = require('file-selector')

export const pathToTree = (input, callback) => {
  let root = [];
  for (let i = 0; i < input.length; i++) {
    let chain = input[i].split("/");
    let currentHierarchy = root;
    for (let j = 0; j < chain.length; j++) {
      let wantedNode = chain[j]
      if (wantedNode === '') {
        continue;
      }
      let lastHierarchy = currentHierarchy;

      // 遍历root是否已有该层级
      for (let k = 0; k < currentHierarchy.length; k++) {
        if (currentHierarchy[k].title === wantedNode) {
          currentHierarchy = currentHierarchy[k].children;
          break;
        }
      }

      if (lastHierarchy === currentHierarchy) {
        let key;
        let newNode;
        if (j === chain.length - 1) {
          key = input[i];
          newNode = {
            key: key,
            title: wantedNode
          };
        } else {
          key = chain.slice(0, j + 1).join('/') + '/';
          newNode = {
            key: key,
            title: wantedNode,
            isFolder: true,
            children: []
          };
        }
        if (callback) {
          newNode = callback(newNode);
        }
        currentHierarchy.push(newNode);
        currentHierarchy = newNode.children;
      }
    }
  }

  return root;
};

export async function getFiles (evt, callback) {
  let rootPath = evt.dataTransfer.files[0].path;
  let rootName = evt.dataTransfer.files[0].name;
  console.log('rootPath', rootPath);
  console.log('rootName', rootName);
  localStorage.setItem('rootPath', JSON.stringify(rootPath))
  localStorage.setItem('rootName', JSON.stringify(rootName))
  // let files = await fromEvent(evt);
  // files = files.filter(file => {
  //   return !file.path.startsWith(`${rootPath}/.git/`)
  // })

  // callback(files, rootPath, rootName)

  callback(rootPath, rootName)
}

// exports.getFiles = getFiles;


