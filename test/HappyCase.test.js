const assert = require('assert')
const Connext = require('../src/Connext')
const Web3 = require('web3')
const axios = require('axios')
const MockAdapter = require('axios-mock-adapter')
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
let contractAddress = '0xdb4e4fea88cd527310c001e7a5017f4ffef99c4d'
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
let subchanAI // ids
let subchanBI // ids
let lcA // objects
let lcB // objects

// for virtual channel
let vcId
let balanceB

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
      partyA = accounts[1]
      partyB = accounts[2]
      ingridAddress = accounts[0]
      client = new Connext({
        web3,
        ingridAddress,
        watcherUrl,
        ingridUrl,
        contractAddress,
        hubAuth
      })
      assert.ok(
        client.ingridAddress === ingridAddress.toLowerCase() &&
          client.ingridUrl === ingridUrl &&
          client.watcherUrl === watcherUrl
      )
    }
  )
})

describe('creating subchans', () => {
  // register function hardcodes from accounts[0]
  // to accurately test, must open channels directly with contract
  describe('using register on client and hard coded subchanIDs', () => {
    it(
      'should return an lcID created on the contract with partyA by calling register()',
      async () => {
        subchanAI = await client.register(initialDeposit)
        console.log('subchanAI:', subchanAI)
        assert.ok(Web3.utils.isHexStrict(subchanAI))
      }
    ).timeout(6000)

    it('should request hub joins subchanAI', async () => {
      //   response = await setTimeoutPromise(7000, client.requestJoinLc(subchanAI))
      subchanAI =
        '0xf69384a967316fc373784f9701c4af96603a651bb08691391db574ab73721de9'
      response = await client.requestJoinLc(subchanAI)
      console.log(response)
      //   assert.equal(response.txHash, ':)')
      assert.ok(Web3.utils.isHex(response))
    }).timeout(17000)

    it('should request hub joins subchanBI', async () => {
      //   response = await setTimeoutPromise(10000, client.requestJoinLc(subchanBI))
      subchanBI =
        '0xbbbbf9eb2fd6d1c317225e83acce127fd7be3daa3a7721755ee260962fcae5fb'
      response = await client.requestJoinLc(subchanBI)
      console.log(response)
      //   assert.equal(response.txHash, ':)')
      assert.ok(Web3.utils.isHex(response))
    }).timeout(7000)
  })

  describe('calling functions on contract', () => {
    it('should generate a unique id for subchanAI', () => {
      // accounts[0] is hardcoded into the client
      // create subchanAI with contract functions directly
      subchanAI = Connext.getNewChannelId()
      console.log('subchanAI:', subchanAI)
      assert.ok(Web3.utils.isHexStrict(subchanAI))
    })

    it('should create subchanAI on channel manager instance', async () => {
      // hardcode contract call, accounts[0] is encoded in client
      response = await client.channelManagerInstance.methods
        .createChannel(subchanAI, ingridAddress)
        .send({ from: partyA, value: initialDeposit, gas: 3000000 })
      assert.ok(Web3.utils.isHex(response.transactionHash))
    }).timeout(7000)

    it('should generate a unique id for subchanBI', () => {
      // accounts[0] is hardcoded into the client
      // create subchanBI with contract functions directly
      subchanBI = Connext.getNewChannelId()
      console.log('subchanBI:', subchanBI)
      assert.ok(Web3.utils.isHexStrict(subchanBI))
      // assert.equal(subchanBI, ';)')
    })

    it('should create subchanBI on channel manager instance', async () => {
      // hardcode contract call, accounts[0] is encoded in client
      response = await client.channelManagerInstance.methods
        .createChannel(subchanBI, ingridAddress)
        .send({ from: partyB, value: initialDeposit, gas: 3000000 })
      assert.ok(Web3.utils.isHex(response.transactionHash))
      //   assert.equal(response.transactionHash, ';)')
    }).timeout(7000)

    it(
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
    ).timeout(10000)
  })
})

describe('creating a virtual channel between partyA and partyB', () => {
  it('partyA should create a virtual channel with 5 eth in it', async () => {
    vcId = await client.openChannel({ to: partyB })
    assert.ok(Web3.utils.isHexStrict(vcId))
  })

  it('partyB should join the virtual channel with 0 eth', async () => {
    // vcId = '0x1891b8428e9f413edd3001d9f8be40c40fa83dd291ad8480594fd1ff878cfd50'
    response = await client.joinChannel(vcId)
    assert.equal(response, vcId)
  })

  it('partyA sends a state update in the virtual channel of 1 eth', async () => {
    // vcId = '0x1891b8428e9f413edd3001d9f8be40c40fa83dd291ad8480594fd1ff878cfd50'
    balanceA = Web3.utils.toBN(Web3.utils.toWei('4', 'ether'))
    balanceB = Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
    response = await client.updateBalance({
      channelId: vcId,
      balanceA,
      balanceB
    })
    assert.ok(
      Web3.utils.toBN(response.balanceA) === balanceA &&
        Web3.utils.toBN(response.balanceB) === balanceB
    )
  })

  //   describe('partyB signs the latest state udpate', () => {
  //     it.only('requests latest virtual channel udpate from ingrid', async () => {})

  //     it.only('partyB cosigns the virtual channel state update', async () => {})
  //   })

  it('should fast close the virtual channel', async () => {
    // vcId = '0x1891b8428e9f413edd3001d9f8be40c40fa83dd291ad8480594fd1ff878cfd50'
    const deposit = await client.fastCloseChannel(vcId)
    assert.equal(deposit, balanceA)
  })
})

// describe('Withdrawing from ledger channels', () => {
//     it('should withdraw funds from subchanAI', async () => {
//         response = await client.withdraw()
//         assert.ok(Web3.utils.isHex(response))
//     })

//     it('should withdraw funds from subchanBI by calling consensusCloseChannelContractHandler', async () => {
//         lcB = await client.getLatestLedgerStateUpdate(subchanBI)
//         let response = await client.consensusCloseChannelContractHandler({
//             lcId: ,

//         })
//     })
// })
