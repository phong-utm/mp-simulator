import got from "got"

import config from "./config"

async function removeTrip(tripId: string) {
  console.log(`Removing data for trip ${tripId}...`)
  await got.delete(`${config.apiBaseUrl}/trip?trip=${tripId}`)
}

async function removeMonth(monthId: string) {
  console.log(`Removing data for month ${monthId}...`)
  await got.delete(`${config.apiBaseUrl}/trip?month=${monthId}`)
}

async function removePeriod(period: string) {
  console.log(`Removing data for period ${period}...`)
  await got.delete(`${config.apiBaseUrl}/trip?period=${period}`)
}

function main(...args: string[]) {
  switch (args[0]) {
    case "-t":
      removeTrip(args[1]).catch(console.error)
      break
    case "-m":
      removeMonth(args[1]).catch(console.error)
      break
    case "-p":
      removePeriod(args[1]).catch(console.error)
      break
    default:
      console.log("Invalid CLI arguments.")
  }
}

main(...process.argv.slice(2))
