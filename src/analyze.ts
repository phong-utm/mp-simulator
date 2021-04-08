import got from "got"

import config from "./config"

async function processMonth(monthId: number) {
  const result = await got
    .post(`${config.apiBaseUrl}/analytics?month=${monthId}`)
    .json()

  console.log(result)
}

async function processPeriod(period: string) {
  const result = await got
    .post(`${config.apiBaseUrl}/analytics?period=${period}`)
    .json()

  console.log(result)
}

// async function processTest() {
//   const result = await got.post(`${config.apiBaseUrl}/test`).json()
//   console.log(result)
// }

function main(...args: string[]) {
  const [durationType, durationId] = args
  switch (durationType) {
    case "-m":
      processMonth(parseInt(durationId)).catch(console.error)
      break
    case "-p":
      processPeriod(durationId).catch(console.error)
      break
    // case "-t":
    //   processTest().catch(console.error)
    //   break
    default:
      console.log("Invalid CLI arguments.")
  }
}

main(...process.argv.slice(2))
