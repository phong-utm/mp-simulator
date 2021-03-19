import { Coordinates, RouteData } from "./types"

function randomSpeed(currentSpeed: number, baseSpeed: number) {
  const maxSpeed = baseSpeed * 1.3
  const minSpeed = baseSpeed / 3
  const changeRatio = 0.2 * Math.random() - 0.1 // random number between -0.1 and 0.1
  const updatedSpeed = (1 + changeRatio) * currentSpeed
  return updatedSpeed > maxSpeed
    ? maxSpeed
    : updatedSpeed < minSpeed
    ? minSpeed
    : updatedSpeed
}

const AVG_BOARDING_TIME_PER_PASSENGER = 6 // seconds

export default class TripSimulator {
  private tripProgress: TripProgress
  private readonly reportLocation: () => void
  private currentSpeed?: number
  private currentTime: number
  private readonly accelerationRate: number

  constructor(
    routeData: RouteData,
    reportLocation: (data: {
      location: Coordinates
      time: number
    }) => Promise<void>,
    options: {
      tripStartTime?: number
      accelerationRate?: number
    } = {}
  ) {
    this.tripProgress = new TripProgress(routeData)
    this.currentTime = options.tripStartTime ?? Date.now()
    this.accelerationRate = options.accelerationRate ?? 1
    this.reportLocation = () => {
      const data = {
        location: this.tripProgress.currentLocation,
        time: this.currentTime,
      }
      reportLocation(data).catch(console.error)
    }
  }

  start() {
    this.tick()
  }

  private tick = () => {
    this.reportLocation()

    if (!this.tripProgress.ended) {
      const nextStepDuration = this.tripProgress.isEndOfLink()
        ? this.calculateDwellTimeAtStop()
        : this.calculateTravelTimeForNextSegment()

      setTimeout(() => {
        this.tripProgress = this.tripProgress.moveNext()
        this.currentTime += nextStepDuration * 1000
        this.tick()
      }, (nextStepDuration * 1000) / this.accelerationRate)
    }
  }

  private calculateTravelTimeForNextSegment() {
    const distance = this.tripProgress.getNextSegmentLength()
    const baseSpeed = this.tripProgress.getCurrentLinkBaseSpeed()
    this.currentSpeed = randomSpeed(this.currentSpeed ?? baseSpeed, baseSpeed)
    return distance / this.currentSpeed
  }

  private calculateDwellTimeAtStop() {
    const boardingPassengers = Math.random() * 10
    return boardingPassengers * AVG_BOARDING_TIME_PER_PASSENGER
  }
}

class TripProgress {
  readonly ended: boolean

  constructor(
    private routeData: RouteData,
    private readonly linkIndex = 0,
    private readonly pointIndex = 0
  ) {
    this.ended =
      linkIndex === routeData.links.length - 1 &&
      pointIndex === routeData.links[linkIndex].points.length - 1
  }

  get currentLocation(): Coordinates {
    // prettier-ignore
    const { lat, lng } = this.routeData.links[this.linkIndex].points[this.pointIndex]
    return { lat, lng }
  }

  moveNext() {
    if (this.isEndOfLink()) {
      // console.log("** end of link **")
      return new TripProgress(this.routeData, this.linkIndex + 1, 0)
    } else {
      return new TripProgress(
        this.routeData,
        this.linkIndex,
        this.pointIndex + 1
      )
    }
  }

  isEndOfLink() {
    return (
      this.pointIndex === this.routeData.links[this.linkIndex].points.length - 1
    )
  }

  getNextSegmentLength() {
    return this.routeData.links[this.linkIndex].points[this.pointIndex + 1]
      .distFromPrev
  }

  getCurrentLinkBaseSpeed() {
    const { length, baseDuration } = this.routeData.links[this.linkIndex]
    const dwellTime =
      this.linkIndex === 0 || baseDuration < 120
        ? 0
        : min(30, 0.1 * baseDuration)
    return length / (baseDuration - dwellTime)
  }
}

function min(a: number, b: number) {
  return a < b ? a : b
}
