const fs = require('fs');
const path = require('path');

const POST_DIR = './posts';
const OUTPUT_JSON = './posts-data.json';

// 清理md标记，提取纯文本
function getPlainText(raw) {
  return raw
    .replace(/^---[\s\S]*?---/m, '') // 移除头部元数据
    .replace(/#{1,6}\s/g, '')
    .replace(/[*#>`\[\]()\-\[\]]/g, '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ');
}

// 解析单篇md
function parseMdFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const filename = path.basename(filePath);

  let customTitle = null;
  let mdTitle = '无标题';
  let date = '未知日期';
  let tags = [];

  // 提取头部元数据 --- ---
  const metaReg = /^---([\s\S]*?)---/m;
  const metaMatch = raw.match(metaReg);
  if (metaMatch) {
    const meta = metaMatch[1];
    // 自定义标题（优先级最高）
    const tMatch = meta.match(/title:\s*(.+)/);
    if (tMatch) customTitle = tMatch[1].trim();
    // 日期
    const dMatch = meta.match(/date:\s*(\S+)/);
    if (dMatch) date = dMatch[1].trim();
    // 标签
    const tagMatch = meta.match(/tags:\s*(.+)/);
    if (tagMatch) tags = tagMatch[1].split(',').map(s => s.trim());
  }

  // 提取一级标题 # xxx
  const h1Match = raw.match(/^#\s+(.+)/m);
  if (h1Match) mdTitle = h1Match[1].trim();

  // 最终标题：优先自定义title，没有则取#一级标题
  const finalTitle = customTitle || mdTitle;

  // 截取前150字摘要
  const plain = getPlainText(raw);
  let desc = plain.slice(0, 150);
  if (plain.length > 150) desc += '...';

  return {
    filename,
    title: finalTitle,
    date,
    tags,
    desc,
    fullText: raw
  };
}

// 主逻辑
function build() {
  const files = fs.readdirSync(POST_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(POST_DIR, f));

  const posts = files.map(parseMdFile);
  // 日期倒序排序
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(posts, null, 2), 'utf8');
  console.log(`✅ 成功扫描 ${posts.length} 篇文章，已生成 posts-data.json`);
}

build();
