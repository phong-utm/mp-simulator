function getRequiredParam(param: string) {
  const paramValue = process.env[param]
  if (!paramValue) {
    throw new Error(`Environment variable not found: ${param}`)
  }
  return paramValue
}

const config = {
  env: process.env.NODE_ENV || "development",
  apiBaseUrl: getRequiredParam("API_BASE_URL"),
}

export default config
