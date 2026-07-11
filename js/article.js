const params = new URLSearchParams(location.search);
const filePath = decodeURIComponent(params.get("path"));
const contentBox = document.getElementById("md-content");

async function loadArticle() {
  if (!filePath) return;
  try {
    const resp = await fetch(`./${filePath}`);
    const mdText = await resp.text();
    contentBox.innerHTML = marked.parse(mdText);
  } catch (e) {
    contentBox.innerHTML = "<p>文章加载失败，文件不存在</p>";
    console.error(e);
  }
}
loadArticle();
