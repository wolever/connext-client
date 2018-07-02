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
  constructor (...args) {
    // [methodName, variableName, validatorResponse]
    super(...args)
    this.name = this.constructor.name
    this.statusCode = 200
    this.methodName = args[0]
    this.variableName = args[1]
    this.message = `[${args[0]}][${args[1]}] : ${args[2]}`
    Error.captureStackTrace(this, ParameterValidationError)
  }
}

export class ContractError extends Error {
  constructor (...args) {
    super(...args)
    this.name = this.constructor.name
    this.methodName = args[0]
    if (args.length === 4) {
      // [methodName, statusCode, transactionHash, message]
      this.statusCode = args[1]
      this.transactionHash = args[2]
      this.message = `[${args[1]}: ${args[0]}] ${args[3]}. Tx: ${args[2]}`
    } else if (args.length === 3) {
      // [methodName, statusCode, message]
      this.statusCode = args[1]
      this.transactionHash = args[2]
      this.message = `[${args[1]}: ${args[0]}] ${args[2]}`
    } else if (args.length === 2) {
      // [methodName, message]
      this.statusCode = 300
      this.message = `[${this.statusCode}: ${args[0]}] ${args[1]}`
    }
  }
}
