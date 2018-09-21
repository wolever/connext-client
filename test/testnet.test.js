require('dotenv').config()
const chai = require('chai')
const expect = chai.expect
const Web3 = require('web3')
const fetch = require('fetch-cookie')(require('node-fetch'))
const interval = require('interval-promise')
const Connext = require('../src/Connext')

// Channel enums
const CHANNEL_STATES = {
  CHANNEL_OPENING: 0,
  CHANNEL_OPENED: 1,
  CHANNEL_SETTLING: 2,
  CHANNEL_SETTLED: 3
}

// thread enums
const THREAD_STATES = {
  THREAD_OPENING: 0,
  THREAD_OPENED: 1,
  THREAD_SETTLING: 2,
  THREAD_SETTLED: 3
}

// Purchase metadata enum
const META_TYPES = {
  TIP: 0,
  PURCHASE: 1,
  UNCATEGORIZED: 2,
  WITHDRAWAL: 3
}

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
    // DON'T HAVE THESE CLIENT METHODS YET,
    // THIS SHOULD LOOK ALMOST IDENTICAL TO UPDATE THREAD FOR WRAPPINGs
    it('should send an ETH balance update from client to hub', async () => {
      // ideally, would take a payment object of the following form
      const balanceA = {
        ethDeposit: Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
      }
      const balanceB = {
        ethDeposit: Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
      }
      const payment = {
        channelId: threadIdA,
        balanceA,
        balanceB
      }
      const meta = {
        receiver: hubAddress, // not used, just needs to be an ETH address. can remove this validation, see line 99 in src
        type: META_TYPES.UNCATEGORIZED // no validation on fields
      }

      // partyA should be optional sender param that is default null
      const response = await client.updateChannel(payment, meta, partyA)
      chanA = await client.getChannelById(threadIdA)
      expect(
        Web3.utils.toBN(chanA.ethBalanceA).eq(balanceA.ethDeposit)
      ).to.equal(true)
      expect(
        Web3.utils.toBN(chanA.ethBalanceI).eq(balanceB.ethDeposit)
      ).to.equal(true)
      expect(chanA.nonce).to.equal(1)
    })
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
    it.only('should send a state update from partyA to partyB', async () => {

      // ideally, would take a payment object of the following form
      const balanceA = {
        ethDeposit: Web3.utils.toBN(Web3.utils.toWei('4', 'ether'))
      }
      const balanceB = {
        ethDeposit: Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
      }
      const payment = {
        channelId: threadIdA,
        balanceA,
        balanceB
      }
      const meta = {
        receiver: partyB, // not used, just needs to be an ETH address. can remove this validation, see line 99 in src
        type: META_TYPES.UNCATEGORIZED // no validation on fields
      }

      // partyA should be optional sender param that is default null
      const response = await client.updateThread(payment, meta, partyA)
      threadA = await client.getThreadById(threadIdA)
      expect(
        Web3.utils.toBN(threadA.ethBalanceA).eq(balanceA.ethDeposit)
      ).to.equal(true)
      expect(
        Web3.utils.toBN(threadA.ethBalanceB).eq(balanceB.ethDeposit)
      ).to.equal(true)
      expect(threadA.nonce).to.equal(1)
    })

    it('partyA should properly sign the proposed update', async () => {
      const state = await client.getLatestThreadState(threadIdA)
      const signer = Connext.recoverSignerFromThreadStateUpdate({
        sig: state.sigA,
        channelId: threadIdA,
        nonce: state.nonce,
        partyA: partyA,
        partyB: partyB,
        ethBalanceA: Web3.utils.toBN(state.ethBalanceA),
        ethBalanceB: Web3.utils.toBN(state.ethBalanceB),
        tokenBalanceA: Web3.utils.toBN(state.tokenBalanceA),
        tokenBalanceB: Web3.utils.toBN(state.tokenBalanceB)
      })
      expect(signer.toLowerCase()).to.equal(partyA.toLowerCase())
    })

    it('should be able to send multiple simultaneous updates from partyA to partyB', async () => {
      const meta = {
        receiver: partyB, // not used, just needs to be an ETH address. can remove this validation, see line 99 in src
        type: META_TYPES.UNCATEGORIZED // no validation on fields
      }
      threadA = await client.getThreadById(threadIdA)
      balanceA = {
        ethDeposit: Web3.utils.toBN(threadA.ethBalanceA)
      }
      balanceB = {
        ethDeposit: Web3.utils.toBN(threadA.ethBalanceB)
      }
      for (let i = 0; i < 10; i++) {
        balanceA.ethDeposit = balanceA.ethDeposit.sub(
          Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        )
        balanceB.ethDeposit = balanceB.ethDeposit.add(
          Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        )
        const payment = {
          balanceA,
          balanceB,
          channelId: threadIdA
        }
        await client.updateThread(payment, meta, partyA)
      }
      threadA = await client.getThreadById(threadIdA)
      expect(
        balanceA.ethDeposit.eq(Web3.utils.toBN(threadA.ethBalanceA))
      ).to.equal(true)
      expect(
        balanceB.ethDeposit.eq(Web3.utils.toBN(threadA.ethBalanceB))
      ).to.equal(true)
    })
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
    let prevBalA, finalBalA, prevBalI, finalBalI

    it('should close the channel between partyA and the hub', async () => {
      prevBalA = await client.web3.eth.getBalance(partyA)
      prevBalI = await client.web3.eth.getBalance(ingridAddress)
      // send tx
      const response = await client.closeChannel(partyA)
      const tx = await client.web3.eth.getTransaction(response)
      expect(tx.to.toLowerCase()).to.equal(contractAddress)
      expect(tx.from.toLowerCase()).to.equal(partyA.toLowerCase())
    }).timeout(8000)

    it('should increase partyA wallet balance by channel balanceA', async () => {
      chanA = await client.getChannelByPartyA(partyA)
      const expected = Web3.utils.fromWei(
        Web3.utils.toBN(chanA.ethBalanceA).add(Web3.utils.toBN(prevBalA)),
        'ether'
      )
      finalBalA = Web3.utils.fromWei(
        await client.web3.eth.getBalance(partyA),
        'ether'
      )
      expect(Math.round(expected)).to.equal(Math.round(finalBalA))
    })

    it('should increase hub wallet balance by channel balanceI', async () => {
      const expected = Web3.utils.fromWei(
        Web3.utils.toBN(chanA.ethBalanceI).add(Web3.utils.toBN(prevBalI)),
        'ether'
      )
      finalBalI = Web3.utils.fromWei(
        await client.web3.eth.getBalance(hubAddress),
        'ether'
      )
      expect(Math.round(expected)).to.equal(Math.round(finalBalI))
    })

    it('should close the channel between partyB and the hub', async () => {
      prevBalA = await client.web3.eth.getBalance(partyA)
      prevBalI = await client.web3.eth.getBalance(ingridAddress)
      // send tx
      const response = await client.closeChannel(partyA)
      const tx = await client.web3.eth.getTransaction(response)
      expect(tx.to.toLowerCase()).to.equal(contractAddress)
      expect(tx.from.toLowerCase()).to.equal(partyA.toLowerCase())
    })

    it('should increase partyA wallet balance by channel balanceA', async () => {
      chanB = await client.getChannelByPartyA(partyB)
      const expected = Web3.utils.fromWei(
        Web3.utils.toBN(chanB.ethBalanceA).add(Web3.utils.toBN(prevBalA)),
        'ether'
      )
      finalBalA = Web3.utils.fromWei(
        await client.web3.eth.getBalance(partyB),
        'ether'
      )
      expect(Math.round(expected)).to.equal(Math.round(finalBalA))
    })

    it('should increase hub wallet balance by channel balanceB', async () => {
      const expected = Web3.utils.fromWei(
        Web3.utils.toBN(chanB.ethBalanceI).add(Web3.utils.toBN(prevBalI)),
        'ether'
      )
      finalBalI = Web3.utils.fromWei(
        await client.web3.eth.getBalance(hubAddress),
        'ether'
      )
      expect(Math.round(expected)).to.equal(Math.round(finalBalI))
    })
  })
})
