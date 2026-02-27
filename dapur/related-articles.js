document.addEventListener("DOMContentLoaded", () => {
  const relatedList = document.getElementById("related-list");

  fetch("/api/related.json")
    .then(res => res.json())
    .then(data => {
      if (!data.articles || data.articles.length === 0) {
        relatedList.innerHTML = "<li>No related articles found.</li>";
        return;
      }

      relatedList.innerHTML = data.articles
        .map(article => {
          const badge = article.category
            ? `<span class="badge">${article.category}</span>`
            : "";
          return `<li><a href="${article.url}">${article.title} ${badge}</a></li>`;
        })
        .join("");
    })
    .catch(err => {
      console.error("Error loading related articles:", err);
      relatedList.innerHTML = "<li>Failed to load related articles.</li>";
    });
});
