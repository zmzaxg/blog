// 在这里新增/删除文章配置
const posts = [
  {filename:"hello.md",title:"第一篇博客文章",date:"2026-07-11"},
  {filename:"demo.md",title:"Markdown 书写范例",date:"2026-07-10"}
];
const postList = document.getElementById("post-list");

async function renderPosts(){
  for(let post of posts){
    const res = await fetch(`posts/${post.filename}`);
    const rawMd = await res.text();
    // 清理Markdown标记、换行、多余空格
    let plainText = rawMd
      .replace(/#{1,6}\s/g,"")
      .replace(/[*#>`\[\]()]/g,"")
      .replace(/\n/g," ")
      .replace(/\s+/g," ");
    // 截取前150字
    let preview = plainText.slice(0,150);
    if(plainText.length > 150) preview += "...";

    const card = document.createElement("div");
    card.className = "content-card post-card";
    card.innerHTML = `
      <div class="post-date">📅 ${post.date}</div>
      <h2><a href="article.html?file=${post.filename}">${post.title}</a></h2>
      <p class="post-desc">${preview}</p>
    `;
    postList.appendChild(card);
  }
}
renderPosts();
