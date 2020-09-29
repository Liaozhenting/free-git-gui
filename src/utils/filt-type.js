const path = require('path');
const imageFileExtensions = ['.PNG', '.JPG', '.BMP', '.GIF', '.JPEG'];

export default (fileName) =>
  imageFileExtensions.indexOf(path.extname(fileName).toUpperCase()) > -1 ? 'image' : 'text';
