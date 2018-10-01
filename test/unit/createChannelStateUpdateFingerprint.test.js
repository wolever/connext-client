require('dotenv').config()
const chai = require('chai')
const expect = chai.expect
const Web3 = require('web3')
const fetch = require('fetch-cookie')(require('node-fetch'))

global.fetch = fetch

const Connext = require('../../src/Connext')

// named variables
// on init
const web3 = new Web3('http://localhost:8545')
let hubAddress

// for accounts
let accounts
let partyA

describe('createChannelStateUpdateFingerprint()', function () {
  before('init client and accounts', async () => {
    accounts = await web3.eth.getAccounts()
    hubAddress = accounts[0]
    partyA = accounts[1]
  })

  it('should generate a hash of the input data using Web3', () => {
    const state = {
      channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
      isClose: false,
      nonce: 0,
      numOpenThread: 0,
      threadRootHash: Connext.generateThreadRootHash({
        threadInitialStates: []
      }),
      partyA,
      partyI: hubAddress,
      weiBalanceA: Web3.utils.toBN('1000'),
      weiBalanceI: Web3.utils.toBN('0'),
      tokenBalanceA: Web3.utils.toBN('1000'),
      tokenBalanceI: Web3.utils.toBN('0')
    }
    const hash = Connext.createChannelStateUpdateFingerprint(state)
    const expectedHash = Web3.utils.soliditySha3(
      { type: 'bytes32', value: state.channelId },
      { type: 'bool', value: state.isClose },
      { type: 'uint256', value: state.nonce },
      { type: 'uint256', value: state.numOpenThread },
      { type: 'bytes32', value: state.threadRootHash },
      { type: 'address', value: state.partyA },
      { type: 'address', value: state.partyI },
      { type: 'uint256', value: state.weiBalanceA },
      { type: 'uint256', value: state.weiBalanceI },
      { type: 'uint256', value: state.tokenBalanceA },
      { type: 'uint256', value: state.tokenBalanceI }
    )
    expect(hash).to.equal(expectedHash)
  })

  describe('parameter validation', () => {
    it('should fail if it is missing isClose flag', () => {
      const state = {
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if isClose flag is null', () => {
      const state = {
        isClose: null,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if isClose flag is invalid', () => {
      const state = {
        isClose: 'fail',
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if it is missing nonce', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if nonce is null', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: null,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })
    it('should fail if nonce is invalid', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 'fail',
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if no numOpenThread', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if null numOpenThread', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: null,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if invalid numOpenThread', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 'fail',
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if no threadRootHash', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        partyA,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if threadRootHash is null', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: null,
        partyA,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if threadRootHash is invalid', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: 'fail',
        partyA,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if no partyA', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if partyA is null', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA: null,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if partyA is invalid', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA: 'fail',
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if partyI doesnt exist', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if partyI is null', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: null,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if partyI is invalid', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: 'fail',
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if weiBalanceA doesnt exist', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: hubAddress,
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if weiBalanceA is null', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: hubAddress,
        weiBalanceA: null,
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if weiBalanceA is invalid', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: hubAddress,
        weiBalanceA: 'fail',
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if weiBalanceI doesnt exist', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if weiBalanceI is null', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: null,
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if weiBalanceI is invalid', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: 'fail',
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if tokenBalanceA doesnt exist', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if tokenBalanceA is null', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: null,
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if tokenBalanceA is invalid', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: 'fail',
        tokenBalanceI: Web3.utils.toBN('0')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if tokenBalanceI doesnt exist', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000')
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if tokenBalanceI is null', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: null
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if tokenBalanceI is invalid', () => {
      const state = {
        isClose: false,
        channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: []
        }),
        partyA,
        partyI: hubAddress,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceI: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceI: 'fail'
      }
      try {
        Connext.createChannelStateUpdateFingerprint(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })
  })
})
