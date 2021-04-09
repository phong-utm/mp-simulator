import got from "got"

import config from "./config"

const getCurrentMonthId = () => {
  const today = new Date()
  return today.getFullYear() * 100 + (today.getMonth() + 1)
}

async function processMonth(monthId: number) {
  console.log(`Processing month ${monthId}...`)

  const result = await got
    .post(`${config.apiBaseUrl}/analytics?month=${monthId}`)
    .json()

  return result
}

async function processPeriod(period: string) {
  console.log(`Processing period ${period}...`)

  const result = await got
    .post(`${config.apiBaseUrl}/analytics?period=${period}`)
    .json()

  return result
}

async function processPeriodAndMonths(period: string) {
  const year = parseInt(period.substring(0, 4))
  const fromMonth = period.endsWith("S1") ? 1 : 7
  const fromMonthId = year * 100 + fromMonth
  const currentMonthId = getCurrentMonthId()
  await Promise.all(
    [...Array(6)]
      .filter((_, idx) => fromMonthId + idx <= currentMonthId)
      .map((_, idx) => processMonth(fromMonthId + idx))
  )

  return await processPeriod(period)
}

// async function processTest() {
//   const result = await got.post(`${config.apiBaseUrl}/test`).json()
//   console.log(result)
// }

function main(...args: string[]) {
  const [durationType, durationId] = args
  switch (durationType) {
    case "-m":
      processMonth(parseInt(durationId)).then(console.log).catch(console.error)
      break
    case "-p":
      processPeriod(durationId).then(console.log).catch(console.error)
      break
    case "-pm":
      processPeriodAndMonths(durationId).then(console.log).catch(console.error)
      break
    // case "-t":
    //   processTest().catch(console.error)
    //   break
    default:
      console.log("Invalid CLI arguments.")
  }
}

main(...process.argv.slice(2))
