const assert = require('assert')
const Connext = require('../src/Connext')
const moxios = require('moxios')
const { createFakeWeb3 } = require('./Helpers')
const sinon = require('sinon')
const MerkleTree = require('../helpers/MerkleTree')
const Utils = require('../helpers/utils')
const Web3 = require('web3')
const artifacts = require('../artifacts/Ledger.json')
const { getChannelManager, getLedgerChannel, initWeb3 } = require('../web3')

let web3 = { currentProvider: 'mock' }
let partyA
let partyB
let ingridAddress
let contractAddress
let watcherUrl
let ingridUrl

describe('Connext', async () => {
  beforeEach(async () => {
    moxios.install()
  })
  afterEach(async () => {
    moxios.uninstall()
  })

  it('should create a connext client with a mock version of web3', async () => {
    const client = new Connext({ web3 }, createFakeWeb3())
    assert.ok(typeof client === 'object')
  })

  describe('ingridClientRequests', () => {
    let validLedgerState = {
      sigB: 'sigB',
      sigA: 'sigA',
      nonce: 0,
      openVCs: 'openVCs',
      vcRootHash: 'hash',
      partyA: 'partyA',
      partyI: 'partyI',
      balanceA: 100,
      balanceI: 32
    }
    beforeEach(() => {
      // import and pass your custom axios instance to this method
      moxios.install()
    })

    afterEach(() => {
      // import and pass your custom axios instance to this method
      moxios.uninstall()
    })
    it('getLatestLedgerStateUpdate', async () => {
      const client = new Connext({ web3 }, createFakeWeb3())
      client.ingridUrl = 'ingridUrl'
      const ledgerChannelId = 'address'
      const url = `${client.ingridUrl}/ledgerchannel/${ledgerChannelId}/lateststate`
      moxios.stubRequest(url, {
        status: 200,
        responseText: validLedgerState
      })
      const res = await client.getLatestLedgerStateUpdate('address')
      assert.ok(typeof res === 'object')
    })
    it('getLedgerChannelChallengeTimer', async () => {
      const client = new Connext({ web3 }, createFakeWeb3())
      client.ingridUrl = 'ingridUrl'
      const ledgerChannelId = 'address'
      const url = `${client.ingridUrl}/ledgerchannel/timer`
      moxios.stubRequest(url, {
        status: 200,
        responseText: 31239
      })
      const res = await client.getLedgerChannelChallengeTimer('address')
      assert.ok(typeof res === 'object')
    })
  })
})
