const base = '/mp2/'
const path = window.location.pathname

if (path.startsWith(base)) {
  const route = `${path.slice(base.length)}${window.location.search}${window.location.hash}`
  window.location.replace(`${base}?__route=${encodeURIComponent(route)}`)
}
