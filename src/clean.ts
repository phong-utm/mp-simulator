import got from "got"

import config from "./config"

async function removeTrip(tripId: string) {
  console.log(`Removing data for trip ${tripId}...`)
  const result = await got.delete(`${config.apiBaseUrl}/trip/${tripId}`).json()
  console.log(result)
}

function main(...args: string[]) {
  switch (args[0]) {
    case "-t":
      removeTrip(args[1]).catch(console.error)
      break
    default:
      console.log("Invalid CLI arguments.")
  }
}

main(...process.argv.slice(2))
