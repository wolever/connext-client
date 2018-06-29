export const createRandomBytes32 = async () => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(32, (err, buf) => {
      if (err) reject(err)
      return resolve(`0x${buf.toString('hex')}`)
    })
  })
}

export const createRandomBytes65 = async () => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(65, (err, buf) => {
      if (err) reject(err)
      resolve(`0x${buf.toString('hex')}`)
    })
  })
}

export const timeout = ms => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
