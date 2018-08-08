require('dotenv').config()
const chai = require('chai')
const expect = chai.expect
const Web3 = require('web3')
const fetch = require('fetch-cookie')(require('node-fetch'))
const interval = require('interval-promise')
const { genAuthHash } = require('./helpers/utils')

global.fetch = fetch

const Connext = require('../src/Connext')

// named variables
// on init
const web3 = new Web3('http://localhost:8545')
let client
let ingridAddress
let ingridUrl = 'http://localhost:8080'
let contractAddress = '0xdec16622bfe1f0cdaf6f7f20437d2a040cccb0a1'
let watcherUrl = ''

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

describe('Connext happy case testing flow', () => {
  before('authenticate', async () => {
    accounts = await web3.eth.getAccounts()
    ingridAddress = accounts[0]
    partyA = accounts[1]
    partyB = accounts[2]
    partyC = accounts[3]
    partyD = accounts[4]
    partyE = accounts[5]

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

    expect(authJson).to.not.deep.equal({})

    // init client instance
    client = new Connext({
      web3,
      ingridAddress,
      watcherUrl,
      ingridUrl,
      contractAddress
    })
  })

  describe('openChanneling with the hub', () => {
    describe('openChanneling partyA with hub', () => {
      it(
        'should create a ledger channel with the hub and partyA and wait for chainsaw',
        async () => {
          subchanAI = await client.openChannel(
            Web3.utils.toBN(Web3.utils.toWei('6', 'ether')),
            partyA
          )
          // ensure lc is in the database
          await interval(async (iterationNumber, stop) => {
            lcA = await client.getChannelById(subchanAI)
            if (lcA != null) {
              stop()
            }
          }, 2000)
          expect(lcA.channelId).to.be.equal(subchanAI)
        }
      ).timeout(45000)

      it('ingrid should have autojoined lcA', async () => {
        // ensure lc is in the database
        await interval(async (iterationNumber, stop) => {
          lcA = await client.getChannelById(subchanAI)
          if (lcA.state != 0) {
            stop()
          }
        }, 2000)
        expect(lcA.state).to.be.equal(1)
      }).timeout(45000)

      it('ingrid should have 0 balance in lcA', async () => {
        balanceB = Web3.utils.toBN(lcA.balanceI)
        expect(balanceB.eq(Web3.utils.toBN('0'))).to.equal(true)
      })
    })

    describe('openChanneling partyB with hub', () => {
      it('should create a ledger channel with the hub and partyB', async () => {
        subchanBI = await client.openChannel(initialDeposit, partyB)
        // ensure lc is in the database
        await interval(async (iterationNumber, stop) => {
          lcB = await client.getChannelById(subchanBI)
          if (lcB != null) {
            stop()
          }
        }, 2000)
        expect(lcB.channelId).to.be.equal(subchanBI)
      }).timeout(45000)

      it('ingrid should have autojoined channel', async () => {
        await interval(async (iterationNumber, stop) => {
          lcB = await client.getChannelById(subchanBI)
          if (lcB.state != 0) {
            stop()
          }
        }, 2000)
        expect(lcB.state).to.be.equal(1)
      }).timeout(45000)

      it('ingrid should have 0 balance in lcB', async () => {
        balanceB = Web3.utils.toBN(lcB.balanceI)
        expect(balanceB.eq(Web3.utils.toBN('0'))).to.equal(true)
      })
    })

    describe('openChanneling partyC with hub', () => {
      it('should create a ledger channel with the hub and partyC', async () => {
        subchanCI = await client.openChannel(initialDeposit, partyC)
        // ensure lc is in the database
        await interval(async (iterationNumber, stop) => {
          lcC = await client.getChannelById(subchanCI)
          if (lcC != null) {
            stop()
          }
        }, 2000)
        expect(lcC.channelId).to.be.equal(subchanCI)
      }).timeout(45000)

      it('ingrid should have autojoined channel', async () => {
        await interval(async (iterationNumber, stop) => {
          lcC = await client.getChannelById(subchanCI)
          if (lcC.state != 0) {
            stop()
          }
        }, 2000)
        expect(lcC.state).to.be.equal(1)
      }).timeout(45000)

      it('ingrid should have 0 balance in lcB', async () => {
        balanceB = Web3.utils.toBN(lcC.balanceI)
        expect(balanceB.eq(Web3.utils.toBN('0'))).to.equal(true)
      })
    })

    describe('openChanneling partyD with hub', () => {
      it('should create a ledger channel with the hub and partyD', async () => {
        subchanDI = await client.openChannel(initialDeposit, partyD)
        // ensure lc is in the database
        await interval(async (iterationNumber, stop) => {
          lcD = await client.getChannelById(subchanDI)
          if (lcD != null) {
            stop()
          }
        }, 2000)
        expect(lcD.channelId).to.be.equal(subchanDI)
      }).timeout(45000)

      it('ingrid should have autojoined channel', async () => {
        await interval(async (iterationNumber, stop) => {
          lcD = await client.getChannelById(subchanDI)
          if (lcD.state != 0) {
            stop()
          }
        }, 2000)
        expect(lcD.state).to.be.equal(1)
      }).timeout(45000)
    })

    describe('openChanneling partyE with hub', () => {
      it('should create a ledger channel with the hub and partyE', async () => {
        subchanEI = await client.openChannel(initialDeposit, partyE)
        // ensure lc is in the database
        await interval(async (iterationNumber, stop) => {
          lcE = await client.getChannelById(subchanEI)
          if (lcE != null) {
            stop()
          }
        }, 2000)
        expect(lcE.channelId).to.be.equal(subchanEI)
      }).timeout(45000)

      it('ingrid should have autojoined channel', async () => {
        await interval(async (iterationNumber, stop) => {
          lcE = await client.getChannelById(subchanEI)
          if (lcE.state != 0) {
            stop()
          }
        }, 2000)
        expect(lcE.state).to.be.equal(1)
      }).timeout(45000)
    })

    describe('registration error cases', async () => {
      it('should throw an error if you have open and active LC', async () => {
        try {
          await client.openChannel(initialDeposit, partyA)
        } catch (e) {
          expect(e.statusCode).to.equal(401)
          expect(e.name).to.equal('ChannelOpenError')
          expect(e.methodName).to.equal('openChannel')
        }
      })
    })
  })

  describe('Requesting hub deposit', () => {
    it(
      'request ingrid deposits into lcB for all viewer lc.balanceA',
      async () => {
        lcA = await client.getChannelByPartyA(partyA)
        lcC = await client.getChannelByPartyA(partyC)
        lcD = await client.getChannelByPartyA(partyD)
        lcE = await client.getChannelByPartyA(partyE)

        const deposit = Web3.utils
          .toBN(lcA.balanceA)
          .add(Web3.utils.toBN(lcC.balanceA))
          .add(Web3.utils.toBN(lcD.balanceA))
          .add(Web3.utils.toBN(lcE.balanceA))
        await client.requestHubDeposit({
          lcId: subchanBI,
          deposit
        })
        await interval(async (iterationNumber, stop) => {
          lcB = await client.getChannelById(subchanBI)
          if (
            lcB != null && // exists
            lcB.state === 1 && // joined
            !Web3.utils.toBN(lcB.balanceI).isZero()
          ) {
            stop()
          }
        }, 2000)
        expect(deposit.eq(Web3.utils.toBN(lcB.balanceI))).to.equal(true)
      }
    ).timeout(45000)

    it('should throw an error if hub has insufficient funds', async () => {
      const balance = await client.web3.eth.getBalance(ingridAddress)
      const deposit = Web3.utils
        .toBN(balance)
        .add(Web3.utils.toBN(Web3.utils.toWei('1000', 'ether')))
      try {
        await client.requestHubDeposit({
          lcId: subchanBI,
          deposit
        })
      } catch (e) {
        expect(e.statusCode).to.equal(500)
      }
    })
  })

  describe('Creating a virtual channel', () => {
    describe('openThread between partyA and partyB', () => {
      it('should create a new virtual channel between partyA and partyB', async () => {
        vcIdA = await client.openThread({
          to: partyB,
          sender: partyA,
          deposit: initialDeposit
        })
        vcA = await client.getThreadById(vcIdA)
        expect(vcA.channelId).to.equal(vcIdA)
      })

      it('balanceA in lcA should be 1', async () => {
        lcA = await client.getChannelById(subchanAI)
        expect(
          Web3.utils
            .toBN(Web3.utils.toWei('1', 'ether'))
            .eq(Web3.utils.toBN(lcA.balanceA))
        ).to.equal(true)
      })

      it('hub should countersign proposed LC update', async () => {
        let state = await client.getLatestChannelState(subchanAI)
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
        expect(signer.toLowerCase()).to.equal(ingridAddress.toLowerCase())
      })

      it('hub should create update for lcB', async () => {
        vcA = await client.getThreadById(vcIdA)
        let state = await client.getLatestChannelState(subchanBI, ['sigI'])
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
        expect(signer.toLowerCase()).to.equal(ingridAddress.toLowerCase())
      })

      // error cases
    })

    describe('partyB should be able to recieve multiple openThread updates', () => {
      it('should create a new virtual channel between partyC and partyB', async () => {
        vcIdC = await client.openThread({ to: partyB, sender: partyC })
        vcC = await client.getThreadById(vcIdC)
        expect(vcC.channelId).to.equal(vcIdC)
      })

      it('should create a new virtual channel between partyD and partyB', async () => {
        vcIdD = await client.openThread({ to: partyB, sender: partyD })
        vcD = await client.getThreadById(vcIdD)
        expect(vcD.channelId).to.equal(vcIdD)
      })
    })
  })

  describe('Updating balances in a channel', async () => {
    it('should call updateBalances in vcA', async () => {
      balanceA = Web3.utils.toBN(Web3.utils.toWei('4', 'ether'))
      balanceB = Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
      const response = await client.updateBalances(
        [
          {
            type: 'VIRTUAL',
            channelId: vcIdA,
            payment: {
              balanceA,
              balanceB
            },
            meta: {
              receiver: '0x5aeda56215b167893e80b4fe645ba6d5bab767de',
              type: 'TIP',
              fields: {
                streamId: 6969,
                performerId: 1337,
                performerName: 'Agent Smith'
              }
            }
          }
        ],
        partyA
      )
      vcA = await client.getThreadById(vcIdA)
      console.log('vcA:', vcA)
      console.log('balanceA:', balanceA.toString())
      console.log('balanceB:', balanceB.toString())
      expect(Web3.utils.toBN(vcA.balanceA).eq(balanceA)).to.equal(true)
      expect(Web3.utils.toBN(vcA.balanceB).eq(balanceB)).to.equal(true)
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
      expect(signer.toLowerCase()).to.equal(partyA.toLowerCase())
    })

    it('partyA should be able to send multiple state updates in a row', async () => {
      vcA = await client.getThreadById(vcIdA)
      balanceA = Web3.utils.toBN(vcA.balanceA)
      balanceB = Web3.utils.toBN(vcA.balanceB)
      for (let i = 0; i < 10; i++) {
        balanceA = balanceA.sub(
          Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        )
        balanceB = balanceB.add(
          Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        )
        await client.updateBalances(
          [
            {
              type: 'VIRTUAL',
              channelId: vcIdA,
              payment: {
                balanceA,
                balanceB
              },
              meta: {
                receiver: '0x5aeda56215b167893e80b4fe645ba6d5bab767de',
                type: 'TIP',
                fields: {
                  streamId: 6969,
                  performerId: 1337,
                  performerName: 'Agent Smith'
                }
              }
            }
          ],
          partyA
        )
      }
      vcA = await client.getThreadById(vcIdA)
      expect(balanceA.eq(Web3.utils.toBN(vcA.balanceA))).to.equal(true)
      expect(balanceB.eq(Web3.utils.toBN(vcA.balanceB))).to.equal(true)
    })

    it('should be able to send ledger and virtual channel updates', async () => {
      vcA = await client.getThreadById(vcIdA)
      lcA = await client.getChannelById(subchanAI)
      const balDiff = Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
      const vcA1 = Web3.utils.toBN(vcA.balanceA).sub(balDiff)
      const vcA2 = vcA1.sub(balDiff)
      const lcA1 = Web3.utils.toBN(lcA.balanceA).sub(balDiff)
      const lcA2 = lcA1.sub(balDiff)
      const vcB1 = Web3.utils.toBN(vcA.balanceB).add(balDiff)
      const vcB2 = vcB1.add(balDiff)
      const lcI1 = Web3.utils.toBN(lcA.balanceI).add(balDiff)
      const lcI2 = lcI1.add(balDiff)

      const payments = [
        {
          type: 'VIRTUAL',
          channelId: vcIdA,
          payment: {
            balanceA: vcA1,
            balanceB: vcB1
          },
          meta: {
            receiver: '0x5aeda56215b167893e80b4fe645ba6d5bab767de',
            type: 'TIP',
            fields: {
              streamId: 6969,
              performerId: 1337,
              performerName: 'Agent Smith'
            }
          }
        },
        {
          type: 'LEDGER',
          channelId: subchanAI,
          payment: {
            balanceA: lcA1,
            balanceI: lcI1
          },
          meta: {
            receiver: '0x5aeda56215b167893e80b4fe645ba6d5bab767de',
            type: 'PURCHASE',
            fields: {
              productSku: 6969,
              productName: 'Agent Smith'
            }
          }
        },
        {
          type: 'VIRTUAL',
          channelId: vcIdA,
          payment: {
            balanceA: vcA2,
            balanceB: vcB2
          },
          meta: {
            receiver: '0x5aeda56215b167893e80b4fe645ba6d5bab767de',
            type: 'TIP',
            fields: {
              streamId: 6969,
              performerId: 1337,
              performerName: 'Agent Smith'
            }
          }
        },
        {
          type: 'LEDGER',
          channelId: subchanAI,
          payment: {
            balanceA: lcA2,
            balanceI: lcI2
          },
          meta: {
            receiver: '0x5aeda56215b167893e80b4fe645ba6d5bab767de',
            type: 'PURCHASE',
            fields: {
              productSku: 6969,
              productName: 'Agent Smith'
            }
          }
        }
      ]

      const response = await client.updateBalances(payments, partyA)
      console.log(response)
      expect(response.status).to.equal(200)
      // verify new balances
      vcA = await client.getThreadById(vcIdA)
      lcA = await client.getChannelById(subchanAI)
      // vc
      expect(vcA.balanceA).to.equal(vcA2.toString())
      expect(vcA.balanceB).to.equal(vcB2.toString())
      // lc
      expect(lcA.balanceA).to.equal(lcA2.toString())
      expect(lcA.balanceI).to.equal(lcI2.toString())
    })

    it('should not prohibit the creation of a virtual channel', async () => {
      vcIdE = await client.openThread({ to: partyB, sender: partyE })
      vcE = await client.getThreadById(vcIdE)
      expect(vcE.channelId).to.equal(vcIdE)
    })

    it('partyB should be able to recieve state updates across multiple vcs', async () => {
      vcC = await client.getThreadByParties({ partyA: partyC, partyB })
      vcD = await client.getThreadByParties({ partyA: partyD, partyB })
      balanceA = Web3.utils.toBN(Web3.utils.toWei('4', 'ether'))
      balanceB = Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
      await client.updateBalances(
        [
          {
            type: 'VIRTUAL',
            channelId: vcC.channelId,
            payment: {
              balanceA,
              balanceB
            },
            meta: {
              receiver: '0x5aeda56215b167893e80b4fe645ba6d5bab767de',
              type: 'TIP',
              fields: {
                streamId: 6969,
                performerId: 1337,
                performerName: 'Agent Smith'
              }
            }
          }
        ],
        partyC
      )
      await client.updateBalances(
        [
          {
            type: 'VIRTUAL',
            channelId: vcD.channelId,
            payment: {
              balanceA,
              balanceB
            },
            meta: {
              receiver: '0x5aeda56215b167893e80b4fe645ba6d5bab767de',
              type: 'TIP',
              fields: {
                streamId: 6969,
                performerId: 1337,
                performerName: 'Agent Smith'
              }
            }
          }
        ],
        partyD
      )
      // multiple balance updates
      for (let i = 0; i < 10; i++) {
        balanceA = balanceA.sub(
          Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        )
        balanceB = balanceB.add(
          Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
        )
        const sender = i % 2 === 0 ? partyC : partyD
        await client.updateBalances(
          [
            {
              type: 'VIRTUAL',
              channelId: i % 2 === 0 ? vcC.channelId : vcD.channelId,
              payment: {
                balanceA,
                balanceB
              },
              meta: {
                receiver: '0x5aeda56215b167893e80b4fe645ba6d5bab767de',
                type: 'TIP',
                fields: {
                  streamId: 6969,
                  performerId: 1337,
                  performerName: 'Agent Smith'
                }
              }
            }
          ],
          sender
        )
      }
      vcD = await client.getThreadById(vcD.channelId)
      expect(Web3.utils.toBN(vcD.balanceA).eq(balanceA)).to.equal(true)
      expect(Web3.utils.toBN(vcD.balanceB).eq(balanceB)).to.equal(true)
    })

    it('should throw an error if the balanceB decreases', async () => {
      balanceA = Web3.utils.toBN('4', 'ether')
      balanceB = Web3.utils.toBN('1', 'ether')
      try {
        await client.updateBalances(
          [
            {
              type: 'VIRTUAL',
              channelId: vcA.channelId,
              payment: {
                balanceA,
                balanceB
              },
              meta: {
                receiver: '0x5aeda56215b167893e80b4fe645ba6d5bab767de',
                type: 'TIP',
                fields: {
                  streamId: 6969,
                  performerId: 1337,
                  performerName: 'Agent Smith'
                }
              }
            }
          ],
          partyA
        )
      } catch (e) {
        expect(e.statusCode).to.equal(550)
      }
    })
  })

  describe('Closing a virtual channel', () => {
    it('should change vcA status to settled', async () => {
      vcA = await client.getThreadByParties({ partyA, partyB })
      const response = await client.closeChannel(vcA.channelId, partyA)
      // get vcA
      vcA = await client.getThreadById(vcA.channelId)
      expect(vcA.state).to.equal(3)
    })

    it('should increase lcA balanceA by vcA.balanceA remainder', async () => {
      // get objs
      lcA = await client.getChannelByPartyA(partyA)
      // calculate expected balance
      let prevState = await client.getChannelStateByNonce({
        lcId: lcA.channelId,
        nonce: lcA.nonce - 1
      })
      const expectedBalA = Web3.utils
        .toBN(prevState.balanceA)
        .add(Web3.utils.toBN(vcA.balanceA))
      expect(expectedBalA.eq(Web3.utils.toBN(lcA.balanceA))).to.equal(true)
    })

    it('should increase lcA balanceI by vcA.balanceB', async () => {
      // calculate expected balance
      let prevState = await client.getChannelStateByNonce({
        lcId: lcA.channelId,
        nonce: lcA.nonce - 1
      })
      const expectedBalI = Web3.utils
        .toBN(prevState.balanceI)
        .add(Web3.utils.toBN(vcA.balanceB))
      expect(expectedBalI.eq(Web3.utils.toBN(lcA.balanceI))).to.equal(true)
    })

    it('should increase lcB balanceA by vcA.balanceB', async () => {
      // get objs
      lcB = await client.getChannelByPartyA(partyB)
      // calculate expected balance
      let prevState = await client.getChannelStateByNonce({
        lcId: subchanBI,
        nonce: lcB.nonce - 1
      })
      const expectedBalA = Web3.utils
        .toBN(prevState.balanceA)
        .add(Web3.utils.toBN(vcA.balanceB))
      expect(expectedBalA.eq(Web3.utils.toBN(lcB.balanceA))).to.equal(true)
    })

    it('should decrease lcB balanceI by vcA.balanceA', async () => {
      // calculate expected balance
      let prevState = await client.getChannelStateByNonce({
        lcId: subchanBI,
        nonce: lcB.nonce - 1
      })
      const expectedBalI = Web3.utils
        .toBN(prevState.balanceI)
        .add(Web3.utils.toBN(vcA.balanceA))
      expect(expectedBalI.eq(Web3.utils.toBN(lcB.balanceI))).to.equal(true)
    })

    it('should not interrupt the flow of other vcs', async () => {
      vcC = await client.getThreadByParties({ partyA: partyC, partyB })
      balanceA = Web3.utils
        .toBN(vcC.balanceA)
        .sub(Web3.utils.toBN(Web3.utils.toWei('1', 'ether')))
      balanceB = Web3.utils
        .toBN(vcC.balanceB)
        .add(Web3.utils.toBN(Web3.utils.toWei('1', 'ether')))
      await client.updateBalances(
        [
          {
            type: 'VIRTUAL',
            channelId: vcC.channelId,
            payment: {
              balanceA,
              balanceB
            },
            meta: {
              receiver: '0x5aeda56215b167893e80b4fe645ba6d5bab767de',
              type: 'TIP',
              fields: {
                streamId: 6969,
                performerId: 1337,
                performerName: 'Agent Smith'
              }
            }
          }
        ],
        partyC
      )
      vcC = await client.getThreadById(vcC.channelId)
      expect(balanceA.eq(Web3.utils.toBN(vcC.balanceA))).to.equal(true)
    })

    it('partyB should be able to close a channel', async () => {
      vcC = await client.getThreadByParties({ partyA: partyC, partyB })
      const response = await client.closeChannel(vcC.channelId, partyB)
      // get vc
      vcC = await client.getThreadById(vcC.channelId)
      expect(vcC.state).to.equal(3)
    })

    // ensure math stays the same
    it('should increase lcC balanceA by vcC.balanceA remainder', async () => {
      // get objs
      lcC = await client.getChannelByPartyA(partyC)
      // calculate expected balance
      let prevState = await client.getChannelStateByNonce({
        lcId: lcC.channelId,
        nonce: lcC.nonce - 1
      })
      const expectedBalA = Web3.utils
        .toBN(prevState.balanceA)
        .add(Web3.utils.toBN(vcC.balanceA))
      expect(expectedBalA.eq(Web3.utils.toBN(lcC.balanceA))).to.equal(true)
    })

    it('should increase lcC balanceI by vcC.balanceB', async () => {
      // calculate expected balance
      let prevState = await client.getChannelStateByNonce({
        lcId: lcC.channelId,
        nonce: lcC.nonce - 1
      })
      const expectedBalI = Web3.utils
        .toBN(prevState.balanceI)
        .add(Web3.utils.toBN(vcC.balanceB))
      expect(expectedBalI.eq(Web3.utils.toBN(lcC.balanceI))).to.equal(true)
    })

    it('should increase lcB balanceA by vcC.balanceB', async () => {
      // get objs
      lcB = await client.getChannelByPartyA(partyB)
      // calculate expected balance
      let prevState = await client.getChannelStateByNonce({
        lcId: subchanBI,
        nonce: lcB.nonce - 1
      })
      const expectedBalA = Web3.utils
        .toBN(prevState.balanceA)
        .add(Web3.utils.toBN(vcC.balanceB))
      expect(expectedBalA.eq(Web3.utils.toBN(lcB.balanceA))).to.equal(true)
    })

    it('should decrease lcB balanceI by vcA.balanceA', async () => {
      // calculate expected balance
      let prevState = await client.getChannelStateByNonce({
        lcId: subchanBI,
        nonce: lcB.nonce - 1
      })
      const expectedBalI = Web3.utils
        .toBN(prevState.balanceI)
        .add(Web3.utils.toBN(vcC.balanceA))
      expect(expectedBalI.eq(Web3.utils.toBN(lcB.balanceI))).to.equal(true)
    })

    it('partyB should be able to close multiple channels', async () => {
      vcD = await client.getThreadByParties({ partyA: partyD, partyB })
      vcE = await client.getThreadByParties({ partyA: partyE, partyB })
      const channelIds = [vcD.channelId, vcE.channelId]
      for (const channelId of channelIds) {
        await client.closeChannel(channelId, partyB)
      }
      // refetch channels
      vcD = await client.getThreadById(vcD.channelId)
      vcE = await client.getThreadById(vcE.channelId)

      expect(vcD.state).to.equal(3)
      expect(vcE.state).to.equal(3)
    })
  })

  describe('Closing a ledger channel', () => {
    let prevBalA, finalBalA, prevBalI, finalBalI

    before('Create a virtual channel that has not been closed', async () => {
      vcIdC = await client.openThread({ to: partyB, sender: partyC })
      vcC = await client.getThreadById(vcIdC)
    })

    it(`should close partyA's LC with the fast close flag`, async () => {
      prevBalA = await client.web3.eth.getBalance(partyA)
      prevBalI = await client.web3.eth.getBalance(ingridAddress)
      // send tx
      const response = await client.withdraw(partyA)
      const tx = await client.web3.eth.getTransaction(response)
      expect(tx.to.toLowerCase()).to.equal(contractAddress)
      expect(tx.from.toLowerCase()).to.equal(partyA.toLowerCase())
    }).timeout(8000)

    it(`should transfer balanceA of partyA's lc into wallet`, async () => {
      lcA = await client.getChannelByPartyA(partyA)
      const expected = Web3.utils.fromWei(
        Web3.utils.toBN(lcA.balanceA).add(Web3.utils.toBN(prevBalA)),
        'ether'
      )
      finalBalA = Web3.utils.fromWei(
        await client.web3.eth.getBalance(partyA),
        'ether'
      )
      expect(Math.round(expected)).to.equal(Math.round(finalBalA))
    })

    it(`should transfer balanceI of lc into hubs wallet`, async () => {
      const expected = Web3.utils.fromWei(
        Web3.utils.toBN(lcA.balanceI).add(Web3.utils.toBN(prevBalI)),
        'ether'
      )
      finalBalI = Web3.utils.fromWei(
        await client.web3.eth.getBalance(ingridAddress),
        'ether'
      )
      expect(Math.round(expected)).to.equal(Math.round(finalBalI))
    })

    it(`should not let you close an LC with openVCs`, async () => {
      try {
        const response = await client.withdraw(partyB) // + 7 ETH
      } catch (e) {
        expect(e.statusCode).to.equal(600)
      }
    }).timeout(9000)

    it('should not interrupt the flow of open VCs', async () => {
      vcC = await client.getThreadByParties({ partyA: partyC, partyB })
      balanceA = Web3.utils
        .toBN(vcC.balanceA)
        .sub(Web3.utils.toBN(Web3.utils.toWei('1', 'ether')))
      balanceB = Web3.utils
        .toBN(vcC.balanceB)
        .add(Web3.utils.toBN(Web3.utils.toWei('1', 'ether')))
      await client.updateBalance({
        channelId: vcC.channelId,
        payment: {
          balanceA,
          balanceB
        },
        meta: {
          receiver: '0x5aeda56215b167893e80b4fe645ba6d5bab767de',
          type: 'TIP',
          fields: {
            streamId: 6969,
            performerId: 1337,
            performerName: 'Agent Smith'
          }
        }
      })
      vcC = await client.getThreadById(vcC.channelId)
      expect(balanceA.eq(Web3.utils.toBN(vcC.balanceA))).to.equal(true)
    })

    it(`should close partyC's LC with the fast close`, async () => {
      // close open vcs
      await client.closeChannel(vcC.channelId, partyC)
      // send tx
      const response = await client.withdraw(partyC)
      const tx = await client.web3.eth.getTransaction(response)
      expect(tx.to.toLowerCase()).to.equal(contractAddress)
      expect(tx.from.toLowerCase()).to.equal(partyC.toLowerCase())
    }).timeout(8000)

    it(`should close partyD's LC with the fast close`, async () => {
      // send tx
      const response = await client.withdraw(partyD)
      const tx = await client.web3.eth.getTransaction(response)
      expect(tx.to.toLowerCase()).to.equal(contractAddress)
      expect(tx.from.toLowerCase()).to.equal(partyD.toLowerCase())
    }).timeout(8000)

    it(`should close partyE's LC with the fast close`, async () => {
      // send tx
      const response = await client.withdraw(partyE)
      const tx = await client.web3.eth.getTransaction(response)
      expect(tx.to.toLowerCase()).to.equal(contractAddress)
      expect(tx.from.toLowerCase()).to.equal(partyE.toLowerCase())
    }).timeout(8000)

    it(`should close partyB's LC with the fast close`, async () => {
      prevBalA = await client.web3.eth.getBalance(partyB) // 95 ETH
      const response = await client.withdraw(partyB) // + 7 ETH
      const tx = await client.web3.eth.getTransaction(response)
      expect(tx.to.toLowerCase()).to.equal(contractAddress)
      expect(tx.from.toLowerCase()).to.equal(partyB.toLowerCase())
    }).timeout(5000)

    it(`should transfer balanceA partyB's into wallet`, async () => {
      lcB = await client.getChannelByPartyA(partyB)
      const expected = Web3.utils.fromWei(
        Web3.utils.toBN(lcB.balanceA).add(Web3.utils.toBN(prevBalA)),
        'ether'
      )
      finalBal = Web3.utils.fromWei(
        await client.web3.eth.getBalance(partyB),
        'ether'
      )
      expect(Math.round(expected)).to.equal(Math.round(finalBal))
    })
  })
})
