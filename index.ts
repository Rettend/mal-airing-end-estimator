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

interface BroadcastInfo {
  dayIndex: number // 0=Sun
  hour: number
  minute: number
}

function parseBroadcast(raw: string): BroadcastInfo | null {
  // Expect patterns like: "Sundays at 23:30 (JST)" or "Mondays at 01:00 (JST)"
  const match = raw.match(/^\s*([A-Z]+)\s+at\s+(\d{1,2}):(\d{2})/i)
  if (!match)
    return null
  const [, dayStr, hhStr, mmStr] = match
  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  }
  const dayIndex = dayMap[dayStr.toLowerCase()]
  if (dayIndex === undefined)
    return null
  const hour = Number(hhStr)
  const minute = Number(mmStr)
  if (hour > 23 || minute > 59)
    return null
  return { dayIndex, hour, minute }
}

function estimateEpisodesOut(startDate: Date, totalEpisodes: number, broadcast: BroadcastInfo | null): number {
  // Fallback simple weekly estimation if no broadcast info
  if (!broadcast) {
    const msPerDay = 86_400_000
    const today = new Date()
    const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / msPerDay)
    if (daysDiff < 0)
      return 0
    let count = Math.floor(daysDiff / 7) + 1 // first episode on start week
    if (count > totalEpisodes)
      count = totalEpisodes
    return count
  }

  // Build first episode datetime in JST
  const first = new Date(startDate)
  if (first.getDay() !== broadcast.dayIndex) {
    const diff = (broadcast.dayIndex - first.getDay() + 7) % 7
    first.setDate(first.getDate() + diff)
  }
  first.setHours(broadcast.hour, broadcast.minute, 0, 0)

  const now = new Date()

  const toJstMs = (d: Date) => d.getTime() + (9 * 60 - d.getTimezoneOffset()) * 60_000
  const firstJst = toJstMs(first)
  const nowJst = toJstMs(now)

  if (nowJst < firstJst)
    return 0

  const weekMs = 7 * 24 * 60 * 60 * 1000
  let count = Math.floor((nowJst - firstJst) / weekMs) + 1
  if (count > totalEpisodes)
    count = totalEpisodes
  return count
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
  const updatedText = originalText.replace('?', `~ ${endDateFormatted}`)
  airedInfo.element.innerHTML = updatedText

  const broadcastInfo = getInfoValue('Broadcast:')
  const broadcastParsed = broadcastInfo ? parseBroadcast(broadcastInfo.value) : null

  const episodesOut = estimateEpisodesOut(startDate, numEpisodes, broadcastParsed)
  if (episodesOut > 0 && !episodesInfo.element.querySelector('.episodes-estimate')) {
    episodesInfo.element.insertAdjacentHTML(
      'beforeend',
      ` <span class="episodes-estimate" style="opacity:0.7;">(~ ${episodesOut}/${numEpisodes} out)</span>`,
    )
  }
}

run()
