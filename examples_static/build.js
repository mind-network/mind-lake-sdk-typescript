const fs = require("fs");

const basePath = __dirname+ '/dist/';

//创建3个文件夹
for (let i = 1; i < 4; i ++) {
  const oldPath = basePath + `use_case_${i}.html`;
  const newPath = basePath + 'use_case_'+ i;
  fs.mkdirSync(newPath);
  fs.renameSync(oldPath, newPath+`/use_case_${i}.html`);
  fs.copyFileSync(basePath + 'umi.js', newPath+ '/umi.js')
}

fs.unlinkSync(basePath + 'umi.js');

