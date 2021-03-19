import got from "got"
import TripSimulator from "./TripSimulator"

import config from "./config"
import { Coordinates, RouteData } from "./types"

const generateQuickGuid = () =>
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15)

async function generateRealtimeData(routeId: string) {
  // prettier-ignore
  const routeData = await got(`${config.apiBaseUrl}/routes/${routeId}`).json<RouteData>()

  const tripId = generateQuickGuid()
  const trip = new TripSimulator(
    routeData,
    async (data: { location: Coordinates; time: number }) => {
      //console.log(new Date(data.time), data.location)
      await got.post(`${config.apiBaseUrl}/location/${routeId}/${tripId}`, {
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
