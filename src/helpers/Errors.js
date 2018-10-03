const Web3 = require('web3')

export class ThreadCloseError extends Error {
  constructor (...args) {
    // [methodName, statusCode, message]
    super(args)
    this.name = 'ChannelCloseError'
    if (args.length === 3) {
      this.methodName = args[0]
      this.statusCode = args[1]
      this.message = `[${args[1]}: ${args[0]}] ${args[2]}`
    } else if (args.length == 2) {
      this.methodName = args[0]
      this.statusCode = 650
      this.message = `[${this.statusCode}: ${args[0]}] ${args[1]}`
    }
    Error.captureStackTrace(this, ThreadCloseError)
  }
}

export class ChannelCloseError extends Error {
  constructor (...args) {
    // [methodName, statusCode, message]
    super(args)
    this.name = 'ChannelCloseError'
    if (args.length === 3) {
      this.methodName = args[0]
      this.statusCode = args[1]
      this.message = `[${args[1]}: ${args[0]}] ${args[2]}`
    } else if (args.length == 2) {
      this.methodName = args[0]
      this.statusCode = 600
      this.message = `[${this.statusCode}: ${args[0]}] ${args[1]}`
    }
    Error.captureStackTrace(this, ChannelCloseError)
  }
}

export class ThreadUpdateError extends Error {
  constructor (...args) {
    // [methodName, statusCode, message]
    super(args)
    this.name = 'UpdateStateError'
    if (args.length === 3) {
      this.methodName = args[0]
      this.statusCode = args[1]
      this.message = `[${args[1]}: ${args[0]}] ${args[2]}`
    } else if (args.length == 2) {
      this.methodName = args[0]
      this.statusCode = 550
      this.message = `[${this.statusCode}: ${args[0]}] ${args[1]}`
    }
    Error.captureStackTrace(this, ThreadUpdateError)
  }
}

export class ChannelUpdateError extends Error {
  constructor (...args) {
    // [methodName, statusCode, message]
    super(args)
    this.name = 'UpdateStateError'
    if (args.length === 3) {
      this.methodName = args[0]
      this.statusCode = args[1]
      this.message = `[${args[1]}: ${args[0]}] ${args[2]}`
    } else if (args.length == 2) {
      this.methodName = args[0]
      this.statusCode = 500
      this.message = `[${this.statusCode}: ${args[0]}] ${args[1]}`
    }
    Error.captureStackTrace(this, ChannelUpdateError)
  }
}

export class ThreadOpenError extends Error {
  constructor (...args) {
    // [methodName, statusCode, message]
    super(args)
    this.name = 'ThreadOpenError'
    this.methodName = args[0]
    if (args.length === 3) {
      this.statusCode = args[1]
      this.message = `[${args[1]}: ${args[0]}] ${args[2]}`
    } else if (args.length == 2) {
      this.statusCode = 450
      this.message = `[${this.statusCode}: ${args[0]}] ${args[1]}`
    }
    Error.captureStackTrace(this, ThreadOpenError)
  }
}

export class ChannelOpenError extends Error {
  constructor (...args) {
    // [methodName, statusCode, message]
    super(args)
    this.name = 'ChannelOpenError'
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

export function validateTipPurchaseMeta (meta) {
  if (!meta.fields) {
    return false
  }
  const { streamId, performerId, performerName } = meta.fields
  if (!streamId || !performerId || !performerName) {
    return false
  } else {
    return true
  }
}

export function validatePurchasePurchaseMeta (meta) {
  if (!meta.fields) {
    return false
  }
  const { productSku, productName } = meta.fields
  if (!productSku || !productName) {
    return false
  } else {
    return true
  }
}

export function validateBalance (value) {
  if (!value) {
    return false
  }
  if (!Web3.utils.isBN(value) || value.isNeg()) {
    return false
  } else {
    return true
  }
}

export function validateWithdrawalPurchaseMeta (meta) {
  if (!meta.fields) {
    return false
  }
  const { recipient } = meta.fields
  return !!recipient && Web3.utils.isAddress(recipient)
}

export function validateExchangePurchaseMeta (meta) {
  return !!meta.exchangeRate
}
