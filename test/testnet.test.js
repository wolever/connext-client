require('dotenv').config()
const chai = require('chai')
const expect = chai.expect
const Web3 = require('web3')
const fetch = require('fetch-cookie')(require('node-fetch'))
const interval = require('interval-promise')

global.fetch = fetch

const Connext = require('../src/Connext')

// named variables
// on init
const web3 = new Web3(process.env.ETH_NODE_URL)
let client
let hubAddress
let hubUrl = process.env.HUB_URL
let contractAddress = process.env.CONTRACT_ADDRESS

// for accounts
let partyA, partyB

// for initial ledger channel states
let subchanAI, subchanBI // channel ids
let chanA, chanB // channel objects

let threadIdA // thread Ids
let threadA // thread objects

describe('Connext happy case testing on testnet hub', () => {
  before('init the client', async () => {
    const accounts = await web3.eth.getAccounts()
    hubAddress = accounts[0]
    partyA = accounts[1]
    partyB = accounts[2]

    client = new Connext({
      web3,
      hubAddress,
      hubUrl,
      contractAddress
    })
  })

  describe('openChannel', () => {
    it('should open a channel between partyA and the hub', async () => {})

    it('should wait for the hub to autojoin the channel', async () => {})

    it('partyA should have initialDeposit in channel', async () => {})

    it('hub should have 0 balance in channel', async () => {})

    it('should have a status of open', async () => {})

    it('should open a channel between partyB and the hub', async () => {})

    it('should wait for the hub to autojoin the channel', async () => {})

    it('partyA should have initialDeposit in channel', async () => {})

    it('hub should have 0 balance in channel', async () => {})

    it('should have a status of open', async () => {})
  })

  describe('updateChannel', () => {
    it('should send an ETH balance update from client to hub', async () => {})
  })

  describe('request hub deposit', () => {
    it('should request that hub capitalize channel B', async () => {})

    it('should update hub channel B balance by the requested deposit amount', async () => {})
  })

  describe('openThread', () => {
    it('should open a thread between partyA and partyB', async () => {})

    it('should decrease partyA channel balance by thread balanceA', async () => {})

    it('should decrease partyI channelB balance by thread balanceA', async () => {})
  })

  describe('updateThread', () => {
    it('should send a state update from partyA to partyB', async () => {})

    it('should be able to send multiple simultaneous updates from partyA to partyB', async () => {})
  })

  describe('closeThread', () => {
    it('should close the thread between A and B', async () => {})

    it('should increase partyA channel balance by remainder of thread balanceA', async () => {})

    it('should increase partyB channel by remainder of thread balanceB', async () => {})

    it('should increase hub channelA balance by remainder of thread balanceB', async () => {})

    it('should increase hub channelB balance by remainder of thread balanceA', async () => {})
  })

  describe('closeChannel', () => {
    it('should close the channel between partyA and the hub', async () => {})

    it('should increase partyA wallet balance by channel balanceA', async () => {})

    it('should increase hub wallet balance by channel balanceB', async () => {})

    it('should close the channel between partyB and the hub', async () => {})

    it('should increase partyA wallet balance by channel balanceA', async () => {})

    it('should increase hub wallet balance by channel balanceB', async () => {})
  })
})
