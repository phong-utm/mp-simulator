import got from "got"
import TripSimulator from "./TripSimulator"

import config from "./config"
import { Coordinates, RouteData } from "./types"

// const generateQuickGuid = () =>
//   Math.random().toString(36).substring(2, 15) +
//   Math.random().toString(36).substring(2, 15)

const getDayId = (d: Date) => {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

const to2Digits = (num: number) => (100 + num).toString().substring(1)

const getScheduledStart = (t: Date) => {
  const h = t.getHours()
  const m = Math.round(t.getMinutes() / 15) * 15
  return `${to2Digits(h)}:${to2Digits(m)}`
}

async function generateRealtimeData(routeId: string) {
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
    {
      accelerationRate: 100,
    }
  )
  trip.start()
}

generateRealtimeData("T100").catch(console.error)
