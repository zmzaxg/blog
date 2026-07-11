let allPosts = [];
const postListEl = document.getElementById("post-list");
const emptyTip = document.getElementById("empty-tip");
const searchInput = document.getElementById("search-input");
const latestList = document.getElementById("latest-list");
const tagWrap = document.getElementById("tag-wrap");

// 侧边栏追加分类区块
document.querySelector(".sidebar").insertAdjacentHTML('beforeend',`
<div class="sidebar-card content-card">
  <h3>📂 目录分类</h3>
  <div id="category-wrap"></div>
</div>
`);

async function loadAllPosts() {
  emptyTip.style.display = "block";
  emptyTip.innerText = "加载文章中...";
  // 引入EdgeOne构建自动生成的清单
  await import("./../post-list.js");
  const filePaths = POST_FILE_PATHS;

  if (filePaths.length === 0) {
    emptyTip.innerText = "posts文件夹暂无MD文章，新增文件后等待EdgeOne重新构建";
    return;
  }

  // 批量解析每篇MD
  const postPromises = filePaths.map(async (filePath) => {
    const rawRes = await fetch(`./${filePath}`);
    const raw = await rawRes.text();
    const fileName = filePath.split("/").pop();
    // 提取二级分类目录
    const pathSlice = filePath.replace("posts/","").split("/");
    const categoryName = pathSlice.length >= 2 ? pathSlice[0] : "首页文章";

    let customTitle = null;
    let mdTitle = "无标题";
    let date = "未知日期";
    let tags = [];

    // 解析头部元数据 --- date tags title ---
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
    const finalTitle = customTitle || mdTitle;

    // 自动截取前150字纯文本摘要
    const plainText = raw
      .replace(/^---[\s\S]*?---/m, "")
      .replace(/#{1,6}\s/g, "")
      .replace(/[*#>`\[\]()\-~]/g, "")
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ");
    let desc = plainText.slice(0, 150);
    if (plainText.length > 150) desc += "...";

    return {
      filePath,
      fileName,
      categoryName,
      title: finalTitle,
      date,
      tags,
      desc,
      fullText: raw
    };
  });

  allPosts = await Promise.all(postPromises);
  // 按发布日期倒序
  allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

  renderPostList(allPosts);
  renderLatestSidebar();
  renderAllTags();
  renderCategoryMenu();
  emptyTip.style.display = "none";
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
      <div class="post-date">📂 ${post.categoryName} · 📅 ${post.date}</div>
      <h2><a href="article.html?path=${encodeURIComponent(post.filePath)}">${post.title}</a></h2>
      <p class="post-desc">${post.desc}</p>
    `;
    postListEl.appendChild(card);
  });
}

// 侧边栏最新3篇文章
function renderLatestSidebar() {
  latestList.innerHTML = "";
  const top3 = allPosts.slice(0, 3);
  top3.forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="article.html?path=${encodeURIComponent(p.filePath)}">${p.title}</a>`;
    latestList.appendChild(li);
  })
}

// 侧边栏标签筛选
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
  renderPostList(allPosts.filter(p => p.tags.includes(tag)));
}

// 侧边栏二级目录分类菜单
function renderCategoryMenu(){
  const wrap = document.getElementById("category-wrap");
  wrap.innerHTML = "";
  const catSet = new Set(allPosts.map(p=>p.categoryName));
  // 全部文章按钮
  const allBtn = document.createElement("span");
  allBtn.className = "tag-item";
  allBtn.textContent = "全部文章";
  allBtn.onclick = ()=>renderPostList(allPosts);
  wrap.appendChild(allBtn);
  // 各子分类
  Array.from(catSet).forEach(cat=>{
    const span = document.createElement("span");
    span.className = "tag-item";
    span.textContent = cat;
    span.onclick = ()=>renderPostList(allPosts.filter(i=>i.categoryName===cat));
    wrap.appendChild(span);
  })
}

// 全局标题+全文搜索
searchInput.addEventListener("input", (e) => {
  const kw = e.target.value.toLowerCase().trim();
  if (!kw) return renderPostList(allPosts);
  const result = allPosts.filter(p =>
    p.title.toLowerCase().includes(kw) || p.fullText.toLowerCase().includes(kw)
  );
  renderPostList(result);
})

loadAllPosts();
