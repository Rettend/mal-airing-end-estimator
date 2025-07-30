function getInfoValue(keyText: string): { element: HTMLElement, value: string } | null {
  const spans = document.querySelectorAll('span.dark_text')
  for (const span of spans) {
    if (span.textContent?.trim() === keyText) {
      const parentDiv = span.parentElement
      if (parentDiv) {
        const valueClone = parentDiv.cloneNode(true) as HTMLElement
        valueClone.querySelector('span.dark_text')?.remove()
        return {
          element: parentDiv,
          value: valueClone.textContent?.trim() ?? '',
        }
      }
    }
  }
  return null
}

function run() {
  const statusInfo = getInfoValue('Status:')
  if (statusInfo?.value !== 'Currently Airing')
    return

  const episodesInfo = getInfoValue('Episodes:')
  const numEpisodes = Number(episodesInfo?.value)
  if (!episodesInfo || Number.isNaN(numEpisodes) || numEpisodes <= 1)
    return

  const airedInfo = getInfoValue('Aired:')
  if (!airedInfo || !airedInfo.value.includes(' to ?'))
    return

  const startDateStr = airedInfo.value.split(' to ')[0].trim()
  const startDate = new Date(startDateStr)
  if (Number.isNaN(startDate.getTime()))
    return

  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + (numEpisodes - 1) * 7)

  const endDateFormatted = endDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const originalText = airedInfo.element.innerHTML
  const updatedText = originalText.replace('?', `~${endDateFormatted}`)
  airedInfo.element.innerHTML = updatedText
}

run()
