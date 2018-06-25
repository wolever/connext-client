const assert = require('assert')
const Connext = require('../src/Connext')
const Web3 = require('web3')
const axios = require('axios')
const { retry, pause, backoff } = require('./Helpers')
const util = require('util')
const setTimeoutPromise = util.promisify(setTimeout)

// named variables
// on init
let web3
let client
let ingridAddress
let watcherUrl = process.env.WATCHER_URL_DEV
let ingridUrl = process.env.INGRID_URL_DEV
let contractAddress = '0x31713144d9ae2501e644a418dd9035ed840b1660'
let hubAuth =
  's%3AE_xMockGuJVqvIFRbP0RCXOYH5SRGHOe.zgEpYQg2KnkoFsdeD1CzAMLsu%2BmHET3FINdfZgw9xhs'

// for accounts
let accounts
let partyA
let partyB

// for initial ledger channel states
let balanceA
let balanceI
let initialDeposit = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
let subchanAI
let subchanBI

// hub response placeholder
let response

// init client
describe('client init', () => {
  // init web3
  const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
  web3 = new Web3(`ws://localhost:${port}`)
  it.only(
    'should properly initialize the client in dev mode (localhost)',
    async () => {
      accounts = await web3.eth.getAccounts()
      partyA = accounts[0]
      partyB = accounts[1]
      ingridAddress = accounts[2]
      client = new Connext({
        web3,
        ingridAddress,
        watcherUrl,
        ingridUrl,
        contractAddress,
        hubAuth
      })
      assert.ok(
        client.ingridAddress === ingridAddress &&
          client.ingridUrl === ingridUrl &&
          client.watcherUrl === watcherUrl
      )
    }
  )
})

describe('register with hub: register(initialDeposit)', () => {
  it
    .only(
      'should return an lcID created on the contract with partyA',
      async () => {
        subchanAI = await client.register(initialDeposit)
        console.log('subchanAI:', subchanAI)
        assert.ok(Web3.utils.isHexStrict(subchanAI))
      }
    )
    .timeout(6000)
  it('should request hub joins subchanAI', async () => {
    //   response = await setTimeoutPromise(10000, client.requestJoinLc(subchanAI))
    subchanAI =
      '0xa4b43e0946ad995c22a15fce8f82e064c3205f8262b9768130d979249347d9f6'
    response = await client.requestJoinLc(subchanAI)
    console.log(response)
    assert.equal(response.txHash, ':)')
  }).timeout(17000)

  it.only('should generate a unique id for subchanBI', () => {
    // accounts[0] is hardcoded into the client
    // create subchanBI with contract functions directly
    subchanBI = Connext.getNewChannelId()
    console.log('subchanBI:', subchanBI)
    assert.ok(Web3.utils.isHexStrict(subchanBI))
    // assert.equal(subchanBI, ';)')
  })

  it
    .only('should create subchanBI on channel manager instance', async () => {
      // hardcode contract call, accounts[0] is encoded in client
      response = await client.channelManagerInstance.methods
        .createChannel(subchanBI, ingridAddress)
        .send({ from: partyB, value: initialDeposit, gas: 3000000 })
      assert.ok(Web3.utils.isHex(response.transactionHash))
      //   assert.equal(response.transactionHash, ';)')
    })
    .timeout(7000)

  it('should request hub joins subchanBI', async () => {
    response = backoff(5, await client.requestJoinLc(subchanBI))
    assert.equal(response.txHash, ':)')
  }).timeout(7000)

  it
    .only(
      'should force ingrid to join both subchans by calling it on contract',
      async () => {
        let responseAI = await client.channelManagerInstance.methods
          .joinChannel(subchanAI)
          .send({ from: ingridAddress, value: initialDeposit, gas: 3000000 })

        let responseBI = await client.channelManagerInstance.methods
          .joinChannel(subchanBI)
          .send({ from: ingridAddress, value: initialDeposit, gas: 3000000 })
        // assert.equal(responseAI.transactionHash, ';)')
        assert.ok(
          Web3.utils.isHex(responseAI.transactionHash) &&
            Web3.utils.isHex(responseBI.transactionHash)
        )
      }
    )
    .timeout(10000)
})
