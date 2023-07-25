const fs = require("fs");

const basePath = __dirname+ '/dist/';

const jsFile = fs.readFileSync(basePath + 'umi.js').toString();

for (let i = 1; i < 2; i ++) {
  const filePath = basePath +`use_case_${i}.html`;
  const htmlFile = fs.readFileSync(filePath).toString();
  const result = htmlFile.replace('<script src="./umi.js"></script>',
    `<script>
                    ${jsFile}
                  </script>`
  );
  fs.writeFileSync('test.txt', result, {encoding: 'utf-8', flag: 'w'})
}

fs.unlinkSync(basePath + 'umi.js');
