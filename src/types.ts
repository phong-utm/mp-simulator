export interface Coordinates {
  lat: number
  lng: number
}

export interface LinkData {
  from: string
  to: string
  points: Array<{
    lat: number
    lng: number
    distFromPrev: number
  }>
  length: number
  baseDuration: number
}

export interface RouteData {
  origin: string
  destination: string
  links: LinkData[]
}
