require('dotenv').config()
const chai = require('chai')
const expect = chai.expect
const Web3 = require('web3')
const fetch = require('fetch-cookie')(require('node-fetch'))

global.fetch = fetch

const Connext = require('../../src/Connext')

// named variables
// on init
const web3 = new Web3(process.env.ETH_NODE_URL)

// for accounts
let accounts
let partyA
let partyB

describe('recoverSignerFromThreadStateUpdate()', function () {
  before('init client and accounts', async () => {
    accounts = await web3.eth.getAccounts()
    partyA = accounts[1]
    partyB = accounts[2]
  })

  it('should generate a hash of the input data using Web3', async () => {
    let state = {
      channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
      nonce: 0,
      partyA,
      partyB,
      weiBalanceA: Web3.utils.toBN('1000'),
      weiBalanceB: Web3.utils.toBN('0'),
      tokenBalanceA: Web3.utils.toBN('1000'),
      tokenBalanceB: Web3.utils.toBN('0')
    }
    const hash = Connext.createThreadStateUpdateFingerprint(state)
    const sig = await web3.eth.sign(hash, partyA)
    state.sig = sig
    const signer = Connext.recoverSignerFromThreadStateUpdate(state)
    expect(signer.toLowerCase()).to.equal(partyA.toLowerCase())
  })

  describe('parameter validation', () => {
    it('should fail if it is missing sig', () => {
      const state = {
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyA,
        partyB,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })
    it('should fail if sig is null', () => {
      const state = {
        sig: null,
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyA,
        partyB,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })
    it('should fail if sig is invalid', () => {
      const state = {
        sig: 'fail',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyA,
        partyB,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if it is missing channelId', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyA,
        partyB,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if channelId is null', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: null,
        nonce: 0,
        partyA,
        partyB,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if channelId is invalid', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: 'fail',
        nonce: 0,
        partyA,
        partyB,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if it is missing nonce', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        partyA,
        partyB,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if nonce is null', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: null,
        partyA,
        partyB,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })
    it('should fail if nonce is invalid', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 'fail',
        partyA,
        partyB,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if no partyA', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyB,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if partyA is null', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyA: null,
        partyB,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if partyA is invalid', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyA: 'fail',
        partyB,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if partyB doesnt exist', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyA,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if partyB is null', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyA,
        partyB: null,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if partyB is invalid', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyA,
        partyB: 'fail',
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if weiBalanceA doesnt exist', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyA,
        partyB,
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if weiBalanceA is null', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyA,
        partyB,
        weiBalanceA: null,
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if weiBalanceA is invalid', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyA,
        partyB,
        weiBalanceA: 'fail',
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if weiBalanceB doesnt exist', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyA,
        partyB,
        weiBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if weiBalanceB is null', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyA,
        partyB,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: null,
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if weiBalanceB is invalid', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyA,
        partyB,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: 'fail',
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if tokenBalanceA doesnt exist', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyA,
        partyB,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if tokenBalanceA is null', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyA,
        partyB,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: null,
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if tokenBalanceA is invalid', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyA,
        partyB,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: 'fail',
        tokenBalanceB: Web3.utils.toBN('0')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if tokenBalanceB doesnt exist', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyA,
        partyB,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000')
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if tokenBalanceB is null', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyA,
        partyB,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: null
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })

    it('should fail if tokenBalanceB is invalid', () => {
      const state = {
        sig: '0x0100000000000000000000000000000000000000000000000000000000000000',
        channelId: '0x0100000000000000000000000000000000000000000000000000000000000000',
        nonce: 0,
        partyA,
        partyB,
        weiBalanceA: Web3.utils.toBN('1000'),
        weiBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA: Web3.utils.toBN('1000'),
        tokenBalanceB: 'fail'
      }
      try {
        Connext.recoverSignerFromThreadStateUpdate(state)
      } catch (e) {
        expect(e.statusCode).to.equal(200)
      }
    })
  })
})
