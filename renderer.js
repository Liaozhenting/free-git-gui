// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
var fs = require('fs');
var join = require('path').join; 

function getJsonFiles(jsonPath) {
  let jsonFiles = [];
  let flag = false;
  function findJsonFile(path) {
    let files = fs.readdirSync(path);
    files.forEach(function (item, index) {
      let fPath = join(path, item);
      let stat = fs.statSync(fPath);
      if (stat.isDirectory() === true) {
        fPath = fPath +'/';
        jsonFiles.push(fPath);
        if(!flag){
          flag = true;
          findJsonFile(fPath);
        } 
      }
      if (stat.isFile() === true) {
        jsonFiles.push(fPath);
      }
    });
  }
  findJsonFile(jsonPath);
  console.log(jsonFiles);
  return jsonFiles;
}
var files = getJsonFiles('./');

var {pathToTree} = require('./src/utils');

console.log(pathToTree(files))