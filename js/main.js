// 存储全部文章数据
let allPosts = [];
const postListEl = document.getElementById("post-list");
const emptyTip = document.getElementById("empty-tip");
const searchInput = document.getElementById("search-input");
const latestList = document.getElementById("latest-list");
const tagWrap = document.getElementById("tag-wrap");

// 模拟读取posts文件夹内所有md文件（线上需配合静态目录遍历，本地使用预设清单）
// 线上部署（Vercel/GitPages）：替换为真实文件遍历，本地开发直接在这里填你的md文件名
const mdFileNames = ["hello.md","demo.md"];

// 解析md内容：提取标题、日期、标签、正文预览
async function parseMarkdownFile(filename){
  const res = await fetch(`posts/${filename}`);
  const raw = await res.text();
  let title = "无标题";
  let date = "未知日期";
  let tags = [];

  // 提取一级标题 # xxx
  const titleMatch = raw.match(/^#\s+(.+)/m);
  if(titleMatch) title = titleMatch[1];

  // 提取元数据 --- date:xxx tags:a,b,c ---
  const metaMatch = raw.match(/^---[\s\S]*?---/m);
  if(metaMatch){
    const metaText = metaMatch[0];
    const dMatch = metaText.match(/date:\s*(\S+)/);
    const tMatch = metaText.match(/tags:\s*(.+)/);
    if(dMatch) date = dMatch[1];
    if(tMatch) tags = tMatch[1].split(",").map(i=>i.trim());
  }

  // 纯文本截取前150字简介
  let plain = raw
    .replace(/^---[\s\S]*?---/m,"")
    .replace(/#{1,6}\s/g,"")
    .replace(/[*#>`\[\]()]/g,"")
    .replace(/\n/g," ")
    .replace(/\s+/g," ");
  let desc = plain.slice(0,150);
  if(plain.length>150) desc += "...";

  return {
    filename,title,date,tags,desc,rawText:raw
  };
}

// 加载全部文章
async function loadAllPosts(){
  allPosts = [];
  for(let fn of mdFileNames){
    const post = await parseMarkdownFile(fn);
    allPosts.push(post);
  }
  // 按日期倒序
  allPosts.sort((a,b)=>new Date(b.date)-new Date(a.date));
  renderPostList(allPosts);
  renderLatestSidebar();
  renderAllTags();
}

// 渲染文章卡片列表
function renderPostList(list){
  postListEl.innerHTML = "";
  if(list.length===0){
    emptyTip.style.display="block";
    return;
  }
  emptyTip.style.display="none";
  list.forEach(post=>{
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

// 侧边栏最新文章
function renderLatestSidebar(){
  latestList.innerHTML = "";
  const top3 = allPosts.slice(0,3);
  top3.forEach(p=>{
    const li = document.createElement("li");
    li.innerHTML = `<a href="article.html?file=${p.filename}">${p.title}</a>`;
    latestList.appendChild(li);
  })
}

// 侧边栏全部标签
function renderAllTags(){
  tagWrap.innerHTML = "";
  const tagSet = new Set();
  allPosts.forEach(p=>p.tags.forEach(t=>tagSet.add(t)));
  const tags = Array.from(tagSet);
  tags.forEach(tag=>{
    const span = document.createElement("span");
    span.className = "tag-item";
    span.textContent = tag;
    span.onclick = ()=>filterByTag(tag);
    tagWrap.appendChild(span);
  })
}

// 标签筛选
function filterByTag(tag){
  const filter = allPosts.filter(p=>p.tags.includes(tag));
  renderPostList(filter);
}

// 搜索功能
searchInput.addEventListener("input",(e)=>{
  const kw = e.target.value.toLowerCase().trim();
  if(!kw){
    renderPostList(allPosts);
    return;
  }
  const result = allPosts.filter(p=>
    p.title.toLowerCase().includes(kw) || p.rawText.toLowerCase().includes(kw)
  );
  renderPostList(result);
})

// 初始化
loadAllPosts();
