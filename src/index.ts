import got from "got"
import TripSimulator, { TripSimulatorOptions } from "./TripSimulator"

import config from "./config"
import { Coordinates, RouteData } from "./types"

const getDayId = (d: Date) => {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

const to2Digits = (num: number) => (100 + num).toString().substring(1)

const getScheduledStart = (t: Date) => {
  let m = Math.round(t.getMinutes() / 15) * 15
  let h = t.getHours()
  if (m === 60) {
    h++
    m = 0
  }

  return `${to2Digits(h)}:${to2Digits(m)}`
}

const getDriver = (drivers: string[], scheduledStart: string) => {
  const mins = scheduledStart.substring(scheduledStart.length - 2)
  const index = parseInt(mins) / 15
  return drivers[index]
}

async function _generateTrip(
  routeId: string,
  routeData: RouteData,
  dayId: number,
  scheduledStart: string,
  driver: string,
  options: TripSimulatorOptions = {}
) {
  const startTripUrl = `${config.apiBaseUrl}/trip?route=${routeId}&day=${dayId}&start=${scheduledStart}&driver=${driver}`
  const { tripId } = await got.post(startTripUrl).json<{ tripId: string }>()
  const trip = new TripSimulator(
    routeData,
    async (data: { location: Coordinates; time: number }) => {
      if (options.realtimeMode) {
        console.log(new Date(data.time), data.location)
      }
      await got.post(`${config.apiBaseUrl}/location/${tripId}`, {
        json: data,
      })
    },
    options
  )

  // prettier-ignore
  // console.log(`Generating data for route ${routeId} on ${dayId} scheduled at ${scheduledStart}...`)
  await trip.run()
}

async function _generateDate(routeId: string, routeData: RouteData, d: Date) {
  const dayId = getDayId(d)
  console.log(`Generating data for route ${routeId} on ${dayId}...`)

  let start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 6)
  while (start.getHours() < 21) {
    const scheduledStart = getScheduledStart(start)
    const driver = getDriver(routeData.drivers, scheduledStart)
    await _generateTrip(routeId, routeData, dayId, scheduledStart, driver, {
      realtimeMode: false,
      tripStartTime: start.getTime(),
    })
    start = new Date(start.getTime() + 15 * 60 * 1000) // next trip in 15 minutes
  }
}

async function generateRealtimeData(
  routeId: string,
  options?: { accelerationRate: number }
) {
  // prettier-ignore
  const routeData = await got(`${config.apiBaseUrl}/routes/${routeId}`).json<RouteData>()
  const dayId = getDayId(new Date())
  const scheduledStart = getScheduledStart(new Date())
  const driver = getDriver(routeData.drivers, scheduledStart)

  // prettier-ignore
  console.log(`Generating data for route ${routeId} on ${dayId} scheduled at ${scheduledStart}...`)
  await _generateTrip(
    routeId,
    routeData,
    dayId,
    scheduledStart,
    driver,
    options
  )

  console.log("DONE!!!")
}

async function generateDataForDate(routeId: string, d: Date) {
  // prettier-ignore
  const routeData = await got(`${config.apiBaseUrl}/routes/${routeId}`).json<RouteData>()
  await _generateDate(routeId, routeData, d)
  console.log("DONE!!!")
}

async function generateDataForMonth(routeId: string, monthId: number) {
  // prettier-ignore
  const routeData = await got(`${config.apiBaseUrl}/routes/${routeId}`).json<RouteData>()

  const year = Math.floor(monthId / 100)
  const month = (monthId % 100) - 1

  // get list of days in the month
  const days: Date[] = []
  let d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(d)
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000) // next day
  }

  // generate the days in parallel
  await Promise.all(
    days.map((d) => _generateDate(routeId, routeData, d))
  ).catch(console.error)

  console.log("DONE!!!")
}

generateRealtimeData("R", { accelerationRate: 5 }).catch(console.error)
// generateDataForMonth("H", 202012).catch(console.error)

// generateDataForDate("H", new Date(2021, 2, 22)).catch(console.error)
// generateDataForDate("H", new Date(2021, 2, 23)).catch(console.error)
// generateDataForDate("H", new Date(2021, 2, 24)).catch(console.error)

// generateDataForDate("H", new Date()).catch(console.error)

// async function getRouteBaseDuration(routeId: string) {
//   // prettier-ignore
//   const routeData = await got(`${config.apiBaseUrl}/routes/${routeId}`).json<RouteData>()
//   return routeData.links.reduce((tmp, l) => tmp + l.baseDuration, 0)
// }

// getRouteBaseDuration("H").then(console.log).catch(console.error)
