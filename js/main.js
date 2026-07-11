// ========== 这里改成你自己的仓库信息 ==========
const GH_USER = "zmzaxg";
const GH_REPO = "xxdd";
const GH_BRANCH = "main";
// ==============================================

let allPosts = [];
const postListEl = document.getElementById("post-list");
const emptyTip = document.getElementById("empty-tip");
const searchInput = document.getElementById("search-input");
const latestList = document.getElementById("latest-list");
const tagWrap = document.getElementById("tag-wrap");

// 1. 获取posts目录下所有md文件列表（GitHub Tree API）
async function getPostsFileList() {
  const treeUrl = `https://api.github.com/repos/${GH_USER}/${GH_REPO}/git/trees/${GH_BRANCH}?recursive=1`;
  const res = await fetch(treeUrl);
  if (!res.ok) throw new Error("获取仓库文件失败");
  const data = await res.json();
  // 过滤posts下后缀为.md的文件
  const mdFiles = data.tree.filter(item => {
    return item.path.startsWith("posts/") && item.path.endsWith(".md");
  });
  return mdFiles;
}

// 2. 单篇MD解析：元数据、标题、摘要、标签
async function parsePostFile(fileItem) {
  const filePath = fileItem.path;
  const fileName = filePath.split("/").pop();
  // 原始md内容地址
  const rawUrl = `https://raw.githubusercontent.com/${GH_USER}/${GH_REPO}/${GH_BRANCH}/${filePath}`;
  const rawRes = await fetch(rawUrl);
  const raw = await rawRes.text();

  let customTitle = null;
  let mdTitle = "无标题";
  let date = "未知日期";
  let tags = [];

  // 解析头部 --- 元数据
  const metaReg = /^---([\s\S]*?)---/m;
  const metaMatch = raw.match(metaReg);
  if (metaMatch) {
    const meta = metaMatch[1];
    const tMatch = meta.match(/title:\s*(.+)/);
    if (tMatch) customTitle = tMatch[1].trim();
    const dMatch = meta.match(/date:\s*(\S+)/);
    if (dMatch) date = dMatch[1].trim();
    const tagMatch = meta.match(/tags:\s*(.+)/);
    if (tagMatch) tags = tagMatch[1].split(",").map(s => s.trim());
  }

  // 提取一级标题 # xxx
  const h1Match = raw.match(/^#\s+(.+)/m);
  if (h1Match) mdTitle = h1Match[1].trim();
  // 优先级：自定义title > 文件一级标题
  const finalTitle = customTitle || mdTitle;

  // 生成150字纯文本摘要
  const plainText = raw
    .replace(/^---[\s\S]*?---/m, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/[*#>`\[\]()\-~]/g, "")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ");
  let desc = plainText.slice(0, 150);
  if (plainText.length > 150) desc += "...";

  return {
    filename: fileName,
    filePath: filePath,
    title: finalTitle,
    date: date,
    tags: tags,
    desc: desc,
    fullText: raw
  };
}

// 3. 加载全部文章
async function loadAllPosts() {
  try {
    emptyTip.style.display = "block";
    emptyTip.innerText = "正在从GitHub拉取文章...";
    const fileList = await getPostsFileList();
    if (fileList.length === 0) {
      emptyTip.innerText = "posts文件夹暂无MD文章";
      return;
    }
    // 批量解析所有md
    const postPromises = fileList.map(item => parsePostFile(item));
    allPosts = await Promise.all(postPromises);
    // 按日期倒序
    allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
    // 渲染页面
    renderPostList(allPosts);
    renderLatestSidebar();
    renderAllTags();
    emptyTip.style.display = "none";
  } catch (err) {
    emptyTip.innerText = "文章加载失败：" + err.message;
    console.error(err);
  }
}

// 渲染文章卡片
function renderPostList(list) {
  postListEl.innerHTML = "";
  if (list.length === 0) {
    emptyTip.style.display = "block";
    emptyTip.innerText = "无匹配文章";
    return;
  }
  emptyTip.style.display = "none";
  list.forEach(post => {
    const card = document.createElement("div");
    card.className = "content-card post-card";
    card.innerHTML = `
      <div class="post-date">📅 ${post.date}</div>
      <h2><a href="article.html?file=${post.filename}">${post.title}</a></h2>
      <p class="post-desc">${post.desc}</p>
    `;
    postListEl.appendChild(card);
  });
}

// 侧边栏最新3篇
function renderLatestSidebar() {
  latestList.innerHTML = "";
  const top3 = allPosts.slice(0, 3);
  top3.forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="article.html?file=${p.filename}">${p.title}</a>`;
    latestList.appendChild(li);
  })
}

// 标签渲染&筛选
function renderAllTags() {
  tagWrap.innerHTML = "";
  const tagSet = new Set();
  allPosts.forEach(p => p.tags.forEach(t => tagSet.add(t)));
  Array.from(tagSet).forEach(tag => {
    const span = document.createElement("span");
    span.className = "tag-item";
    span.textContent = tag;
    span.onclick = () => filterByTag(tag);
    tagWrap.appendChild(span);
  })
}
function filterByTag(tag) {
  const filter = allPosts.filter(p => p.tags.includes(tag));
  renderPostList(filter);
}

// 全局搜索
searchInput.addEventListener("input", (e) => {
  const kw = e.target.value.toLowerCase().trim();
  if (!kw) return renderPostList(allPosts);
  const result = allPosts.filter(p =>
    p.title.toLowerCase().includes(kw) || p.fullText.toLowerCase().includes(kw)
  );
  renderPostList(result);
})

// 初始化执行
loadAllPosts();
