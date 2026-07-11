const params = new URLSearchParams(location.search);
const fileName = params.get("file");
const contentBox = document.getElementById("md-content");

async function loadArticle(){
  if(!fileName) return;
  const resp = await fetch(`posts/${fileName}`);
  const mdText = await resp.text();
  // 渲染Markdown正文
  contentBox.innerHTML = marked.parse(mdText);
}
loadArticle();
