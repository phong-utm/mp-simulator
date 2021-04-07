import {
  generateDataForDate,
  generateDataForMonth,
  generateRealtimeData,
} from "./simulator"

function main(...args: string[]) {
  const getArgValue = (argName: string) => {
    const idx = args.findIndex((x) => x === argName)
    if (idx < 0) {
      return undefined
    } else if (idx >= args.length) {
      throw new Error(`Error: please provide value for ${argName} argument.`)
    } else {
      return args[idx + 1]
    }
  }

  const getRequiredArgValue = (argName: string) => {
    const val = getArgValue(argName)
    if (val === undefined) {
      throw new Error(`Error: please provide argument ${argName}.`)
    }
    return val
  }

  const process = async () => {
    const month = getArgValue("-m")
    const date = getArgValue("-d")
    if (month) {
      const route = getRequiredArgValue("-r")
      await generateDataForMonth(route, parseInt(month))
    } else if (date) {
      const route = getRequiredArgValue("-r")
      await generateDataForDate(route, parseInt(date))
    } else {
      const route = getArgValue("-r") || "R"
      const accelerate = getArgValue("-a")
      const options =
        accelerate !== undefined
          ? { accelerationRate: parseInt(accelerate) }
          : undefined
      await generateRealtimeData(route, options)
    }
  }

  process()
    .then(() => console.log("DONE!"))
    .catch(console.error)
}

main(...process.argv.slice(2))
