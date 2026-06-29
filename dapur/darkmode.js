export function initDarkMode(categories = []) {
  const darkSwitch = document.getElementById('darkSwitch')
  if (!darkSwitch) return

  // Ambil preferensi dari localStorage
  const darkPref = localStorage.getItem('darkMode') === 'true'
  document.body.classList.toggle('dark-mode', darkPref)
  darkSwitch.checked = darkPref

  darkSwitch.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode', darkSwitch.checked)
    localStorage.setItem('darkMode', darkSwitch.checked)
  })
}
