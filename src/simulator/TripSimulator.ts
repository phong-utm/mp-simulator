import { Coordinates, RouteData } from "./types"

const PER_PASSENGER_BOADING_SECS = 6
const PER_PASSENGER_ALIGHTING_SECS = 2
const DOOR_OPEN_CLOSE_SECS = 5

export interface TripSimulatorOptions {
  tripStartTime?: number
  accelerationRate?: number
  realtimeMode?: boolean
  variationFactor?: number
}

export default class TripSimulator {
  private tripProgress: TripProgress
  private currentSpeed?: number
  private currentTime: number
  private readonly reportLocation: () => Promise<void>
  private readonly accelerationRate: number
  private readonly realtimeMode: boolean
  private readonly variationFactor: number

  constructor(
    routeData: RouteData,
    reportLocation: (data: {
      location: Coordinates
      time: number
    }) => Promise<void>,
    options: TripSimulatorOptions = {}
  ) {
    this.tripProgress = new TripProgress(routeData)
    this.currentTime = options.tripStartTime ?? Date.now()
    this.accelerationRate = options.accelerationRate ?? 1
    this.realtimeMode = options.realtimeMode ?? true
    this.variationFactor = options.variationFactor ?? 1.5
    this.reportLocation = async () => {
      const data = {
        location: this.tripProgress.currentLocation,
        time: this.currentTime,
      }
      await reportLocation(data)
    }
  }

  run() {
    return new Promise((resolve, reject) => {
      this.tick(resolve, reject).catch(reject)
    })
  }

  private tick = async (
    done: (val?: any) => void,
    err: (reason?: any) => void
  ) => {
    if (
      this.realtimeMode ||
      this.tripProgress.startOfLink ||
      this.tripProgress.endOfLink
    ) {
      await this.reportLocation()
    }

    if (this.tripProgress.ended) {
      return done()
    }

    const nextStepDuration = this.tripProgress.endOfLink
      ? this.calculateDwellTimeAtStop()
      : this.calculateTravelTimeForNextSegment()

    setTimeout(
      () => {
        this.tripProgress = this.tripProgress.moveNext()
        this.currentTime += nextStepDuration * 1000
        this.tick(done, err).catch(err)
      },
      this.realtimeMode ? (nextStepDuration * 1000) / this.accelerationRate : 0
    )
  }

  private calculateTravelTimeForNextSegment() {
    const distance = this.tripProgress.getNextSegmentLength()
    const baseSpeed = this.tripProgress.getCurrentLinkBaseSpeed()
    this.currentSpeed = randomSpeed(
      this.currentSpeed ?? baseSpeed,
      baseSpeed,
      this.variationFactor
    )
    return distance / this.currentSpeed
  }

  private calculateDwellTimeAtStop() {
    const boardingPassengers =
      Math.round(Math.random()) * randomNoOfPassengers()
    const alightingPassengers =
      Math.round(Math.random()) * randomNoOfPassengers()
    const boadingTime = boardingPassengers * PER_PASSENGER_BOADING_SECS
    const alightingTime = alightingPassengers * PER_PASSENGER_ALIGHTING_SECS
    return boadingTime > 0 || alightingTime > 0
      ? max(boadingTime, alightingTime) + DOOR_OPEN_CLOSE_SECS
      : 0
  }
}

class TripProgress {
  readonly ended: boolean
  readonly startOfLink: boolean
  readonly endOfLink: boolean

  constructor(
    private routeData: RouteData,
    private readonly linkIndex = 0,
    private readonly pointIndex = 0
  ) {
    const endOfLink =
      pointIndex === this.routeData.links[linkIndex].points.length - 1
    this.startOfLink = pointIndex === 0
    this.endOfLink = endOfLink
    this.ended = endOfLink && linkIndex === routeData.links.length - 1
  }

  get currentLocation(): Coordinates {
    // prettier-ignore
    const { lat, lng } = this.routeData.links[this.linkIndex].points[this.pointIndex]
    return { lat, lng }
  }

  moveNext() {
    if (this.endOfLink) {
      return new TripProgress(this.routeData, this.linkIndex + 1, 0)
    } else {
      return new TripProgress(
        this.routeData,
        this.linkIndex,
        this.pointIndex + 1
      )
    }
  }

  getNextSegmentLength() {
    return this.routeData.links[this.linkIndex].points[this.pointIndex + 1]
      .distFromPrev
  }

  getCurrentLinkBaseSpeed() {
    const { length, baseDuration } = this.routeData.links[this.linkIndex]
    const dwellTime =
      this.linkIndex === 0 || baseDuration < 60
        ? 0
        : min(30, 0.1 * baseDuration)
    return length / (baseDuration - dwellTime)
  }
}

function min(a: number, b: number) {
  return a < b ? a : b
}

function max(a: number, b: number) {
  return a > b ? a : b
}

function randomSpeed(currentSpeed: number, baseSpeed: number, factor: number) {
  const maxSpeed = baseSpeed * factor
  const minSpeed = baseSpeed / factor
  const changeRatio = 0.2 * Math.random() - 0.1 // random number between -0.1 and 0.1
  const updatedSpeed = (1 + changeRatio) * currentSpeed
  // prettier-ignore
  return updatedSpeed > maxSpeed ? maxSpeed : updatedSpeed < minSpeed ? minSpeed : updatedSpeed
}

function randomNoOfPassengers() {
  // 80% - up to 4 passengers, 20% - 5 to 10 passengers
  return Math.round(
    Math.random() < 0.8 ? 4 * Math.random() : 5 + 5 * Math.random()
  )
}
