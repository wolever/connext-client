require('dotenv').config()
const chai = require('chai')
const expect = chai.expect
const Web3 = require('web3')
const fetch = require('fetch-cookie')(require('node-fetch'))
const interval = require('interval-promise')
const {
  CHANNEL_STATES,
  THREAD_STATES,
  META_TYPES,
  Connext
} = require('../src/Connext')

global.fetch = fetch

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
    const initialDeposit = {
      ethDeposit: Web3.utils.toBN(Web3.utils.toWei('6', 'ether'))
    }

    it('should open a channel between partyA and the hub', async () => {
      subchanAI = await client.openChannel(initialDeposit, null, partyA)
      // ensure lc is in the database
      await interval(async (iterationNumber, stop) => {
        chanA = await client.getChannelById(subchanAI)
        if (chanA != null) {
          stop()
        }
      }, 2000)
      expect(chanA.channelId).to.be.equal(subchanAI)
      expect(chanA.state).to.be.equal(CHANNEL_STATES.CHANNEL_OPENING)
    }).timeout(45000)

    it('should wait for the hub to autojoin the channel', async () => {
      // ensure channel is in the database
      await interval(async (iterationNumber, stop) => {
        chanA = await client.getChannelById(subchanAI)
        if (chanA.state != CHANNEL_STATES.CHANNEL_OPENING) {
          stop()
        }
      }, 2000)
      expect(chanA.state).to.be.equal(CHANNEL_STATES.CHANNEL_OPENED)
    }).timeout(45000)

    it('partyA should have initialDeposit in channel', async () => {
      const initialDeposit = {
        ethDeposit: Web3.utils.toBN(Web3.utils.toWei('6', 'ether'))
      }
      const ethBalanceA = Web3.utils.toBN(chanA.ethBalanceA)
      expect(ethBalanceA.eq(initialDeposit.ethDeposit)).to.equal(true)
    })

    it('hub should have 0 balance in channel', async () => {
      const ethBalanceI = Web3.utils.toBN(chanA.ethBalanceI)
      expect(ethBalanceI.eq(Web3.utils.toBN('0'))).to.equal(true)
    })

    it('should open a channel between partyB and the hub', async () => {
      const initialDeposit = {
        ethDeposit: Web3.utils.toBN(Web3.utils.toWei('0', 'ether'))
      }
      subchanBI = await client.openChannel(initialDeposit, null, partyB)
      // ensure lc is in the database
      await interval(async (iterationNumber, stop) => {
        chanB = await client.getChannelById(subchanBI)
        if (chanB != null) {
          stop()
        }
      }, 2000)
      expect(chanB.channelId).to.be.equal(subchanBI)
      expect(chanB.state).to.be.equal(CHANNEL_STATES.CHANNEL_OPENING)
    })

    it('should wait for the hub to autojoin the channel', async () => {
      // ensure channel is in the database
      await interval(async (iterationNumber, stop) => {
        chanB = await client.getChannelById(subchanAI)
        if (chanB.state != CHANNEL_STATES.CHANNEL_OPENING) {
          stop()
        }
      }, 2000)
      expect(chanB.state).to.be.equal(CHANNEL_STATES.CHANNEL_OPENED)
    })

    it('partyB should have 0 in channel', async () => {
      const ethBalanceA = Web3.utils.toBN(chanB.ethBalanceA)
      expect(ethBalanceA.eq(Web3.utils.toBN('0'))).to.equal(true)
    })

    it('hub should have 0 balance in channel', async () => {
      const ethBalanceI = Web3.utils.toBN(chanB.ethBalanceI)
      expect(ethBalanceI.eq(Web3.utils.toBN('0'))).to.equal(true)
    })
  })

  describe('updateChannel', () => {
    // DON'T HAVE THESE CLIENT METHODS YET
    it('should send an ETH balance update from client to hub', async () => {})
  })

  describe('request hub deposit', () => {
    it('should request that hub capitalize channel B', async () => {
      chanA = await client.getChannelByPartyA(partyA)

      const ethDeposit = Web3.utils.toBN(chanA.ethBalanceA)
      // multiple to avoid autoDeposit on vc creation
      const response = await client.requestHubDeposit({
        channelId: subchanBI,
        deposit: {
          ethDeposit
        }
      })
      await interval(async (iterationNumber, stop) => {
        chanB = await client.getChannelById(subchanBI)
        if (
          chanB != null && // exists
          chanB.state === CHANNEL_STATES.CHANNEL_OPENED && // joined
          !Web3.utils.toBN(chanB.ethBalanceI).isZero()
        ) {
          stop()
        }
      }, 2000)
      expect(ethDeposit.eq(Web3.utils.toBN(chanB.ethBalanceI))).to.equal(true)
    })
  })

  describe('openThread', () => {
    it('should open a thread between partyA and partyB', async () => {
      const initialDeposit = {
        ethDeposit: Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
      }
      chanB = await client.getChannelById(subchanBI)
      chanA = await client.getChannelById(subchanAI)
      threadIdA = await client.openThread({
        to: partyB,
        sender: partyA,
        deposit: initialDeposit
      })
      threadA = await client.getThreadById(threadIdA)
      expect(threadA.channelId).to.equal(threadIdA)
      expect(threadA.state).to.equal(THREAD_STATES.THREAD_OPENED)
      expect(
        Web3.utils.toBN(threadA.ethBalanceA).eq(initialDeposit.ethDeposit)
      ).to.equal(true)
      expect(
        Web3.utils.toBN(threadA.ethBalanceB).eq(Web3.utils.toBN('0'))
      ).to.equal(true)
    })

    it('should decrease partyA channel balance by thread balanceA', async () => {
      const prevBal = Web3.utils.toBN(chanA.ethBalanceA)
      const expectedBal = prevBal.sub(Web3.utils.toBN(threadA.ethBalanceA))
      chanA = await client.getChannelById(subchanAI)
      expect(expectedBal.eq(Web3.utils.toBN(chanA.ethBalanceA))).to.equal(true)
    })

    it('should decrease partyI channelB balance by thread balanceA', async () => {
      const prevBal = Web3.utils.toBN(chanB.ethBalanceI)
      const expectedBal = prevBal.sub(Web3.utils.toBN(threadA.ethBalanceA))
      chanB = await client.getChannelById(subchanBI)
      expect(expectedBal.eq(Web3.utils.toBN(chanB.ethBalanceI))).to.equal(true)
    })
  })

  describe('updateThread', () => {
    // DON'T HAVE THESE CLIENT METHODS YET
    it('should send a state update from partyA to partyB', async () => {})

    it('should be able to send multiple simultaneous updates from partyA to partyB', async () => {})
  })

  describe('closeThread', () => {
    it('should close the thread between A and B', async () => {
      threadA = await client.getThreadByParties({ partyA, partyB })
      const response = await client.closeThread(threadA.channelId, partyA)
      // get threadA
      threadA = await client.getThreadById(threadA.channelId)
      expect(threadA.state).to.equal(THREAD_STATES.THREAD_SETTLED)
    })

    it('should increase partyA channel balance by remainder of thread balanceA', async () => {
      // get objs
      chanA = await client.getChannelByPartyA(partyA)
      // calculate expected balance
      let prevState = await client.getChannelStateByNonce({
        channelId: chanA.channelId,
        nonce: chanA.nonce - 1
      })
      const expectedBalA = Web3.utils
        .toBN(prevState.ethBalanceA)
        .add(Web3.utils.toBN(threadA.ethBalanceA))
      expect(expectedBalA.eq(Web3.utils.toBN(chanA.ethBalanceA))).to.equal(true)
    })

    it('should increase partyB channel by remainder of thread balanceB', async () => {
      // get objs
      chanB = await client.getChannelByPartyA(partyB)
      // calculate expected balance
      let prevState = await client.getChannelStateByNonce({
        channelId: subchanBI,
        nonce: chanB.nonce - 1
      })
      const expectedBalA = Web3.utils
        .toBN(prevState.ethBalanceA)
        .add(Web3.utils.toBN(threadA.ethBalanceB))
      expect(expectedBalA.eq(Web3.utils.toBN(chanB.ethBalanceA))).to.equal(true)
    })

    it('should increase hub channelA balance by remainder of thread balanceB', async () => {
      // calculate expected balance
      let prevState = await client.getChannelStateByNonce({
        channelId: chanA.channelId,
        nonce: chanA.nonce - 1
      })
      const expectedBalI = Web3.utils
        .toBN(prevState.ethBalanceI)
        .add(Web3.utils.toBN(threadA.ethBalanceB))
      expect(expectedBalI.eq(Web3.utils.toBN(chanA.ethBalanceI))).to.equal(true)
    })

    it('should increase hub channelB balance by remainder of thread balanceA', async () => {
      let prevState = await client.getChannelStateByNonce({
        channelId: subchanBI,
        nonce: chanB.nonce - 1
      })
      const expectedBalI = Web3.utils
        .toBN(prevState.ethBalanceI)
        .add(Web3.utils.toBN(threadA.ethBalanceA))
      expect(expectedBalI.eq(Web3.utils.toBN(chanB.ethBalanceI))).to.equal(true)
    })
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
