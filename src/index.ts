import got from "got"
import TripSimulator from "./TripSimulator"

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

async function generateRealtimeData(
  routeId: string,
  options?: { accelerationRate: number }
) {
  // prettier-ignore
  const routeData = await got(`${config.apiBaseUrl}/routes/${routeId}`).json<RouteData>()

  const scheduledStart = getScheduledStart(new Date())
  const dayId = getDayId(new Date())
  const startTripUrl = `${config.apiBaseUrl}/trip?route=${routeId}&day=${dayId}&start=${scheduledStart}`
  const { tripId } = await got.post(startTripUrl).json<{ tripId: string }>()

  const trip = new TripSimulator(
    routeData,
    async (data: { location: Coordinates; time: number }) => {
      //console.log(new Date(data.time), data.location)
      await got.post(`${config.apiBaseUrl}/location/${tripId}`, {
        json: data,
      })
    },
    options
  )

  // prettier-ignore
  console.log(`Generating data for route ${routeId} on ${dayId} scheduled at ${scheduledStart}...`)
  await trip.run()
  console.log("DONE!!!")
}

async function generateDataForDate(routeId: string, d: Date) {
  // prettier-ignore
  const routeData = await got(`${config.apiBaseUrl}/routes/${routeId}`).json<RouteData>()

  const dayId = getDayId(d)
  let start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 6)
  while (start.getHours() < 21) {
    const scheduledStart = getScheduledStart(start)
    const startTripUrl = `${config.apiBaseUrl}/trip?route=${routeId}&day=${dayId}&start=${scheduledStart}`
    const { tripId } = await got.post(startTripUrl).json<{ tripId: string }>()
    const trip = new TripSimulator(
      routeData,
      async (data: { location: Coordinates; time: number }) => {
        // console.log(new Date(data.time), data.location)
        await got.post(`${config.apiBaseUrl}/location/${tripId}`, {
          json: data,
        })
      },
      {
        realtimeMode: false,
        tripStartTime: start.getTime(),
      }
    )

    // prettier-ignore
    console.log(`Generating data for route ${routeId} on ${dayId} scheduled at ${scheduledStart}...`)
    await trip.run()
    start = new Date(start.getTime() + 15 * 60 * 1000) // next trip in 15 minutes
  }
  console.log("DONE!!!")
}

async function generateDataForMonth(routeId: string, monthId: number) {
  const year = Math.floor(monthId / 100)
  const month = (monthId % 100) - 1
  // prettier-ignore
  const routeData = await got(`${config.apiBaseUrl}/routes/${routeId}`).json<RouteData>()

  let d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    const dayId = getDayId(d)
    let start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 6)
    while (start.getHours() < 21) {
      const scheduledStart = getScheduledStart(start)
      const startTripUrl = `${config.apiBaseUrl}/trip?route=${routeId}&day=${dayId}&start=${scheduledStart}`
      const { tripId } = await got.post(startTripUrl).json<{ tripId: string }>()
      const trip = new TripSimulator(
        routeData,
        async (data: { location: Coordinates; time: number }) => {
          // console.log(new Date(data.time), data.location)
          await got.post(`${config.apiBaseUrl}/location/${tripId}`, {
            json: data,
          })
        },
        {
          realtimeMode: false,
          tripStartTime: start.getTime(),
        }
      )

      // prettier-ignore
      console.log(`Generating data for route ${routeId} on ${dayId} scheduled at ${scheduledStart}...`)
      await trip.run()
      start = new Date(start.getTime() + 15 * 60 * 1000) // next trip in 15 minutes
    }
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000) // next day
  }
  console.log("DONE!!!")
}

generateRealtimeData("T100", { accelerationRate: 5 }).catch(console.error)

// generateDataForMonth("T100", 202102).catch(console.error)

// generateDataForDate("T100", new Date(2021, 2, 22)).catch(console.error)
// generateDataForDate("T100", new Date(2021, 2, 23)).catch(console.error)
// generateDataForDate("T100", new Date(2021, 2, 24)).catch(console.error)

// generateDataForDate("T100", new Date()).catch(console.error)

// async function getRouteBaseDuration(routeId: string) {
//   // prettier-ignore
//   const routeData = await got(`${config.apiBaseUrl}/routes/${routeId}`).json<RouteData>()
//   return routeData.links.reduce((tmp, l) => tmp + l.baseDuration, 0)
// }

// getRouteBaseDuration("T100").then(console.log).catch(console.error)
