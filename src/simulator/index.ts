import got from "got"

import config from "../config"
import { Coordinates, RouteData } from "./types"
import TripSimulator, { TripSimulatorOptions } from "./TripSimulator"

export async function generateRealtimeData(
  routeId: string,
  options?: { accelerationRate: number }
) {
  // prettier-ignore
  const routeData = await got(`${config.apiBaseUrl}/routes/${routeId}`).json<RouteData>()
  const dayId = getDayId(new Date())
  const scheduledStart = getScheduledStart(new Date())
  const driver = getDriver(routeData.drivers, scheduledStart)

  // clean up data, just in case we previously had an incomplete trip
  await got.post(`${config.apiBaseUrl}/cleanup`)

  // prettier-ignore
  console.log(`Generating data for route ${routeId} on ${dayId} scheduled at ${scheduledStart}...`)
  await generateTrip(routeId, routeData, dayId, scheduledStart, driver, options)
  // console.log("DONE!!!")
}

export async function generateDataForDate(routeId: string, dayId: number) {
  // prettier-ignore
  const routeData = await got(`${config.apiBaseUrl}/routes/${routeId}`).json<RouteData>()
  await generateDate(routeId, routeData, parseDayId(dayId))
  // console.log("DONE!!!")
}

export async function generateDataForMonth(routeId: string, monthId: number) {
  // prettier-ignore
  const routeData = await got(`${config.apiBaseUrl}/routes/${routeId}`).json<RouteData>()

  const year = Math.floor(monthId / 100)
  const month = (monthId % 100) - 1

  // get list of days in the month
  const days: Date[] = []
  let d = new Date(year, month, 1)
  while (d.getMonth() === month && d.getTime() < getToday()) {
    days.push(d)
    // d = new Date(d.getTime() + 24 * 60 * 60 * 1000) // next day
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000 * 15) // next 15 days
  }

  // generate the days in parallel
  await Promise.all(days.map((d) => generateDate(routeId, routeData, d))).catch(
    console.error
  )

  // console.log("DONE!!!")
}

export async function generateDataForPeriod(routeId: string, period: string) {
  // prettier-ignore
  const routeData = await got(`${config.apiBaseUrl}/routes/${routeId}`).json<RouteData>()

  const year = parseInt(period.substring(0, 4))
  const fromMonth = period.endsWith("S1") ? 0 : 6
  const fromDate = new Date(year, fromMonth, 1)
  const toDate = new Date(year, fromMonth + 5, period.endsWith("S1") ? 30 : 31)

  // get list of days in the month
  const days: Date[] = []
  let d = fromDate
  while (d.getTime() <= toDate.getTime() && d.getTime() < getToday()) {
    days.push(d)
    // d = new Date(d.getTime() + 24 * 60 * 60 * 1000) // next day
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000 * 15) // next 15 days
  }

  // generate the days in parallel
  await Promise.all(days.map((d) => generateDate(routeId, routeData, d))).catch(
    console.error
  )

  // console.log("DONE!!!")
}

// async function getRouteBaseDuration(routeId: string) {
//   // prettier-ignore
//   const routeData = await got(`${config.apiBaseUrl}/routes/${routeId}`).json<RouteData>()
//   return routeData.links.reduce((tmp, l) => tmp + l.baseDuration, 0)
// }

/************ HELPER FUNCTIONS ***********/

async function generateDate(routeId: string, routeData: RouteData, d: Date) {
  const dayId = getDayId(d)
  console.log(`Generating data for route ${routeId} on ${dayId}...`)
  let start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 6)
  while (start.getHours() < 21) {
    const scheduledStart = getScheduledStart(start)
    const driver = getDriver(routeData.drivers, scheduledStart)
    await generateTrip(routeId, routeData, dayId, scheduledStart, driver, {
      realtimeMode: false,
      tripStartTime: start.getTime(),
      variationFactor: getRandomFactor(),
    })
    start = new Date(start.getTime() + 15 * 60 * 1000) // next trip in 15 minutes
  }
}

async function generateTrip(
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

const getDayId = (d: Date) => {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

const parseDayId = (dayId: number) => {
  const date = dayId % 100
  const monthId = (dayId - date) / 100
  const month = monthId % 100
  const year = (monthId - month) / 100
  return new Date(year, month - 1, date)
}

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

const to2Digits = (num: number) => (100 + num).toString().substring(1)

const getRandomFactor = () => {
  const x = 10 * Math.random()
  return x <= 7 ? 1.3 : x <= 9 ? 2 : 3
}

const getToday = () => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return today.getTime()
}
