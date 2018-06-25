import { fakeWeb3 } from './FakeWeb3'

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

export const createFakeWeb3 = (eth, utils) => {
  return fakeWeb3
}

export const retry = (retries, fn) => {
  return fn().catch(
    err => (retries > 1 ? retry(retries - 1, fn) : Promise.reject(err))
  )
}

export const pause = duration => {
  return new Promise(res => setTimeout(res, duration))
}

export const backoff = (retries, fn, delay = 500) => {
  console.log(retries)
  console.log(fn)
  console.log(typeof fn)
  return fn().catch(
    err =>
      (retries > 1
        ? pause(delay).then(() => backoff(retries - 1, fn, delay * 2))
        : Promise.reject(err))
  )
}
