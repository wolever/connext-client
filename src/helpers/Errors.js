export class ChannelOpenError extends Error {
  constructor (...args) {
    // [methodName, statusCode, message]
    super(args)
    this.name = this.constructor.name
    if (args.length === 3) {
      this.methodName = args[0]
      this.statusCode = args[1]
      this.message = `[${args[1]}: ${args[0]}] ${args[2]}`
    } else if (args.length == 2) {
      this.methodName = args[0]
      this.statusCode = 400
      this.message = `[${this.statusCode}: ${args[0]}] ${args[1]}`
    }
    Error.captureStackTrace(this, ChannelOpenError)
  }
}

export class ParameterValidationError extends Error {
  constructor (methodName = '', statusCode = 200, ...args) {
    super(...args)
    this.name = this.constructor.name
    this.methodName = methodName
    this.statusCode = statusCode
    Error.captureStackTrace(this, ParameterValidationError)
  }
}
