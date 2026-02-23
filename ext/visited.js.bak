export const visitedLinks = JSON.parse(
  localStorage.getItem('visitedLinks') || '[]',
)

export function markVisited(file, a, statusSpan) {
  if (!visitedLinks.includes(file)) {
    visitedLinks.push(file)
    localStorage.setItem('visitedLinks', JSON.stringify(visitedLinks))
    statusSpan.className = 'label-visited'
    statusSpan.textContent = 'sudah dibaca 👍'
    a.classList.add('visited')
  }
}
