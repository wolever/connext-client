require('dotenv').config()
const assert = require('assert')
const Connext = require('../src/Connext')
const { timeout, genAuthHash } = require('./helpers/utils')
const Web3 = require('web3')
const interval = require('interval-promise')

const fetch = require('fetch-cookie')(require('node-fetch'))

global.fetch = fetch

// named variables
// on init
let web3
let client
let ingridAddress
let watcherUrl = process.env.WATCHER_URL || ''
let ingridUrl = process.env.INGRID_URL || 'http://localhost:8080'
let contractAddress = '0x31713144d9ae2501e644a418dd9035ed840b1660'

// for accounts
let accounts
let partyA, partyB, partyC, partyD, partyE

// for initial ledger channel states
let subchanAI, subchanBI, subchanCI, subchanDI, subchanEI
let lcA, lcB, lcC, lcD, lcE
let balanceA, balanceB, balanceC, balanceD, balanceI
let initialDeposit = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
let vcIdA, vcIdC, vcIdD, vcIdE
let vcA, vcC, vcD, vcE

describe.only('Connext happy case testing flow', () => {
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
      partyC = accounts[3]
      partyD = accounts[4]
      partyE = accounts[5]
      // generate hub auth
      const origin = 'localhost'

      const challengeRes = await fetch(`${ingridUrl}/auth/challenge`, {
        method: 'POST',
        credentials: 'include'
      })
      const challengeJson = await challengeRes.json()
      const nonce = challengeJson.nonce

      const hash = genAuthHash(nonce, origin)
      const signature = await web3.eth.sign(hash, ingridAddress)

      const authRes = await fetch(`${ingridUrl}/auth/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: origin
        },
        credentials: 'include',
        body: JSON.stringify({
          signature,
          nonce,
          origin,
          address: ingridAddress.toLowerCase()
        })
      })

      const authJson = await authRes.json()

      assert.notDeepStrictEqual(authJson, {})
      // init client instance
      client = new Connext({
        web3,
        ingridAddress,
        watcherUrl,
        ingridUrl,
        contractAddress
      })
    }
  )

  describe('performer has one vcA she never joins but is updated and settled by partyA', () => {
    describe('Registering with the hub', () => {
      describe('registering partyA with hub', () => {
        it(
          'should create a ledger channel with the hub and partyA',
          async () => {
            subchanAI = await client.register(initialDeposit, partyA)
            // ensure in database
            await interval(async (iterationNumber, stop) => {
              lcA = await client.getLcById(subchanAI)
              if (lcA != null) {
                stop()
              }
            }, 2000)

            // get the ledger channel
            assert.equal(lcA.channelId, subchanAI)
          }
        ).timeout(45000)

        it('ingrid should have autojoined channel', async () => {
          // ensure autojoining channel
          await interval(async (iterationNumber, stop) => {
            lcA = await client.getLcById(subchanAI)
            if (lcA != null && lcA.state != 0) {
              assert.equal(lcA.state, 1)
              stop()
            }
          }, 2000)
        }).timeout(45000)

        it('ingrid should have 0 balance', async () => {
          lcA = await client.getLcById(subchanAI)
          balanceB = Web3.utils.toBN(lcA.balanceI)
          assert.ok(balanceB.eq(Web3.utils.toBN('0')))
        })
      })

      describe('registering partyB with hub', () => {
        it(
          'should create a ledger channel with the hub and partyB',
          async () => {
            subchanBI = await client.register(initialDeposit, partyB)
            // ensure in database
            await interval(async (iterationNumber, stop) => {
              lcB = await client.getLcById(subchanBI)
              if (lcB != null) {
                stop()
              }
            }, 2000)

            // get the ledger channel
            assert.equal(lcB.channelId, subchanBI)
          }
        ).timeout(45000)

        it('ingrid should have autojoined channel', async () => {
          // ensure autojoining channel
          await interval(async (iterationNumber, stop) => {
            lcB = await client.getLcById(subchanBI)
            if (lcB != null && lcB.state != 0) {
              assert.equal(lcB.state, 1)
              stop()
            }
          }, 2000)
        }).timeout(45000)

        it('ingrid should have 0 balance', async () => {
          lcB = await client.getLcById(subchanBI)
          balanceB = Web3.utils.toBN(lcB.balanceI)
          assert.ok(balanceB.eq(Web3.utils.toBN('0')))
        })
      })

      describe('registering partyC with hub', () => {
        it(
          'should create a ledger channel with the hub and partyC',
          async () => {
            subchanCI = await client.register(initialDeposit, partyC)
            // ensure in database
            await interval(async (iterationNumber, stop) => {
              lcC = await client.getLcById(subchanCI)
              if (lcC != null) {
                stop()
              }
            }, 2000)

            // get the ledger channel
            assert.equal(lcC.channelId, subchanCI)
          }
        ).timeout(45000)

        it('ingrid should have autojoined channel', async () => {
          // ensure autojoining channel
          await interval(async (iterationNumber, stop) => {
            lcC = await client.getLcById(subchanCI)
            if (lcC != null && lcC.state != 0) {
              assert.equal(lcC.state, 1)
              stop()
            }
          }, 2000)
        }).timeout(45000)

        it('ingrid should have 0 balance', async () => {
          lcC = await client.getLcById(subchanCI)
          balanceC = Web3.utils.toBN(lcC.balanceI)
          assert.ok(balanceC.eq(Web3.utils.toBN('0')))
        })
      })

      describe('registering partyD with hub', () => {
        it(
          'should create a ledger channel with the hub and partyD',
          async () => {
            subchanDI = await client.register(initialDeposit, partyD)
            // ensure in database
            await interval(async (iterationNumber, stop) => {
              lcD = await client.getLcById(subchanDI)
              if (lcD != null) {
                stop()
              }
            }, 2000)

            // get the ledger channel
            assert.equal(lcD.channelId, subchanDI)
          }
        ).timeout(45000)

        it('ingrid should have autojoined channel', async () => {
          // ensure autojoining channel
          await interval(async (iterationNumber, stop) => {
            lcD = await client.getLcById(subchanDI)
            if (lcD != null && lcD.state != 0) {
              assert.equal(lcD.state, 1)
              stop()
            }
          }, 2000)
        }).timeout(45000)

        it('ingrid should have 0 balance', async () => {
          lcD = await client.getLcById(subchanDI)
          balanceD = Web3.utils.toBN(lcD.balanceI)
          assert.ok(balanceD.eq(Web3.utils.toBN('0')))
        })
      })

      describe('registering partyE with hub', () => {
        it(
          'should create a ledger channel with the hub and partyE',
          async () => {
            subchanEI = await client.register(initialDeposit, partyE)
            // ensure in database
            await interval(async (iterationNumber, stop) => {
              lcE = await client.getLcById(subchanEI)
              if (lcE != null) {
                stop()
              }
            }, 2000)

            // get the ledger channel
            assert.equal(lcE.channelId, subchanEI)
          }
        ).timeout(45000)

        it('ingrid should have autojoined channel', async () => {
          // ensure autojoining channel
          await interval(async (iterationNumber, stop) => {
            lcE = await client.getLcById(subchanEI)
            if (lcE != null && lcE.state != 0) {
              assert.equal(lcE.state, 1)
              stop()
            }
          }, 2000)
        }).timeout(45000)

        it('ingrid should have 0 balance', async () => {
          lcE = await client.getLcById(subchanAI)
          balanceB = Web3.utils.toBN(lcE.balanceI)
          assert.ok(balanceB.eq(Web3.utils.toBN('0')))
        })
      })

      describe('registration error cases', () => {
        it('should throw an error if you have open and active LC', async () => {
          try {
            await client.register(initialDeposit, partyA)
          } catch (e) {
            assert.equal(e.statusCode, 401)
          }
        })
      })
    })

    describe('Request that hub deposit in earners lc', () => {
      it('should increase the balanceI of lcB by 15 ETH', async () => {
        lcA = await client.getLcById(subchanAI)
        lcC = await client.getLcById(subchanCI)
        lcD = await client.getLcById(subchanDI)
        lcE = await client.getLcById(subchanEI)
        const deposit = Web3.utils
          .toBN(lcA.balanceA)
          .add(Web3.utils.toBN(lcC.balanceA))
          .add(Web3.utils.toBN(lcD.balanceA))
          .add(Web3.utils.toBN(lcE.balanceA))
        await client.requestIngridDeposit({
          lcId: subchanBI,
          deposit
        })
        await interval(async (iterationNumber, stop) => {
          lcB = await client.getLcById(subchanBI)
          if (lcB != null && lcB.state === 1) {
            // open and exists
            assert.ok(deposit.eq(Web3.utils.toBN(lcB.balanceI)))
            stop()
          }
        }, 2000)
      }).timeout(45000)

      // request hub deposit error cases
      it('should throw an error if hub has insufficient funds', async () => {
        const balance = await client.web3.eth.getBalance(ingridAddress)
        const deposit = Web3.utils
          .toBN(balance)
          .add(Web3.utils.toBN(Web3.utils.toWei('10', 'ether')))
        try {
          await client.requestIngridDeposit({
            lcId: subchanBI,
            deposit
          })
        } catch (e) {
          assert.equal(e.statusCode, 500)
        }
      })
    })

    describe('Creating a virtual channel', () => {
      describe('openChannel between partyA and partyB', () => {
        it('should create a new virtual channel between partyA and partyB', async () => {
          vcIdA = await client.openChannel({ to: partyB, sender: partyA })
          vcA = await client.getChannelById(vcIdA)
          assert.equal(vcA.channelId, vcIdA)
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
          vcA = await client.getChannelById(vcIdA)
          let state = await client.getLatestLedgerStateUpdate(subchanBI, [
            'sigI'
          ])
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

      describe('partyB should be able to recieve multiple openChannel updates', () => {
        it('should create a new virtual channel between partyC and partyB', async () => {
          vcIdC = await client.openChannel({ to: partyB, sender: partyC })
          vcC = await client.getChannelById(vcIdC)
          assert.equal(vcC.channelId, vcIdC)
        })

        it('should create a new virtual channel between partyD and partyB', async () => {
          vcIdD = await client.openChannel({ to: partyB, sender: partyD })
          vcD = await client.getChannelById(vcIdD)
          assert.equal(vcD.channelId, vcIdD)
        })

        it('should create a new virtual channel between partyA and partyB', async () => {
          vcIdE = await client.openChannel({ to: partyB, sender: partyE })
          vcE = await client.getChannelById(vcIdE)
          assert.equal(vcE.channelId, vcIdE)
        })
      })
    })

    describe('Updating state in a virtual channel', () => {
      it('should call updateBalance in vcA', async () => {
        balanceA = Web3.utils.toBN(Web3.utils.toWei('4', 'ether'))
        balanceB = Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
        const response = await client.updateBalance({
          channelId: vcIdA,
          balanceA,
          balanceB
        })
        vcA = await client.getChannelById(vcIdA)
        assert.ok(
          Web3.utils.toBN(vcA.balanceA).eq(balanceA) &&
            Web3.utils.toBN(vcA.balanceB).eq(balanceB)
        )
      })

      it('partyA should properly sign the proposed update', async () => {
        const state = await client.getLatestVCStateUpdate(vcIdA)
        const signer = Connext.recoverSignerFromVCStateUpdate({
          sig: state.sigA,
          channelId: vcIdA,
          nonce: state.nonce,
          partyA: partyA,
          partyB: partyB,
          balanceA: Web3.utils.toBN(state.balanceA),
          balanceB: Web3.utils.toBN(state.balanceB)
        })
        assert.equal(signer.toLowerCase(), partyA.toLowerCase())
      })

      it('partyA should be able to send multiple state updates in a row', async () => {
        vcA = await client.getChannelById(vcIdA)
        balanceA = Web3.utils.toBN(vcA.balanceA)
        balanceB = Web3.utils.toBN(vcA.balanceB)
        for (let i = 0; i < 10; i++) {
          balanceA = balanceA.sub(
            Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
          )
          balanceB = balanceB.add(
            Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
          )
          await client.updateBalance({
            channelId: vcIdA,
            balanceA,
            balanceB
          })
        }
        vcA = await client.getChannelById(vcIdA)
        assert.ok(
          balanceA.eq(Web3.utils.toBN(vcA.balanceA)) &&
            balanceB.eq(Web3.utils.toBN(vcA.balanceB))
        )
      })

      it('partyB should be able to recieve state updates across multiple vcs', async () => {
        vcC = await client.getChannelByParties({ partyA: partyC, partyB })
        vcD = await client.getChannelByParties({ partyA: partyD, partyB })
        balanceA = Web3.utils.toBN(Web3.utils.toWei('4', 'ether'))
        balanceB = Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
        await client.updateBalance({
          channelId: vcC.channelId,
          balanceA,
          balanceB
        })
        await client.updateBalance({
          channelId: vcD.channelId,
          balanceA,
          balanceB
        })
        // multiple balance updates
        for (let i = 0; i < 10; i++) {
          balanceA = balanceA.sub(
            Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
          )
          balanceB = balanceB.add(
            Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
          )
          await client.updateBalance({
            channelId: i % 2 === 0 ? vcC.channelId : vcD.channelId,
            balanceA,
            balanceB
          })
        }
        vcD = await client.getChannelById(vcD.channelId)
        assert.ok(
          Web3.utils.toBN(vcD.balanceA).eq(balanceA) &&
            Web3.utils.toBN(vcD.balanceB).eq(balanceB)
        )
      })

      it('should throw an error if the balanceB decreases', async () => {
        balanceA = Web3.utils.toBN('4', 'ether')
        balanceB = Web3.utils.toBN('1', 'ether')
        try {
          await client.updateBalance({
            channelId: vcIdA,
            balanceA,
            balanceB
          })
        } catch (e) {
          assert.equal(e.statusCode, 550)
        }
      })
    })

    describe('Closing a virtual channel', () => {
      it('should change vcA status to settled', async () => {
        const response = await client.closeChannel(vcIdA)
        // get vcA
        vcA = await client.getChannelById(vcIdA)
        assert.equal(vcA.state, 3)
      })

      it('should increase lcA balanceA by vcA.balanceA remainder', async () => {
        // get objs
        lcA = await client.getLcById(subchanAI)
        vcA = await client.getChannelById(vcIdA)
        // calculate expected balance
        let prevState = await client.getLcStateByNonce({
          lcId: subchanAI,
          nonce: lcA.nonce - 1
        })
        const expectedBalA = Web3.utils
          .toBN(prevState.balanceA)
          .add(Web3.utils.toBN(vcA.balanceA))
        assert.ok(expectedBalA.eq(Web3.utils.toBN(lcA.balanceA)))
      })

      it('should increase lcA balanceI by vcA.balanceB', async () => {
        // calculate expected balance
        let prevState = await client.getLcStateByNonce({
          lcId: subchanAI,
          nonce: lcA.nonce - 1
        })
        const expectedBalI = Web3.utils
          .toBN(prevState.balanceI)
          .add(Web3.utils.toBN(vcA.balanceB))
        assert.ok(expectedBalI.eq(Web3.utils.toBN(lcA.balanceI)))
      })

      it('should increase lcB balanceA by vcA.balanceB', async () => {
        // get objs
        lcB = await client.getLcById(subchanBI)
        // calculate expected balance
        let prevState = await client.getLcStateByNonce({
          lcId: subchanBI,
          nonce: lcB.nonce - 1
        })
        const expectedBalA = Web3.utils
          .toBN(prevState.balanceA)
          .add(Web3.utils.toBN(vcA.balanceB))
        assert.ok(expectedBalA.eq(Web3.utils.toBN(lcB.balanceA)))
      })

      it('should decrease lcB balanceI by vcA.balanceA', async () => {
        // calculate expected balance
        let prevState = await client.getLcStateByNonce({
          lcId: subchanBI,
          nonce: lcB.nonce - 1
        })
        const expectedBalI = Web3.utils
          .toBN(prevState.balanceI)
          .add(Web3.utils.toBN(vcA.balanceA))
        assert.ok(expectedBalI.eq(Web3.utils.toBN(lcB.balanceI)))
      })

      it('should not interrupt the flow of other vcs', async () => {
        vcC = await client.getChannelByParties({ partyA: partyC, partyB })
        balanceA = Web3.utils
          .toBN(vcC.balanceA)
          .sub(Web3.utils.toBN(Web3.utils.toWei('1', 'ether')))
        balanceB = Web3.utils
          .toBN(vcC.balanceB)
          .add(Web3.utils.toBN(Web3.utils.toWei('1', 'ether')))
        await client.updateBalance({
          channelId: vcC.channelId,
          balanceA,
          balanceB
        })
        vcC = await client.getChannelById(vcC.channelId)
        assert.ok(balanceA.eq(Web3.utils.toBN(vcC.balanceA)))
      })

      it('partyB should be able to multiple close VCs they havent joined', async () => {
        vcC = await client.getChannelByParties({ partyA: partyC, partyB })
        vcD = await client.getChannelByParties({ partyA: partyD, partyB })
        const response = await client.closeChannels([
          vcC.channelId,
          vcD.channelId
        ])
        // get vcs
        vcC = await client.getChannelById(vcC.channelId)
        vcD = await client.getChannelById(vcD.channelId)
        assert.equal(vcC.state, vcD.state, 3)
      })
    })

    describe('Closing a ledger channel', () => {
      let prevBal, finalBal
      //   subchanAI =
      //     '0x90435bc5511017d078b6f6303e406b31acc86c20d1281827ec57a36980f62c69'
      //   subchanBI =
      //     '0x5d5e59b9d23d466170b13d14acfbfc9ead28b94cea038664ada8daad511bccff'
      //   subchanCI =
      //     '0x4678b2cf2973826ca79b297e1a8d9808a92aa5413b59c5bb6423e7dc84bec2eb'
      //   subchanDI =
      //     '0x1a7611163ed1a1360a7accac37f1c691202a06cbbe376edd81d68c24e756e0c0'
      it(`should close partyA's LC with the fast close flag`, async () => {
        prevBal = await client.web3.eth.getBalance(partyA)
        const response = await client.withdraw(partyA)
        const tx = await client.web3.eth.getTransaction(response)
        assert.equal(tx.to.toLowerCase(), contractAddress)
        assert.equal(tx.from.toLowerCase(), partyA.toLowerCase())
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

      it(`should not let you close an LC with openVCs`, async () => {
        try {
          const response = await client.withdraw(partyB) // + 7 ETH
        } catch (e) {
          assert.equal(e.statusCode, 600)
        }
      }).timeout(5000)

      it('should not interrupt flow in other VCs', async () => {
        vcE = await client.getChannelByParties({ partyA: partyE, partyB })
        balanceA = Web3.utils.toBN(Web3.utils.toWei('4', 'ether'))
        balanceB = Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
        await client.updateBalance({
          channelId: vcE.channelId,
          balanceA,
          balanceB
        })
        vcE = await client.getChannelById(vcE.channelId)
        assert.ok(
          Web3.utils.toBN(vcE.balanceA).eq(balanceA) &&
            Web3.utils.toBN(vcE.balanceB).eq(balanceB)
        )
      })

      it(`should close partyC's LC with the fast close flag`, async () => {
        prevBal = await client.web3.eth.getBalance(partyC)
        const response = await client.withdraw(partyC)

        const tx = await client.web3.eth.getTransaction(response)
        assert.equal(tx.to.toLowerCase(), contractAddress)
        assert.equal(tx.from.toLowerCase(), partyC.toLowerCase())
      }).timeout(5000)

      it(`should transfer balanceA partyC's into wallet`, async () => {
        lcC = await client.getLcById(subchanCI)
        const expected = Web3.utils.fromWei(
          Web3.utils.toBN(lcC.balanceA).add(Web3.utils.toBN(prevBal)),
          'ether'
        )
        finalBal = Web3.utils.fromWei(
          await client.web3.eth.getBalance(partyC),
          'ether'
        )
        assert.equal(Math.round(expected), Math.round(finalBal))
      })

      it(`should close partyD's LC with the fast close flag`, async () => {
        prevBal = await client.web3.eth.getBalance(partyD)
        const response = await client.withdraw(partyD)
        const tx = await client.web3.eth.getTransaction(response)
        assert.equal(tx.to.toLowerCase(), contractAddress)
        assert.equal(tx.from.toLowerCase(), partyD.toLowerCase())
      }).timeout(5000)

      it(`should transfer balanceA partyD's into wallet`, async () => {
        lcD = await client.getLcById(subchanDI)
        const expected = Web3.utils.fromWei(
          Web3.utils.toBN(lcD.balanceA).add(Web3.utils.toBN(prevBal)),
          'ether'
        )
        finalBal = Web3.utils.fromWei(
          await client.web3.eth.getBalance(partyD),
          'ether'
        )
        assert.equal(Math.round(expected), Math.round(finalBal))
      })

      it(`should close partyE's LC with the fast close flag`, async () => {
        await client.closeChannel(vcIdE) // close VCs
        prevBal = await client.web3.eth.getBalance(partyE)
        const response = await client.withdraw(partyE)
        const tx = await client.web3.eth.getTransaction(response)
        assert.equal(tx.to.toLowerCase(), contractAddress)
        assert.equal(tx.from.toLowerCase(), partyE.toLowerCase())
      }).timeout(5000)

      it(`should transfer balanceA partyE's into wallet`, async () => {
        lcE = await client.getLcById(subchanEI)
        const expected = Web3.utils.fromWei(
          Web3.utils.toBN(lcE.balanceA).add(Web3.utils.toBN(prevBal)),
          'ether'
        )
        finalBal = Web3.utils.fromWei(
          await client.web3.eth.getBalance(partyE),
          'ether'
        )
        assert.equal(Math.round(expected), Math.round(finalBal))
      })

      // it.only('find the fucking issue', async () => {
      //   lcB = await client.getLcByPartyA(partyB)
      //   const _balanceI =
      //   const _balanceA =
      // })

      it(`should close partyB's LC with the fast close flag`, async () => {
        prevBal = await client.web3.eth.getBalance(partyB) // 95 ETH
        const response = await client.withdraw(partyB) // + 7 ETH
        const tx = await client.web3.eth.getTransaction(response)
        assert.equal(tx.to.toLowerCase(), contractAddress)
        assert.equal(tx.from.toLowerCase(), partyB.toLowerCase())
      }).timeout(5000)

      it(`should transfer balanceA partyB's into wallet`, async () => {
        lcB = await client.getLcByPartyA(partyB)
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
})
