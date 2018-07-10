require('dotenv').config()
const assert = require('assert')
const Connext = require('../src/Connext')
const { timeout } = require('./helpers/utils')
const Web3 = require('web3')

// named variables
// on init
let web3
let client
let ingridAddress
let watcherUrl = process.env.WATCHER_URL || ''
let ingridUrl = process.env.INGRID_URL || 'http://localhost:8080'
let contractAddress = '0x31713144d9ae2501e644a418dd9035ed840b1660'
let hubAuth = process.env.HUB_AUTH || ''
// for accounts
let accounts
let partyA, partyB

// for initial ledger channel states
let subchanAI, subchanBI
let lcA, lcB
let balanceA, balanceB
let initialDeposit = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
let vcId
let vc

describe('Connext dispute cases', () => {
  beforeEach(
    'Should init fresh client with web3 and ChannelManager',
    async () => {
      // init web3
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '8545'
      web3 = new Web3(`ws://localhost:${port}`)
      // set account vars
      accounts = await web3.eth.getAccounts()
      ingridAddress = accounts[0]
      partyA = accounts[1]
      partyB = accounts[2]
      // init client instance
      client = new Connext({
        web3,
        ingridAddress,
        watcherUrl,
        ingridUrl,
        contractAddress,
        hubAuth
      })
    }
  )

  beforeEach(
    'Should register partyA and partyB with the hub, and create/update a VC between them',
    async () => {
      // register partyA
      // register partyB
      // request ingrid deposit into subchanBI
      // create VC between partyA and partyB
      // update VC
    }
  )

  describe('hub does not countersign closing vc update', () => {
    it('should closeChannel without returning fastSig', async () => {
      // mock response from hub for client.fastCloseVCHandler
      // to not return fast close
      try {
        await client.closeChannel(vcId)
      } catch (e) {
        assert.equal(e.statusCode, 651)
      }
    })

    it('should call initVCContractHandler', async () => {})

    it('should call settleVCContractHandler', async () => {})

    it('should wait out challenge period and call closeVirtualChannelContractHandler', async () => {})

    it('should be able to settle multiple VCs on chain', async () => {})

    it('should not interrupt other VCs', async () => {})

    it('should not prohibit VCs from opening', async () => {})
  })

  describe('hub did not countersign closing lc update', () => {
    it('should call withdraw without i-countersiging closing update', async () => {
      // mock response from hub for client.fastCloseLCHandler
      // to not return lcFinal.sigI
      const response = await client.withdraw(partyA)
      assert.equal(response.fastClosed, false)
    })
    it('should have called updateLCState on chain and sent lc into challenge state', async () => {})

    it('should wait out challenge period and call withdrawFinal', async () => {})
  })

  describe('partyA takes VC to chain with earlier nonce', () => {
    describe('hub handles the dispute', async () => {
      it('partyA should call initVC onchain', async () => {})

      it('partyA should call settleVC onchain with nonce = 1', async () => {})

      it('hub should call settleVC with latest nonce', async () => {})

      it('should wait out challenge period and call closeVirtualChannel on chain', async () => {})
    })

    describe('watcher handles the dispute after hub fails to respond to dispute in time', async () => {
      it('partyA should call initVC onchain', async () => {})

      it('partyA should call settleVC onchain with nonce = 1', async () => {})

      it('hub should call settleVC with latest nonce', async () => {})

      it('should wait out challenge period and call closeVirtualChannel on chain', async () => {})
    })
  })

  describe('partyA takes LC to chain with earlier nonce', () => {
    describe('hub handles the dispute', () => {
      it('partyA calls updateLCState on chain with nonce = 1', async () => {})

      it('hub should call updateLCState with latest state', async () => {})

      it('should wait out challenge period and call byzantineCloseChannel on chain', async () => {})
    })

    describe('watcher handles the dispute after hub fails to respond', () => {
      it('partyA calls updateLCState on chain with nonce = 1', async () => {})

      it('hub should call updateLCState with latest state', async () => {})

      it('should wait out challenge period and call byzantineCloseChannel on chain', async () => {})
    })
  })
})
