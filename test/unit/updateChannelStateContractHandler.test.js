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
const web3 = new Web3('http://localhost:8545')
let client
let hubAddress
let hubUrl = 'http://localhost:8080'
let contractAddress = '0xdec16622bfe1f0cdaf6f7f20437d2a040cccb0a1'
let watcherUrl = ''

// for accounts
let accounts
let partyA
let partyB
let partyC
let partyD

describe.skip('updateChannelStateContractHandler()', () => {
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
        'OPEN_LC_OPEN_VC',
        'UPDATED'
      )
    })

    it('should call updateChannelStateContractHandler on an ETH/TOKEN channel', async () => {
      const channelId =
        '0x1000000000000000000000000000000000000000000000000000000000000000'
      const balanceA = {
        tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')),
        ethDeposit: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether'))
      }
      const balanceI = {
        tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
        ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
      }
      const nonce = 2
      const numOpenThread = 0
      const threadRootHash = Connext.generateThreadRootHash({ threadInitialStates: [] })
      const hash = Connext.createChannelStateUpdateFingerprint({
        channelId,
        isClose: false,
        nonce,
        numOpenThread,
        threadRootHash,
        partyA,
        partyI: hubAddress,
        weiBalanceA: balanceA.ethDeposit,
        weiBalanceI: balanceI.ethDeposit,
        tokenBalanceA: balanceA.tokenDeposit,
        tokenBalanceI: balanceI.tokenDeposit
      })
      const sigA = await client.web3.eth.sign(hash, partyA)
      const sigI = await client.web3.eth.sign(hash, hubAddress)
      const results = await client.updateChannelStateContractHandler({
        channelId,
        nonce,
        numOpenThread,
        balanceA,
        balanceI,
        threadRootHash,
        sigA,
        sigI
      })
      expect(results.transactionHash).to.equal('transactionHash')
    })

    it('should call updateChannelStateContractHandler on an ETH channel', async () => {
      const channelId =
        '0x3000000000000000000000000000000000000000000000000000000000000000'
      const balanceA = {
        tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
        ethDeposit: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether'))
      }
      const balanceI = {
        tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
        ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
      }
      const nonce = 2
      const numOpenThread = 0
      const threadRootHash = Connext.generateThreadRootHash({ threadInitialStates: [] })
      const hash = Connext.createChannelStateUpdateFingerprint({
        channelId,
        isClose: false,
        nonce,
        numOpenThread,
        threadRootHash,
        partyA,
        partyI: hubAddress,
        weiBalanceA: balanceA.ethDeposit,
        weiBalanceI: balanceI.ethDeposit,
        tokenBalanceA: balanceA.tokenDeposit,
        tokenBalanceI: balanceI.tokenDeposit
      })
      const sigA = await client.web3.eth.sign(hash, partyA)
      const sigI = await client.web3.eth.sign(hash, hubAddress)
      const results = await client.updateChannelStateContractHandler({
        channelId,
        nonce,
        numOpenThread,
        balanceA,
        balanceI,
        threadRootHash,
        sigA,
        sigI
      })
      expect(results.transactionHash).to.equal('transactionHash')
    })

    it('should call updateChannelStateContractHandler on an TOKEN channel', async () => {
      const channelId =
        '0x4000000000000000000000000000000000000000000000000000000000000000'
      const balanceA = {
        tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')),
        ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0', 'ether'))
      }
      const balanceI = {
        tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
        ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0', 'ether'))
      }
      const nonce = 2
      const numOpenThread = 0
      const threadRootHash = Connext.generateThreadRootHash({ threadInitialStates: [] })
      const hash = Connext.createChannelStateUpdateFingerprint({
        channelId,
        isClose: false,
        nonce,
        numOpenThread,
        threadRootHash,
        partyA,
        partyI: hubAddress,
        weiBalanceA: balanceA.ethDeposit,
        weiBalanceI: balanceI.ethDeposit,
        tokenBalanceA: balanceA.tokenDeposit,
        tokenBalanceI: balanceI.tokenDeposit
      })
      const sigA = await client.web3.eth.sign(hash, partyA)
      const sigI = await client.web3.eth.sign(hash, hubAddress)
      const results = await client.updateChannelStateContractHandler({
        channelId,
        nonce,
        numOpenThread,
        balanceA,
        balanceI,
        threadRootHash,
        sigA,
        sigI
      })
      expect(results.transactionHash).to.equal('transactionHash')
    })

    afterEach('restore hub and contract', () => {
      nock.restore()
      nock.cleanAll()
    })

    describe('parameter validation', () => {
      it('should fail if no channelId is provided', async () => {
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether'))
        }
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const numOpenThread = 0
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigA = '0x1000'
        const sigI = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            nonce,
            numOpenThread,
            balanceA,
            balanceI,
            threadRootHash,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if null channelId is provided', async () => {
        const channelId = null
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether'))
        }
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const numOpenThread = 0
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigA = '0x1000'
        const sigI = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceA,
            balanceI,
            threadRootHash,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if invalid channelId is provided', async () => {
        const channelId = 'fail'
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether'))
        }
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const numOpenThread = 0
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigA = '0x1000'
        const sigI = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceA,
            balanceI,
            threadRootHash,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if no balanceA is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const numOpenThread = 0
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigA = '0x1000'
        const sigI = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceI,
            threadRootHash,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if null balanceA is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceA = null
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const numOpenThread = 0
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigA = '0x1000'
        const sigI = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceA,
            balanceI,
            threadRootHash,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if invalid balanceA is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceA = {}
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const numOpenThread = 0
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigA = '0x1000'
        const sigI = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceA,
            balanceI,
            threadRootHash,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if no balanceI is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const numOpenThread = 0
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigA = '0x1000'
        const sigI = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceA,
            threadRootHash,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if null balanceI is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceI = null
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const numOpenThread = 0
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigA = '0x1000'
        const sigI = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceA,
            balanceI,
            threadRootHash,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if invalid balanceI is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceI = {}
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const numOpenThread = 0
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigA = '0x1000'
        const sigI = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceA,
            balanceI,
            threadRootHash,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if no nonce is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether'))
        }
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const numOpenThread = 0
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigA = '0x1000'
        const sigI = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            numOpenThread,
            balanceA,
            balanceI,
            threadRootHash,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if null nonce is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether'))
        }
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = null
        const numOpenThread = 0
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigA = '0x1000'
        const sigI = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceA,
            balanceI,
            threadRootHash,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if invalid nonce is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether'))
        }
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 'fail'
        const numOpenThread = 0
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigA = '0x1000'
        const sigI = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceA,
            balanceI,
            threadRootHash,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if no numOpenThread is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether'))
        }
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigA = '0x1000'
        const sigI = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            balanceA,
            balanceI,
            threadRootHash,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if null numOpenThread is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether'))
        }
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const numOpenThread = null
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigA = '0x1000'
        const sigI = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceA,
            balanceI,
            threadRootHash,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if invalid numOpenThread is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether'))
        }
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const numOpenThread = 'fail'
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigA = '0x1000'
        const sigI = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceA,
            balanceI,
            threadRootHash,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if no threadRootHash is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether'))
        }
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const numOpenThread = 0
        const sigA = '0x1000'
        const sigI = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceA,
            balanceI,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if null threadRootHash is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether'))
        }
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const numOpenThread = 0
        const threadRootHash = null
        const sigA = '0x1000'
        const sigI = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceA,
            balanceI,
            threadRootHash,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if invalid threadRootHash is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether'))
        }
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const numOpenThread = 0
        const threadRootHash = 'fail'
        const sigA = '0x1000'
        const sigI = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceA,
            balanceI,
            threadRootHash,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if no sigA is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether'))
        }
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const numOpenThread = 0
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigI = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceA,
            balanceI,
            threadRootHash,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if null sigA is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether'))
        }
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const numOpenThread = 0
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigA = null
        const sigI = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceA,
            balanceI,
            threadRootHash,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if invalid sigA is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether'))
        }
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const numOpenThread = 0
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigA = 'fail'
        const sigI = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceA,
            balanceI,
            threadRootHash,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if no sigI is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether'))
        }
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const numOpenThread = 0
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigA = '0x1000'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceA,
            balanceI,
            threadRootHash,
            sigA
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if null sigI is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether'))
        }
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const numOpenThread = 0
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigA = '0x1000'
        const sigI = null
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceA,
            balanceI,
            threadRootHash,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if invalid sigI is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether'))
        }
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const numOpenThread = 0
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigA = '0x1000'
        const sigI = 'fail'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceA,
            balanceI,
            threadRootHash,
            sigA,
            sigI
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })

      it('should fail if invalid sender is provided', async () => {
        const channelId =
          '0x4000000000000000000000000000000000000000000000000000000000000000'
        const balanceA = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.9', 'ether'))
        }
        const balanceI = {
          tokenDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
          ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        }
        const nonce = 2
        const numOpenThread = 0
        const threadRootHash = Connext.generateThreadRootHash({
          threadInitialStates: []
        })
        const sigA = '0x1000'
        const sigI = '0x1000'
        const sender = 'fail'
        try {
          await client.updateChannelStateContractHandler({
            channelId,
            nonce,
            numOpenThread,
            balanceA,
            balanceI,
            threadRootHash,
            sigA,
            sigI,
            sender
          })
        } catch (e) {
          expect(e.statusCode).to.equal(200)
        }
      })
    })
  })
})
