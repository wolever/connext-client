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
let partyA
let partyB

// for initial ledger channel states
let subchanAI
let subchanBI
let lcA
let lcB
let balanceA
let balanceI
let balanceB
let initialDeposit = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
let vcId
let vc

describe('Connext happy case testing flow', () => {
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

  describe('Registering with the hub', () => {
    describe('registering partyA with hub', () => {
      it('should create a ledger channel with the hub and partyA', async () => {
        subchanAI = await client.register(initialDeposit, partyA)
        // ensure lc is in the database
        await timeout(40000)
        // get the ledger channel
        lcA = await client.getLcById(subchanAI)
        assert.equal(lcA.channelId, subchanAI)
      }).timeout(45000)

      it('ingrid should have autojoined channel', async () => {
        lcA = await client.getLcById(subchanAI)
        assert.equal(lcA.state, 1)
      })

      it('ingrid should have 0 balance', async () => {
        lcA = await client.getLcById(subchanAI)
        balanceB = Web3.utils.toBN(lcA.balanceI)
        assert.ok(balanceB.eq(Web3.utils.toBN('0')))
      })

      it('should throw an error if you have open and active LC', async () => {
        try {
          let subchan = await client.register(initialDeposit, partyA)
        } catch (e) {
          assert.equal(e.statusCode, 400)
        }
      })
    })

    describe('registering partyB with hub', () => {
      it('should create a ledger channel with the hub and partyB', async () => {
        subchanBI = await client.register(initialDeposit, partyB)
        // ensure lc is in the database
        await timeout(40000)
        // get the ledger channel
        lcB = await client.getLcById(subchanBI)
        assert.equal(lcB.channelId, subchanBI)
      }).timeout(45000)

      it('ingrid should have autojoined channel', async () => {
        lcB = await client.getLcById(subchanBI)
        assert.equal(lcB.state, 1)
      })

      it('ingrid should have 0 balance', async () => {
        lcB = await client.getLcById(subchanBI)
        balanceB = Web3.utils.toBN(lcB.balanceI)
        assert.ok(balanceB.eq(Web3.utils.toBN('0')))
      })

      it('should throw an error if you have open and active LC', async () => {
        try {
          let subchan = await client.register(initialDeposit, partyA)
        } catch (e) {
          assert.equal(e.statusCode, 400)
        }
      })
    })
  })

  describe('Request that hub deposit', () => {
    it('should increase the balanceI of lcB by 5 ETH', async () => {
      lcA = await client.getLcById(subchanAI)
      await client.requestIngridDeposit({
        lcId: subchanBI,
        deposit: Web3.utils.toBN(lcA.balanceA)
      })
      // wait for chainsaw
      await timeout(40000)
      // check balance increased
      lcB = await client.getLcById(subchanBI)
      assert.ok(initialDeposit.eq(Web3.utils.toBN(lcB.balanceI)))
    }).timeout(45000)
  })

  describe('Creating a virtual channel', () => {
    describe('openChannel with partyB', () => {
      it('should create a new virtual channel between partyA and partyB', async () => {
        vcId = await client.openChannel({ to: partyB, sender: partyA })
        vc = await client.getChannelById(vcId)
        assert.equal(vc.channelId, vcId)
      })

      it('balanceA in lcA should be 0', async () => {
        lcA = await client.getLcById(subchanAI)
        assert.ok(Web3.utils.toBN('0').eq(Web3.utils.toBN(lcA.balanceA)))
      })

      it('hub should countersign proposed LC update', async () => {
        let state = await client.getLatestLedgerStateUpdate(subchanAI)
        // recover signer from sigI
        const signer = Connext.recoverSignerFromLCStateUpdate({
          sig: state.sigI,
          isClose: false,
          channelId: subchanAI,
          nonce: state.nonce,
          openVcs: state.openVcs,
          vcRootHash: state.vcRootHash,
          partyA: partyA,
          partyI: ingridAddress,
          balanceA: Web3.utils.toBN(state.balanceA),
          balanceI: Web3.utils.toBN(state.balanceI)
        })
        assert.equal(signer.toLowerCase(), ingridAddress.toLowerCase())
      })

      it('hub should create update for lcB', async () => {
        vc = await client.getChannelById(vcId)
        let state = await client.getLatestLedgerStateUpdate(subchanBI, ['sigI'])
        const signer = Connext.recoverSignerFromLCStateUpdate({
          sig: state.sigI,
          isClose: false,
          channelId: subchanBI,
          nonce: state.nonce,
          openVcs: state.openVcs,
          vcRootHash: state.vcRootHash,
          partyA: partyB,
          partyI: ingridAddress,
          balanceA: Web3.utils.toBN(state.balanceA),
          balanceI: Web3.utils.toBN(state.balanceI)
        })
        assert.equal(signer.toLowerCase(), ingridAddress.toLowerCase())
      })

      // error cases
    })
  })

  describe('Updating state in a virtual channel', () => {
    it('should call updateBalance', async () => {
      balanceA = Web3.utils.toBN(Web3.utils.toWei('4', 'ether'))
      balanceB = Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
      const response = await client.updateBalance({
        channelId: vcId,
        balanceA,
        balanceB
      })
      vc = await client.getChannelById(vcId)
      assert.ok(
        Web3.utils.toBN(vc.balanceA).eq(balanceA) &&
          Web3.utils.toBN(vc.balanceB).eq(balanceB)
      )
    })

    it('partyA should properly sign the proposed update', async () => {
      const state = await client.getLatestVCStateUpdate(vcId)
      const signer = Connext.recoverSignerFromVCStateUpdate({
        sig: state.sigA,
        channelId: vcId,
        nonce: state.nonce,
        partyA: partyA,
        partyB: partyB,
        balanceA: Web3.utils.toBN(state.balanceA),
        balanceB: Web3.utils.toBN(state.balanceB)
      })
      assert.equal(signer.toLowerCase(), partyA.toLowerCase())
    })

    it('partyA should be able to send multiple state updates in a row', async () => {
      vc = await client.getChannelById(vcId)
      balanceA = Web3.utils.toBN(vc.balanceA)
      balanceB = Web3.utils.toBN(vc.balanceB)
      for (let i = 0; i < 10; i++) {
        balanceA = balanceA.sub(
          Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        )
        balanceB = balanceB.add(
          Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        )
        await client.updateBalance({
          channelId: vcId,
          balanceA,
          balanceB
        })
      }
      vc = await client.getChannelById(vcId)
      assert.ok(
        balanceA.eq(Web3.utils.toBN(vc.balanceA)) &&
          balanceB.eq(Web3.utils.toBN(vc.balanceB))
      )
    })
  })

  describe('Closing a virtual channel', () => {
    it('should change vc status to settled', async () => {
      const response = await client.closeChannel(vcId)
      // get vc
      vc = await client.getChannelById(vcId)
      assert.equal(vc.state, 3)
    })

    it('should increase lcA balanceA by vc.balanceA remainder', async () => {
      // get objs
      lcA = await client.getLcById(subchanAI)
      vc = await client.getChannelById(vcId)
      // calculate expected balance
      let prevState = await client.getLcStateByNonce({
        lcId: subchanAI,
        nonce: lcA.nonce - 1
      })
      const expectedBalA = Web3.utils
        .toBN(prevState.balanceA)
        .add(Web3.utils.toBN(vc.balanceA))
      assert.ok(expectedBalA.eq(Web3.utils.toBN(lcA.balanceA)))
    })

    it('should increase lcA balanceI by vc.balanceB', async () => {
      // calculate expected balance
      let prevState = await client.getLcStateByNonce({
        lcId: subchanAI,
        nonce: lcA.nonce - 1
      })
      const expectedBalI = Web3.utils
        .toBN(prevState.balanceI)
        .add(Web3.utils.toBN(vc.balanceB))
      assert.ok(expectedBalI.eq(Web3.utils.toBN(lcA.balanceI)))
    })

    it('should increase lcB balanceA by vc.balanceB', async () => {
      // get objs
      lcB = await client.getLcById(subchanBI)
      // calculate expected balance
      let prevState = await client.getLcStateByNonce({
        lcId: subchanBI,
        nonce: lcB.nonce - 1
      })
      const expectedBalA = Web3.utils
        .toBN(prevState.balanceA)
        .add(Web3.utils.toBN(vc.balanceB))
      assert.ok(expectedBalA.eq(Web3.utils.toBN(lcB.balanceA)))
    })

    it('should decrease lcB balanceI by vc.balanceA', async () => {
      // calculate expected balance
      let prevState = await client.getLcStateByNonce({
        lcId: subchanBI,
        nonce: lcB.nonce - 1
      })
      const expectedBalI = Web3.utils
        .toBN(prevState.balanceI)
        .add(Web3.utils.toBN(vc.balanceA))
      assert.ok(expectedBalI.eq(Web3.utils.toBN(lcB.balanceI)))
    })
  })

  describe('Closing a ledger channel', () => {
    let prevBal, finalBal
    vcId = '0x5e6fb02f23244f438335eb08af37904c01fdc500db995ca3d886861c4b9fb84b'
    subchanAI =
      '0x095c42bbcb66f0fa577c2ba2de2c8bda9a22198a17fb9fe68a43aa740c3d1c50'
    subchanBI =
      '0x91948cde2b32af1b9f410785fbae454dd125690758edad4303c41122360e0429'
    it(`should close partyA's LC with the fast close flag`, async () => {
      prevBal = await client.web3.eth.getBalance(partyA)
      const response = await client.withdraw(partyA)
      assert.equal(response.fastClosed, true)
    }).timeout(5000)

    it(`should transfer balanceA of partyA's lc into wallet`, async () => {
      lcA = await client.getLcById(subchanAI)
      const expected = Web3.utils.fromWei(
        Web3.utils.toBN(lcA.balanceA).add(Web3.utils.toBN(prevBal)),
        'ether'
      )
      finalBal = Web3.utils.fromWei(
        await client.web3.eth.getBalance(partyA),
        'ether'
      )
      assert.equal(Math.round(expected), Math.round(finalBal))
    })

    it(`should close partyB's LC with the fast close flag`, async () => {
      prevBal = await client.web3.eth.getBalance(partyB) // 95 ETH
      const response = await client.withdraw(partyB) // + 7 ETH
      assert.equal(response.fastClosed, true)
    }).timeout(5000)

    it(`should transfer balanceA partyB's into wallet`, async () => {
      lcB = await client.getLcById(subchanBI)
      const expected = Web3.utils.fromWei(
        Web3.utils.toBN(lcB.balanceA).add(Web3.utils.toBN(prevBal)),
        'ether'
      )
      finalBal = Web3.utils.fromWei(
        await client.web3.eth.getBalance(partyB),
        'ether'
      )
      assert.equal(Math.round(expected), Math.round(finalBal))
    })
  })
})
