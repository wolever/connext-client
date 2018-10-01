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

describe('createChannelUpdateOnThreadClose()', () => {
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
      // activate nock
      if (!nock.isActive()) nock.activate()
      // stub hub methods
      stubHub = await createStubbedHub(
        `${client.hubUrl}`,
        'OPEN_CHANNEL_OPEN_THREAD',
        'UPDATED'
      )
    })

    it('should create a channel update reflecting the close of an ETH/TOKEN thread', async () => {
      const threadId =
        '0x0100000000000000000000000000000000000000000000000000000000000000'
      const latestThreadState = await client.getLatestThreadState(threadId)
      latestThreadState.channelId = threadId
      latestThreadState.partyA = partyA.toLowerCase()
      latestThreadState.partyB = partyB.toLowerCase()
      const subchan = await client.getChannelByPartyA(partyA)
      const signer = partyA

      const sigAtoI = await client.createChannelUpdateOnThreadClose({
        latestThreadState,
        subchan,
        signer
      })
      const sigParams = {
        sig: sigAtoI,
        isClose: false,
        channelId: subchan.channelId,
        nonce: 2,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA: partyA.toLowerCase(),
        partyI: hubAddress.toLowerCase(),
        weiBalanceA: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')),
        weiBalanceI: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
        tokenBalanceA: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')),
        tokenBalanceI: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
        signer
      }
      const trueSigner = Connext.recoverSignerFromChannelStateUpdate(sigParams)
      expect(trueSigner.toLowerCase()).to.equal(partyA.toLowerCase())
    })

    it('should create a channel update reflecting the close of an ETH thread', async () => {
      const threadId =
        '0x0200000000000000000000000000000000000000000000000000000000000000'
      const latestThreadState = await client.getLatestThreadState(threadId)
      latestThreadState.channelId = threadId
      latestThreadState.partyA = partyC.toLowerCase()
      latestThreadState.partyB = partyB.toLowerCase()
      const subchan = await client.getChannelByPartyA(partyC)
      const signer = partyC

      const sigAtoI = await client.createChannelUpdateOnThreadClose({
        latestThreadState,
        subchan,
        signer
      })
      const sigParams = {
        sig: sigAtoI,
        isClose: false,
        channelId: subchan.channelId,
        nonce: 2,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA: partyC.toLowerCase(),
        partyI: hubAddress.toLowerCase(),
        weiBalanceA: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')),
        weiBalanceI: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
        tokenBalanceA: Web3.utils.toBN('0'),
        tokenBalanceI: Web3.utils.toBN('0'),
        signer
      }
      const trueSigner = Connext.recoverSignerFromChannelStateUpdate(sigParams)
      expect(trueSigner.toLowerCase()).to.equal(partyC.toLowerCase())
    })

    it('should create a channel update reflecting the close of a TOKEN thread', async () => {
      const threadId =
        '0x0300000000000000000000000000000000000000000000000000000000000000'
      const latestThreadState = await client.getLatestThreadState(threadId)
      latestThreadState.channelId = threadId
      latestThreadState.partyA = partyD.toLowerCase()
      latestThreadState.partyB = partyB.toLowerCase()
      const subchan = await client.getChannelByPartyA(partyD)
      const signer = partyD

      const sigAtoI = await client.createChannelUpdateOnThreadClose({
        latestThreadState,
        subchan,
        signer
      })
      const sigParams = {
        sig: sigAtoI,
        isClose: false,
        channelId: subchan.channelId,
        nonce: 2,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA: partyD.toLowerCase(),
        partyI: hubAddress.toLowerCase(),
        weiBalanceA: Web3.utils.toBN('0'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')),
        tokenBalanceI: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
        signer
      }
      const trueSigner = Connext.recoverSignerFromChannelStateUpdate(sigParams)
      expect(trueSigner.toLowerCase()).to.equal(partyD.toLowerCase())
    })

    afterEach('restore hub', () => {
      nock.restore()
      nock.cleanAll()
    })
  })
})
