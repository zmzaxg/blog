const fs = require('fs');
const path = require('path');

const POST_ROOT = './posts';
const OUTPUT_FILE = './post-list.js';

// 递归遍历所有 .md 文件
function walkDirectory(dir) {
  let filePaths = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = fullPath.replaceAll(path.sep, '/');
    if (entry.isDirectory()) {
      filePaths.push(...walkDirectory(fullPath));
    } else if (entry.name.toLowerCase().endsWith('.md')) {
      filePaths.push(relPath);
    }
  }
  return filePaths;
}

// 生成前端读取的路径数组文件
function generatePostListFile() {
  const mdPaths = walkDirectory(POST_ROOT);
  const fileContent = `// EdgeOne构建自动生成，无需手动修改
const POST_FILE_PATHS = ${JSON.stringify(mdPaths, null, 2)};
`;
  fs.writeFileSync(OUTPUT_FILE, fileContent, 'utf8');
  console.log(`✅ 已自动生成文章清单，共${mdPaths.length}篇MD`);
}

generatePostListFile();
