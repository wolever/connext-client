const chai = require('chai')
const expect = chai.expect
const Web3 = require('web3')
const fetch = require('fetch-cookie')(require('node-fetch'))
const nock = require('nock')
const { createStubbedContract, createStubbedHub } = require('../helpers/stubs')

global.fetch = fetch

const Connext = require('../../src/Connext')

// named variables
// on init
const web3 = new Web3(process.env.ETH_NODE_URL)
let client
let hubAddress
let hubUrl = process.env.HUB_URL
let contractAddress = process.env.CONTRACT_ADDRESS
let watcherUrl = ''

// for accounts
let accounts
let partyA
let partyB
let partyC
let partyD

describe('closeChannel()', () => {
  before('init client and accounts', async () => {
    accounts = await web3.eth.getAccounts()
    hubAddress = accounts[0]
    partyA = accounts[1]
    partyB = accounts[2]
    partyC = accounts[3]
    partyD = accounts[4]

    const authJson = { token: 'SwSNTnh3LlEJg1N9iiifFgOIKq998PGA' }

    // init client instance
    client = new Connext({
      web3,
      hubAddress,
      watcherUrl,
      hubUrl,
      contractAddress
    })
  })

  describe('mocked hub and contract', () => {
    let stubHub
    beforeEach('create stubbed hub methods', async () => {
      // stub contract methods
      client.channelManagerInstance.methods = createStubbedContract()
      // activate nock
      if (!nock.isActive()) nock.activate()
      // stub hub methods
      stubHub = await createStubbedHub(
        `${client.hubUrl}`,
        'OPEN_CHANNEL_CLOSED_THREAD',
        'UPDATED'
      )
    })

    it('should closeChannel from the ETH/TOKEN channel', async () => {
      const response = await client.closeChannel(partyA)
      expect(response).to.equal('transactionHash')
    })

    it('should closeChannel from the ETH/TOKEN recipient channel', async () => {
      const response = await client.closeChannel(partyB)
      expect(response).to.equal('transactionHash')
    })

    it('should closeChannel from the ETH channel', async () => {
      const response = await client.closeChannel(partyC)
      expect(response).to.equal('transactionHash')
    })

    it('should closeChannel from the TOKEN channel', async () => {
      const response = await client.closeChannel(partyD)
      expect(response).to.equal('transactionHash')
    })

    afterEach('restore hub and contract', () => {
      nock.restore()
      nock.cleanAll()
    })
  })

  describe('parameter validation', () => {
    it('should fail if an invalid sender is provided', async () => {
      try {
        await client.closeChannel('fail')
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })
  })
})
