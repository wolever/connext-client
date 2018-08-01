require('dotenv').config()
const chai = require('chai')
const expect = chai.expect
const Web3 = require('web3')
const fetch = require('fetch-cookie')(require('node-fetch'))
const interval = require('interval-promise')
const { genAuthHash } = require('../helpers/utils')
const nock = require('nock')

global.fetch = fetch

const Connext = require('../../src/Connext')

// named variables
// on init
const web3 = new Web3('http://localhost:8545')
let client
let ingridAddress
let ingridUrl = 'http://localhost:8080'
let contractAddress = '0xdec16622bfe1f0cdaf6f7f20437d2a040cccb0a1'
let watcherUrl = ''

// for accounts
let accounts
let partyA, partyB, partyC, partyD, partyE

// for initial ledger channel states
let subchanAI

describe('register()', () => {
  before('authenticate', async () => {
    accounts = await web3.eth.getAccounts()
    ingridAddress = accounts[0]
    partyA = accounts[1]

    // const origin = 'localhost'

    // const challengeRes = await fetch(`${ingridUrl}/auth/challenge`, {
    //   method: 'POST',
    //   credentials: 'include'
    // })
    // const challengeJson = await challengeRes.json()
    // const nonce = challengeJson.nonce

    // const hash = genAuthHash(nonce, origin)
    // const signature = await web3.eth.sign(hash, ingridAddress)

    // const authRes = await fetch(`${ingridUrl}/auth/response`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     Origin: origin
    //   },
    //   credentials: 'include',
    //   body: JSON.stringify({
    //     signature,
    //     nonce,
    //     origin,
    //     address: ingridAddress.toLowerCase()
    //   })
    // })

    // const authJson = await authRes.json()

    const authJson = { token: 'SwSNTnh3LlEJg1N9iiifFgOIKq998PGA' }

    // init client instance
    client = new Connext({
      web3,
      ingridAddress,
      watcherUrl,
      ingridUrl,
      contractAddress
    })
  })

  describe('mocked contract and hub happy case', () => {
    let stubHub
    beforeEach('create stubbed hub methods', () => {
      // ledger channel request
    //   stubHub = sinon.fakeServer.create()
    //   stubHub.autoRespond = true
    //   stubHub.respondWith('GET', `${ingridUrl}/ledgerchannel/challenge`, [
    //     200,
    //     { 'Content-Type': 'application/json' },
    //     `[{ "challenge": 'sad'}]`
    //   ])
    // })
    nock(`${ingridUrl}`)
      //define the method to be intercepted
      .get('/postcodes/')
      //respond with a OK and the specified JSON response
      .reply(200, {
        "status": 200,
        "message": "This is a mocked response"
      });

    it('should return create an ETH only subchanAI', async () => {
      console.log(stubHub)
      const initialDeposits = {
        ethDeposit: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
        tokenDepsit: null
      }
      subchanAI = await client.register(initialDeposits, null, partyA)
      //   stubHub.respond()
    })

    afterEach('restore hub', () => {
      stubHub.restore()
    })
  })

  describe('parameter validation', () => {
    it('should fail if no initialDeposits object is provided', async () => {
      try {
        await client.register()
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if initialDeposits is malformed', async () => {
      const initialDeposits = {
        fail: 'should fail'
      }
      try {
        await client.register(initialDeposits)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if initialDeposits contains null balances', async () => {
      const initialDeposits = {
        ethDeposit: null,
        tokenDeposit: null
      }
      try {
        await client.register(initialDeposits)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if initialDeposits.ethDeposit is not a BN', async () => {
      const initialDeposits = {
        ethDeposit: 'fail',
        tokenDeposit: null
      }
      try {
        await client.register(initialDeposits)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if initialDeposits.ethDeposit is negative', async () => {
      const initialDeposits = {
        ethDeposit: Web3.utils.toBN('-5'),
        tokenDeposit: null
      }
      try {
        await client.register(initialDeposits)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })
  })

  it('should fail if initialDeposits.tokenDeposit is not a BN', async () => {
    const initialDeposits = {
      tokenDeposit: 'fail',
      ethDeposit: null
    }
    try {
      await client.register(initialDeposits)
    } catch (e) {
      expect(e.statusCode).to.equal(200)
    }
  })

  it('should fail if initialDeposits.tokenDeposit is negative', async () => {
    const initialDeposits = {
      tokenDeposit: Web3.utils.toBN('-5'),
      ethDeposit: null
    }
    try {
      await client.register(initialDeposits)
    } catch (e) {
      expect(e.statusCode).to.equal(200)
    }
  })

  it('should fail if initialDeposits.tokenDeposit is negative and initialDeposits.ethDeposit is valid', async () => {
    const initialDeposits = {
      tokenDeposit: Web3.utils.toBN('-5'),
      ethDeposit: Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
    }
    try {
      await client.register(initialDeposits)
    } catch (e) {
      expect(e.statusCode).to.equal(200)
    }
  })

  it('should fail if initialDeposits.ethDeposit is negative and initialDeposits.tokenDeposit is valid', async () => {
    const initialDeposits = {
      ethDeposit: Web3.utils.toBN('-5'),
      tokenDepsit: Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
    }
    try {
      await client.register(initialDeposits)
    } catch (e) {
      expect(e.statusCode).to.equal(200)
    }
  })

  it('should fail if initialDeposits.tokenDeposit is not BN and initialDeposits.ethDeposit is valid', async () => {
    const initialDeposits = {
      tokenDeposit: 'fail',
      ethDeposit: Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
    }
    try {
      await client.register(initialDeposits)
    } catch (e) {
      expect(e.statusCode).to.equal(200)
    }
  })

  it('should fail if initialDeposits.ethDeposit is not BN and initialDeposits.tokenDeposit is valid', async () => {
    const initialDeposits = {
      ethDeposit: 'fail',
      tokenDepsit: Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
    }
    try {
      await client.register(initialDeposits)
    } catch (e) {
      expect(e.statusCode).to.equal(200)
    }
  })

  it('should fail if invalid token address is supplied', async () => {
    const initialDeposits = {
      ethDeposit: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
      tokenDepsit: Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
    }
    const tokenAddress = 'fail'
    try {
      await client.register(initialDeposits, tokenAddress)
    } catch (e) {
      expect(e.statusCode).to.equal(200)
    }
  })

  it('should fail if invalid sender address is supplied', async () => {
    const initialDeposits = {
      ethDeposit: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
      tokenDepsit: Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
    }
    const tokenAddress = client.contractAddress
    const sender = 'fail'
    try {
      await client.register(initialDeposits, tokenAddress, sender)
    } catch (e) {
      expect(e.statusCode).to.equal(200)
    }
  })

  it('should fail if invalid challenge period type is supplied', async () => {
    const initialDeposits = {
      ethDeposit: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
      tokenDepsit: Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
    }
    const tokenAddress = client.contractAddress
    const sender = partyA
    const challenge = 'fail'
    try {
      await client.register(initialDeposits, tokenAddress, sender, challenge)
    } catch (e) {
      expect(e.statusCode).to.equal(200)
    }
  })

  it('should fail if negative challenge period is supplied', async () => {
    const initialDeposits = {
      ethDeposit: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
      tokenDepsit: Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
    }
    const tokenAddress = client.contractAddress
    const sender = partyA
    const challenge = -25
    try {
      await client.register(initialDeposits, tokenAddress, sender, challenge)
    } catch (e) {
      expect(e.statusCode).to.equal(200)
    }
  })
})
