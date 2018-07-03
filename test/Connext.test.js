require('dotenv').config()
const assert = require('assert')
const Connext = require('../src/Connext')
const { createFakeWeb3, timeout } = require('./helpers/utils')
const Utils = require('../src/helpers/utils')
const Web3 = require('web3')

// named variables
// on init
let web3
let client
let ingridAddress
let watcherUrl = process.env.WATCHER_URL_DEV || ''
let ingridUrl = process.env.INGRID_URL_DEV || 'http://localhost:8080'
let contractAddress = '0x31713144d9ae2501e644a418dd9035ed840b1660'
let hubAuth =
  's%3ACiKWh3t14XjMAllKSmNfYC3F1CzvsFXl.LxI4s1J33VukHvx58lqlPwYlDwEMEbMw1dWhxJz1bjM'

// for accounts
let accounts
let partyA
let partyB

// for initial ledger channel states
let balanceA
let balanceI
let balanceB
let initialDeposit = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
let subchanAI =
  '0x1c207f0960266a06fb5ce2e9d7b990b6489ca37c0f61c4afc34699fe42e96395'
let subchanBI =
  '0x14b5dadcd4ccf2dbaec2600d3fc0eb440be926ecf6d27c6983ec1c097bf93fba'
let vcId = '0x2000000000000000000000000000000000000000000000000000000000000000'

// state objects
let AI_LC0, BI_LC0, AB_VC0, AI_LC1, BI_LC1, AB_VCN, AI_LC2, BI_LC2
let hash
let sigA_AI_LC0, sigI_AI_LC0, sigI_BI_LC0, sigB_BI_LC0 // initial lc state
let sigA_AB_VC0, sigB_AB_VC0 // initial vc state
let sigA_AI_LC1, sigI_AI_LC1, sigI_BI_LC1, sigB_BI_LC1 // sign to open vc
let sigA_AB_VCN, sigB_AB_VCN // final vc update
let sigA_AI_LC2, sigI_AI_LC2, sigI_BI_LC2, sigB_BI_LC2 // sign to close vc

// hub response placeholder
let response

const emptyRootHash = Connext.generateVcRootHash({ vc0s: [] })

describe('Connext', async () => {
  describe('client init', () => {
    it('should create a connext client with a fake version of web3', async () => {
      client = new Connext({ web3 }, createFakeWeb3())
      assert.ok(typeof client === 'object')
    })

    describe('real web3 and channel manager', () => {
      it.only(
        'should init web3 and generate static values for client testing',
        async () => {
          // set party variables
          const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
          web3 = new Web3(`ws://localhost:${port}`)
          accounts = await web3.eth.getAccounts()
          ingridAddress = accounts[0]
          partyA = accounts[1]
          partyB = accounts[2]

          // generate AI_LC0
          AI_LC0 = {
            isClose: false,
            channelId: subchanAI,
            state: 1,
            nonce: 0,
            openVcs: 0,
            vcRootHash: emptyRootHash,
            partyA,
            partyI: ingridAddress,
            balanceA: initialDeposit,
            balanceI: Web3.utils.toBN('0')
          }
          // generate sigs
          hash = Connext.createLCStateUpdateFingerprint(AI_LC0)
          sigA_AI_LC0 = await web3.eth.sign(hash, partyA)
          sigI_AI_LC0 = await web3.eth.sign(hash, ingridAddress)

          // generate BI_LC0
          BI_LC0 = {
            isClose: false,
            channelId: subchanBI,
            state: 1,
            nonce: 0,
            openVcs: 0,
            vcRootHash: emptyRootHash,
            partyA: partyB,
            partyI: ingridAddress,
            balanceA: initialDeposit,
            balanceI: Web3.utils.toBN('0')
          }
          // generate sigs of BI_LC0
          hash = Connext.createLCStateUpdateFingerprint(BI_LC0)
          sigB_BI_LC0 = web3.eth.sign(hash, partyB)
          sigI_BI_LC0 = web3.eth.sign(hash, ingridAddress)

          // generate vc0
          AB_VC0 = {
            state: 1,
            balanceA: initialDeposit,
            balanceB: Web3.utils.toBN('0'),
            channelId: vcId,
            partyA: partyA,
            partyB: partyB,
            partyI: ingridAddress,
            subchanAtoI: subchanAI,
            subchanBtoI: subchanBI,
            nonce: 0
          }
          // generate sigs of AB_VC0
          hash = Connext.createVCStateUpdateFingerprint(AB_VC0)
          sigA_AB_VC0 = await web3.eth.sign(hash, partyA)
          sigB_AB_VC0 = await web3.eth.sign(hash, partyB)

          // generate lc1
          let elems = []
          elems.push(AB_VC0)
          AI_LC1 = {
            isClose: false,
            channelId: '0x1c207f0960266a06fb5ce2e9d7b990b6489ca37c0f61c4afc34699fe42e96395',
            state: 1,
            nonce: 1,
            openVcs: 1,
            vcRootHash: Connext.generateVcRootHash({ vc0s: elems }),
            partyA,
            partyI: ingridAddress,
            balanceA: Web3.utils.toBN('0'),
            balanceI: initialDeposit
          }
          // generate sigs
          hash = Connext.createLCStateUpdateFingerprint(AI_LC1)
          sigA_AI_LC1 = web3.eth.sign(hash, partyA)
          sigI_AI_LC1 = web3.eth.sign(hash, ingridAddress)

          BI_LC1 = {
            isClose: false,
            channelId: subchanBI,
            state: 1,
            nonce: 1,
            openVcs: 1,
            vcRootHash: Connext.generateVcRootHash({ vc0s: elems }),
            partyA: partyB,
            partyI: ingridAddress,
            balanceA: Web3.utils.toBN('0'),
            balanceI: Web3.utils.toBN('0')
          }
          // generate sigs of BI_LC1
          hash = Connext.createLCStateUpdateFingerprint(BI_LC1)
          sigB_BI_LC1 = web3.eth.sign(hash, partyB)
          sigI_BI_LC1 = web3.eth.sign(hash, ingridAddress)

          // generate final vc state
          AB_VCN = {
            state: 1,
            balanceA: Web3.utils.toBN('0'),
            balanceB: initialDeposit,
            channelId: vcId,
            partyA: partyA,
            partyB: partyB,
            partyI: ingridAddress,
            subchanAtoI: subchanAI,
            subchanBtoI: subchanBI,
            nonce: 1
          }
          // generate sigs of AB_VCN
          hash = Connext.createVCStateUpdateFingerprint(AB_VCN)
          sigA_AB_VCN = web3.eth.sign(hash, partyA)
          sigB_AB_VCN = web3.eth.sign(hash, partyB)

          // generate lc2
          AI_LC2 = {
            isClose: false,
            channelId: subchanAI,
            state: 1,
            nonce: 2,
            openVcs: 0,
            vcRootHash: emptyRootHash,
            partyA,
            partyI: ingridAddress,
            balanceA: Web3.utils.toBN('0'),
            balanceI: Web3.utils.toBN('0')
          }
          // generate sigs
          hash = Connext.createLCStateUpdateFingerprint(AI_LC2)
          sigA_AI_LC2 = web3.eth.sign(hash, partyA)
          sigI_AI_LC2 = web3.eth.sign(hash, ingridAddress)

          BI_LC2 = {
            isClose: false,
            channelId: subchanBI,
            state: 1,
            nonce: 2,
            openVcs: 0,
            vcRootHash: emptyRootHash,
            partyA: partyB,
            partyI: ingridAddress,
            balanceA: initialDeposit,
            balanceI: Web3.utils.toBN('0')
          }
          // generate sigs of BI_LC1
          hash = Connext.createLCStateUpdateFingerprint(BI_LC2)
          sigB_BI_LC2 = web3.eth.sign(hash, partyB)
          sigI_BI_LC2 = web3.eth.sign(hash, ingridAddress)

          assert.ok(partyA == AB_VC0.partyA)
        }
      )

      it.only(
        'should create a connext client with real web3 and channel manager',
        async () => {
          client = new Connext({
            web3,
            ingridAddress,
            watcherUrl,
            ingridUrl,
            contractAddress,
            hubAuth
          })
          assert.ok(
            client.ingridAddress === ingridAddress.toLowerCase() &&
              client.ingridUrl === ingridUrl &&
              client.watcherUrl === watcherUrl
          )
        }
      )
    })
  })

  describe('happy case functionality', () => {
    describe('creating subchans', () => {
      // register function hardcodes from accounts[0]
      // to accurately test, must open channels directly with contract
      describe('using register on client and timeouts for subchans', () => {
        it(
          'should return an lcID created on the contract with partyA by calling register()',
          async () => {
            subchanAI = await client.register(initialDeposit, partyA)
            console.log('subchanAI:', subchanAI)
            assert.ok(Web3.utils.isHexStrict(subchanAI))
          }
        ).timeout(5000)

        it(
          'should return an lcID created on the contract with partyB by calling register()',
          async () => {
            subchanBI = await client.register(initialDeposit, partyB)
            console.log('subchanBI:', subchanBI)
            assert.ok(Web3.utils.isHexStrict(subchanBI))
          }
        ).timeout(5000)

        it('should request hub joins subchanAI', async () => {
          // response = await Promise.all([client.requestJoinLc(subchanAI), timeout(22000)])
          subchanAI =
            '0x8552b85f535a0444c23d01c6d4f4512a34980bafc82f6459617bdfe42ef188e2'
          response = await client.requestJoinLc(subchanAI)
          console.log(response)
          //   assert.equal(response.txHash, ':)')
          assert.ok(Web3.utils.isHex(response[0]))
        }).timeout(30000)

        it('should request hub joins subchanBI', async () => {
          // response = await Promise.all([
          //   client.requestJoinLc(subchanBI),
          //   timeout(17000)
          // ])
          subchanBI =
            '0x3bd0fa4e546a746b4c8aed8ce8462a27cdcfdb703b5c372d9a963001de0894e1'
          response = await client.requestJoinLc(subchanBI)
          console.log(response)
          //   assert.equal(response.txHash, ':)')
          assert.ok(Web3.utils.isHex(response[0]))
        }).timeout(22000)
      })

      describe('calling functions on contract', () => {
        it('should generate a unique id for subchanAI', () => {
          // accounts[0] is hardcoded into the client
          // create subchanAI with contract functions directly
          subchanAI = Connext.getNewChannelId()
          console.log('subchanAI:', subchanAI)
          assert.ok(Web3.utils.isHexStrict(subchanAI))
        })

        it('should create subchanAI on channel manager instance', async () => {
          // hardcode contract call, accounts[0] is encoded in client
          response = await client.channelManagerInstance.methods
            .createChannel(subchanAI, ingridAddress, 3600)
            .send({ from: partyA, value: initialDeposit, gas: 3000000 })
          assert.ok(Web3.utils.isHex(response.transactionHash))
        }).timeout(7000)

        it('should generate a unique id for subchanBI', () => {
          // accounts[0] is hardcoded into the client
          // create subchanBI with contract functions directly
          subchanBI = Connext.getNewChannelId()
          console.log('subchanBI:', subchanBI)
          assert.ok(Web3.utils.isHexStrict(subchanBI))
          // assert.equal(subchanBI, ';)')
        })

        it('should create subchanBI on channel manager instance', async () => {
          // hardcode contract call, accounts[0] is encoded in client
          response = await client.channelManagerInstance.methods
            .createChannel(subchanBI, ingridAddress, 3600)
            .send({ from: partyB, value: initialDeposit, gas: 3000000 })
          assert.ok(Web3.utils.isHex(response.transactionHash))
          //   assert.equal(response.transactionHash, ';)')
        }).timeout(7000)

        it('should request hub joins subchanBI', async () => {
          response = await Promise.all([
            client.requestJoinLc(subchanBI),
            timeout(15000)
          ])
          // subchanBI =
          //   '0x44e87f5ecdd91e71b6d469f721757a3f5d9a46b956481f4ac7891ec610083f28'
          response = await client.requestJoinLc(subchanBI)
          console.log(response)
          //   assert.equal(response.txHash, ':)')
          assert.ok(Web3.utils.isHex(response))
        }).timeout(20000)

        it(
          'should force ingrid to join both subchans by calling it on contract',
          async () => {
            // subchanBI = '0x8ce06cca33db99c97c0512c58f689b5f014825e6a58f737a89603a18e1a849cd'
            // subchanAI = '0x3645c3e832e564b97d9bcb72fdf72aecc9160087d09dc709046499123a7fc9eb'
            let responseAI = await client.channelManagerInstance.methods
              .joinChannel(subchanAI)
              .send({
                from: ingridAddress,
                value: initialDeposit,
                gas: 4700000
              })

            let responseBI = await client.channelManagerInstance.methods
              .joinChannel(subchanBI)
              .send({
                from: ingridAddress,
                value: initialDeposit,
                gas: 4700000
              })
            // assert.equal(responseAI.transactionHash, ';)')
            assert.ok(
              Web3.utils.isHex(responseAI.transactionHash) &&
                Web3.utils.isHex(responseBI.transactionHash)
            )
          }
        ).timeout(10000)
      })
    })

    describe('creating a virtual channel between partyA and partyB', () => {
      // TO DO: FIX, works in postman ??
      it('should request that ingrid deposits 5 ETH in subchan', async () => {
        let subchan =
          '0x3bd0fa4e546a746b4c8aed8ce8462a27cdcfdb703b5c372d9a963001de0894e1'
        let deposit = Web3.utils.toBN(Web3.utils.toWei('4', 'ether'))
        response = await client.requestIngridDeposit({
          lcId: subchan,
          deposit: deposit
        })
        assert.ok(Web3.utils.isHex(response))
      }).timeout(5000)

      it(
        'partyA should create a virtual channel with 5 eth in it',
        async () => {
          vcId = await client.openChannel({ to: partyB, sender: partyA })
          assert.ok(Web3.utils.isHexStrict(vcId))
        }
      )

      it('partyB should join the virtual channel with 0 eth', async () => {
        // vcId =
        //   '0xfb6d4d7b6050d2e71102aa9015d65cebd8d2b69d23e99898c92c38db1d803687'
        response = await client.joinChannel(vcId, partyB)
        assert.equal(response, vcId)
      })
    })

    describe('updating state in and closing a virtual channel between partyA and partyB', () => {
      it(
        'partyA sends a state update in the virtual channel of 1 eth',
        async () => {
          // vcId =
          //   '0xfb6d4d7b6050d2e71102aa9015d65cebd8d2b69d23e99898c92c38db1d803687'
          balanceA = Web3.utils.toBN(Web3.utils.toWei('4', 'ether'))
          balanceB = Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
          response = await client.updateBalance({
            channelId: vcId,
            balanceA,
            balanceB
          })
          console.log(response)
          assert.ok(
            Web3.utils.toBN(response.balanceA).eq(balanceA) &&
              Web3.utils.toBN(response.balanceB).eq(balanceB)
          )
        }
      )

      it('should fast close the virtual channel', async () => {
        // vcId =
        //   '0xfb6d4d7b6050d2e71102aa9015d65cebd8d2b69d23e99898c92c38db1d803687'
        response = await client.closeChannel(vcId)
        console.log(response)
        assert.ok(Web3.utils.isHex(response))
      })
    })

    describe('withdraw from ledger channel', () => {
      it.only(
        'should withdraw all funds from the ledger channel for partyA',
        async () => {
          response = await client.withdraw(partyB)
          console.log(response)
          assert.ok(Web3.utils.isHex(response.transactionHash))
        }
      ).timeout(5000)
    })
  })

  describe('dispute functions', () => {
    describe('withdrawFinal', () => {
      // init web3
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3, ingridAddress, ingridUrl }, Web3)
      describe('Web3 and contract properly initialized, valid parameters', () => {
        it('should call withdrawFinal on lc that has been settled on chain', async () => {
          // TO DO: update test
        })
      })
    })

    describe('byzantineCloseVc', () => {
      // init web3
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3, ingridAddress, ingridUrl }, Web3)
      describe('Web3 and contract properly initialized, valid parameters', () => {
        it('should call byzantineCloseVc which calls initVC and settleVC on contract', async () => {
          // TO DO:
          // update dispute test with networking layer
          // const accounts = await client.web3.eth.getAccounts()
          // partyA = accounts[0]
          // partyB = accounts[1]
          // ingridAddress = client.ingridAddress = accounts[2]
          // const vcId = '0xc025e912181796cf8c15c86558ad580b6ab4a6779c0965d70ba25dc6509a0e13'
          // const subchanAIId = '0x73507f1b3aba85ff6794f4d27fa8e4cbf6daf294c09912c4856428e1e1b2c610'
          // const subchanBIId = '0x129ef8385463750d5557c11ee3a2acbb935e1702d342f287aaa0123bfa82a707'
          // // initial state
          // let state = {
          //   channelId: vcId,
          //   subchanAI: subchanAIId,
          //   subchanBI: subchanBIId,
          //   nonce: 0,
          //   partyA,
          //   partyB,
          //   balanceA: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
          //   balanceB: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
          // }
          // const hash0 = Connext.createVCStateUpdateFingerprint(state)
          // const sigA0 = await client.web3.eth.sign(hash0, accounts[0])
          // const sigB0 = await client.web3.eth.sign(hash0, accounts[1])
          // // state 1
          // state.nonce = 1
          // state.balanceA = Web3.utils.toBN(Web3.utils.toWei('4', 'ether'))
          // state.balanceB = Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
          // const hash1 = Connext.createVCStateUpdateFingerprint(state)
          // const sigA1 = await client.web3.eth.sign(hash1, accounts[0])
          // const sigB1 = await client.web3.eth.sign(hash1, accounts[1])
          // const response = await client.byzantineCloseVc(vcId)
          // assert.ok(Web3.utils.isHexStrict(response.transactionHash))
        })
      })
    })

    describe('closeChannel', () => {
      // init web3
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3, ingridAddress, ingridUrl }, Web3)
      describe('Valid parameters and correct web3', () => {
        it('should call closeChannel on given channelId, decomposing into state updates', async () => {
          // TO DO: update for dispute case with networking layer
          // // parameters
          // const accounts = await client.web3.eth.getAccounts()
          // partyA = accounts[0]
          // partyB = accounts[1]
          // ingridAddress = client.ingridAddress = accounts[2]
          // const vcId = '0xc025e912181796cf8c15c86558ad580b6ab4a6779c0965d70ba25dc6509a0e13'
          // const response = await client.closeChannel(vcId)
          // assert.equal(response, ':)')
        })
      })
    })

    describe('closeChannels', () => {
      // init web3
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3, ingridAddress, ingridUrl }, Web3)
      describe('Valid parameters and correct web3', () => {
        it('should call closeChannels, which calls closeChannel on an array of channelIds', () => {
          // TO DO: update for dispute case with networking layer
        })
      })
    })
  })

  describe('client contract handlers', () => {
    describe('createLedgerChannelContractHandler', () => {
      describe('Web3 and contract properly initialized, valid parameters', () => {
        it(
          'should call createChannel on the channel manager instance (subchanAI)',
          async () => {
            balanceA = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
            subchanAI =
              '0x4b7c97c3ae6abca2ff2ba4e31ee594ac5e1b1f12d8fd2097211569f80dbb7d08'
            response = await client.createLedgerChannelContractHandler({
              ingridAddress,
              lcId: subchanAI,
              initialDeposit: balanceA,
              challenge: 5,
              sender: partyA
            })
            assert.ok(Web3.utils.isHexStrict(response.transactionHash))
          }
        ).timeout(5000)

        it(
          'should call createChannel on the channel manager instance (subchanBI)',
          async () => {
            balanceB = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
            subchanBI = Connext.getNewChannelId()
            console.log('subchanBI:', subchanBI)
            response = await client.createLedgerChannelContractHandler({
              ingridAddress,
              lcId: subchanBI,
              initialDeposit: balanceB,
              challenge: 5,
              sender: partyB
            })
            assert.ok(Web3.utils.isHexStrict(response.transactionHash))
          }
        ).timeout(5000)
      })
    })

    describe('LCOpenTimeoutContractHandler', () => {
      // init web3
      describe('Web3 and contract properly initialized, valid parameters', () => {
        it(
          'should call createChannel on the channel manager instance to create channel to delete',
          async () => {
            const accounts = await client.web3.eth.getAccounts()
            ingridAddress = accounts[2]
            const balanceA = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
            const lcId =
              '0xa6585504ea64ee76da1238482f08f6918e7a5e1c77418f6072af19530940cc04' // add lcid to obj
            const response = await client.createLedgerChannelContractHandler({
              ingridAddress,
              lcId: lcId,
              initialDeposit: balanceA
            })
            assert.ok(Web3.utils.isHexStrict(response.transactionHash))
          }
        ).timeout(5000)

        it(
          'should call LCOpenTimeout on the channel manager instance to delete created channel',
          async () => {
            const lcId =
              '0xa6585504ea64ee76da1238482f08f6918e7a5e1c77418f6072af19530940cc04'
            const results = await client.LCOpenTimeoutContractHandler(lcId)
            assert.ok(Web3.utils.isHexStrict(results.transactionHash))
          }
        ).timeout(5000)

        it('should throw an error if it is not in correct time', async () => {
          let lcId =
            '0x7741dd7b46f5892d0cf61e47854f539003f068b883f273cd680d061da87f7c7f'
          try {
            response = await client.LCOpenTimeoutContractHandler(lcId)
          } catch (e) {
            assert.equal(e.message, 'Channel challenge period still active')
          }
        })

        it('should throw an error channel is in incorrect state', async () => {
          let lcId =
            '0x0b92647ba6be3e07b2c07218262ec2a55a093636cac5fdfe98da64da67db370b'
          try {
            response = await client.LCOpenTimeoutContractHandler(lcId)
          } catch (e) {
            assert.equal(
              e.message,
              '[300: LCOpenTimeoutContractHandler] Channel is in incorrect state'
            )
          }
        })

        it('should throw an error if sender is not partyA', async () => {
          let lcId =
            '0x7741dd7b46f5892d0cf61e47854f539003f068b883f273cd680d061da87f7c7f'
          try {
            response = await client.LCOpenTimeoutContractHandler(
              lcId,
              accounts[5]
            )
          } catch (e) {
            assert.equal(
              e.message,
              '[300: LCOpenTimeoutContractHandler] Caller must be partyA in ledger channel'
            )
          }
        })
      })
    })

    describe('joinLedgerChannelContractHandler', () => {
      describe('Web3 and contract properly initialized, valid parameters', async () => {
        it(
          'should call joinChannel on the channel manager instance (subchanAI)',
          async () => {
            balanceI = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
            const params = {
              lcId: subchanAI, // subchan AI ID,
              deposit: balanceI,
              sender: ingridAddress
            }
            const response = await client.joinLedgerChannelContractHandler(
              params
            )
            assert.ok(
              response.transactionHash !== null &&
                response.transactionHash !== undefined
            )
          }
        ).timeout(5000)
        it(
          'should call joinChannel on the channel manager instance (subchanBI)',
          async () => {
            const params = {
              lcId: subchanBI, // subchan AI ID,
              deposit: balanceI,
              sender: ingridAddress
            }
            const response = await client.joinLedgerChannelContractHandler(
              params
            )
            assert.ok(
              response.transactionHash !== null &&
                response.transactionHash !== undefined
            )
          }
        ).timeout(5000)
      })
    })

    describe('depositContractHandler', () => {
      describe('Web3 and contract properly initialized, valid parameters', async () => {
        it('should call deposit on the channel manager instance', async () => {
          subchanBI =
            '0xa69d5a26f6af375255adee27279434ec275111a504088858c438192c69fd958b'
          response = await client.depositContractHandler({
            lcId: subchanBI,
            depositInWei: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
            recipient: ingridAddress,
            sender: ingridAddress
          })
          assert.ok(
            response.transactionHash !== null &&
              response.transactionHash !== undefined
          )
        })
      })
    })

    describe('updateLcStateContractHandler', () => {
      let sigAtoI
      describe('Web3 and contract properly initialized, valid parameters', async () => {
        it('should call updateLcState on the channel manager instance with no open VCs', async () => {
          subchanAI =
            '0x4b7c97c3ae6abca2ff2ba4e31ee594ac5e1b1f12d8fd2097211569f80dbb7d08'
          const params = {
            isClose: false,
            lcId: subchanAI,
            nonce: 1,
            openVCs: 0,
            vcRootHash: emptyRootHash,
            partyA: partyA,
            partyI: ingridAddress,
            balanceA: Web3.utils.toBN(Web3.utils.toWei('4', 'ether')),
            balanceI: Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
          }
          const hashI = await Connext.createLCStateUpdateFingerprint(params)
          params.unlockedAccountPresent = true
          params.sigA = await client.createLCStateUpdate(params)
          params.sigI = await client.web3.eth.sign(hashI, accounts[2])
          console.log('PARAMS:', params)
          console.log('hashI:', hashI)
          // console.log('sigI:', paramssigI)
          // console.log('sigA:', sigA)

          const response = await client.updateLcStateContractHandler(params)
          assert.ok(
            response.transactionHash !== null &&
              response.transactionHash !== undefined
          )
        })
        it(
          'should call updateLcState on the channel manager instance open VCs',
          async () => {
            subchanAI =
              '0x4b7c97c3ae6abca2ff2ba4e31ee594ac5e1b1f12d8fd2097211569f80dbb7d08'
            vcId = '0xc12'
            const vc0 = {
              isClose: false,
              vcId: vcId,
              nonce: 0,
              partyA: partyA,
              partyB: partyB,
              balanceA: Web3.utils.toBN(Web3.utils.toWei('1', 'ether')),
              balanceB: Web3.utils.toBN(Web3.utils.toWei('0', 'ether'))
            }
            let vc0s = []
            vc0s.push(vc0)
            const vcRootHash1 = Connext.generateVcRootHash({ vc0s })
            let lc1 = {
              isClose: false,
              lcId: subchanAI,
              nonce: 1,
              openVcs: 1,
              vcRootHash: vcRootHash1,
              partyA: partyA,
              partyI: ingridAddress,
              balanceA: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
              balanceI: Web3.utils.toBN(Web3.utils.toWei('4', 'ether')),
              signer: partyA
            }
            const sigA = await client.createLCStateUpdate(lc1)
            lc1.signer = ingridAddress
            const sigI = await client.createLCStateUpdate(lc1)
            lc1.sigA = sigA
            lc1.sigI = sigI
            lc1.sender = partyA
            const response = await client.updateLcStateContractHandler(lc1)
            assert.ok(
              response.transactionHash !== null &&
                response.transactionHash !== undefined
            )
          }
        ).timeout(5000)
      })
    })

    describe('consensusCloseChannelContractHandler', () => {
      describe('Web3 and contract properly initialized, valid parameters', async () => {
        it(
          'should call consensusCloseChannel on the channel manager instance',
          async () => {
            subchanBI =
              '0x942e8cf213d0bd51c0ba316869d6b3b1eee9060b8d5973e75060c94013fee4bd'
            let params = {
              isClose: true,
              lcId: subchanBI,
              nonce: 1,
              openVcs: 0,
              vcRootHash: emptyRootHash,
              partyA: partyB,
              partyI: ingridAddress,
              balanceA: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
              balanceI: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
              signer: partyB
            }
            const sigB = await client.createLCStateUpdate(params)
            params.signer = ingridAddress
            const sigI = await client.createLCStateUpdate(params)
            console.log('params:', params)
            console.log('sigI:', sigI)
            console.log('sigB:', sigB)

            const result = await client.consensusCloseChannelContractHandler({
              lcId: params.lcId,
              nonce: params.nonce,
              balanceA: params.balanceA,
              balanceI: params.balanceI,
              sigA: sigB,
              sigI: sigI
            })
            assert.ok(
              result.transactionHash !== null &&
                result.transactionHash !== undefined
            )
          }
        ).timeout(5000)
      })
    })

    describe('initVcStateContractHandler', () => {
      describe('real Web3 and valid parameters', () => {
        let proof, vc0
        balanceA = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
        balanceI = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
        it('should generate a proof to submit to chain', async () => {
          vc0 = {
            channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
            nonce: 0,
            partyA,
            partyB,
            balanceA: Web3.utils.toBN(Web3.utils.toWei('2', 'ether')),
            balanceB: Web3.utils.toBN(Web3.utils.toWei('0', 'ether'))
          }
          const stateHash = Connext.createVCStateUpdateFingerprint(vc0)
          let vc0s = []
          vc0s.push(vc0)

          let merkle = Connext.generateMerkleTree(vc0s)
          let mproof = merkle.proof(Utils.hexToBuffer(stateHash))

          let proof = []
          for (var i = 0; i < mproof.length; i++) {
            proof.push(Utils.bufferToHex(mproof[i]))
          }

          proof.unshift(stateHash)

          proof = Utils.marshallState(proof)
          // console.log(proof)
        })

        it('should init a virtual channel state on chain', async () => {
          const sigA = await client.createVCStateUpdate({
            vcId: '0x1000000000000000000000000000000000000000000000000000000000000000',
            nonce: 0,
            partyA,
            partyB,
            balanceA: Web3.utils.toBN(Web3.utils.toWei('2', 'ether')),
            balanceB: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
            signer: partyA
          })

          // client call
          const results = await client.initVcStateContractHandler({
            subchanId: subchanAI,
            vcId: '0x1000000000000000000000000000000000000000000000000000000000000000',
            // proof: proof,
            nonce: 0,
            partyA,
            partyB,
            balanceA: Web3.utils.toBN(Web3.utils.toWei('2', 'ether')),
            balanceB: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
            sigA,
            sender: partyA
          })
          assert.ok(
            results.transactionHash !== null &&
              results.transactionHash !== undefined
          )
        }).timeout(5000)
      })
    })

    describe('settleVcContractHandler', () => {
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3 }, Web3)
      describe('real Web3 and valid parameters', () => {
        it('should settle a vc state on chain', async () => {
          // get accounts
          const accounts = await client.web3.eth.getAccounts()
          const subchanId =
            '0x4b7c97c3ae6abca2ff2ba4e31ee594ac5e1b1f12d8fd2097211569f80dbb7d08'
          partyA = accounts[0]
          partyB = accounts[1]
          ingridAddress = client.ingridAddress = accounts[2]
          const vcId =
            '0x6c08ce0d3bcacaf067e75801c2e8aa5a29dd19a20ba773a2918d73765e255941'
          console.log(vcId)
          const nonce = 2
          const balanceA = Web3.utils.toBN(Web3.utils.toWei('0', 'ether'))
          const balanceB = Web3.utils.toBN(Web3.utils.toWei('2', 'ether'))

          // generate sigA
          const hash = Connext.createVCStateUpdateFingerprint({
            vcId,
            nonce,
            partyA,
            partyB,
            balanceA,
            balanceB
          })
          const sigA = await client.web3.eth.sign(hash, accounts[0])
          console.log('hash:', hash)
          console.log('sigA:', sigA)

          // client call
          const results = await client.settleVcContractHandler({
            subchan: subchanId,
            vcId,
            nonce,
            partyA,
            partyB,
            balanceA,
            balanceB,
            sigA
          })
          assert.ok(
            results.transactionHash !== null &&
              results.transactionHash !== undefined
          )
        })
      })
    })

    describe('closeVirtualChannelContractHandler', () => {
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3 }, Web3)
      describe('real Web3 and valid parameters', () => {
        it('should settle a vc state on chain', async () => {
          // get accounts
          const subchanId =
            '0x4b7c97c3ae6abca2ff2ba4e31ee594ac5e1b1f12d8fd2097211569f80dbb7d08'
          const vcId =
            '0x6c08ce0d3bcacaf067e75801c2e8aa5a29dd19a20ba773a2918d73765e255941'
          // client call
          const results = await client.closeVirtualChannelContractHandler({
            lcId: subchanId,
            vcId
          })
          // assert.equal(results, ':)')
          assert.ok(
            results.transactionHash !== null &&
              results.transactionHash !== undefined
          )
        })
      })
    })

    describe('byzantineCloseChannelContractHandler', () => {
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3 }, Web3)
      describe('real Web3 and valid parameters', () => {
        it('should settle a vc state on chain', async () => {
          // get accounts
          const lcId =
            '0x4b7c97c3ae6abca2ff2ba4e31ee594ac5e1b1f12d8fd2097211569f80dbb7d08'
          // client call
          const results = await client.byzantineCloseChannelContractHandler(
            lcId
          )
          assert.ok(
            results.transactionHash !== null &&
              results.transactionHash !== undefined
          )
        })
      })
    })
  })

  describe('client signature and recover functions', () => {
    describe('createLCStateUpdate', () => {
      describe('createLCStateUpdate with real web3.utils and valid params', () => {
        it('should create a valid signature.', async () => {
          AI_LC0.signer = partyA
          const sig = await client.createLCStateUpdate(AI_LC0)
          assert.equal(sig, sigA_AI_LC0)
        })
      })
    })

    describe('recoverSignerFromLCStateUpdate', () => {
      describe('recoverSignerFromLCStateUpdate with real web3.utils and valid params', async () => {
        describe('should recover the address of person who signed', () => {
          it('should return signer == accounts[1]', async () => {
            AI_LC0.sig = sigA_AI_LC0
            AI_LC0.unlockedAccountPresent = true
            const signer = Connext.recoverSignerFromLCStateUpdate(AI_LC0)
            assert.equal(signer, partyA.toLowerCase())
          })
        })
      })
    })

    describe('createVCStateUpdate', () => {
      describe('createVCStateUpdate with real web3.utils and valid params', () => {
        it('should return a valid signature.', async () => {
          AB_VC0.signer = partyA
          const sig = client.createVCStateUpdate(AB_VC0)
          assert.equal(sig, sigA_AB_VC0)
        })
      })
    })

    describe('recoverSignerFromVCStateUpdate', () => {
      describe('recoverSignerFromVCStateUpdate with real web3.utils and valid params', async () => {
        describe('should recover the address of person who signed', () => {
          it('should return signer == accounts[1]', async () => {
            AB_VC0.sig = sigA_AB_VC0
            AB_VC0.unlockedAccountPresent = true
            const signer = Connext.recoverSignerFromVCStateUpdate(AB_VC0)
            assert.equal(signer, partyA.toLowerCase())
          })
        })
      })

      describe('validators', () => {
        it('does throw an error when param is null', async () => {
          try {
            Connext.recoverSignerFromVCStateUpdate({
              sig: '0xc1912',
              channelId: '0xc1912',
              nonce: 100,
              partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              subchanAI: '0xc1912',
              subchanBI: '0xc1912',
              balanceA: Web3.utils.toBN('100'),
              balanceB: null
            })
          } catch (e) {
            assert.equal(
              e.message,
              `TypeError: Cannot read property 'toString' of null Given value: "null"`
            )
          }
        })
      })
      describe('recoverSignerFromVCStateUpdate', () => {
        describe('throws an error when validator fails', () => {
          describe('Null or undefined', () => {
            it('does throw an error when param is undefined', async () => {
              try {
                Connext.recoverSignerFromVCStateUpdate({
                  sig: '0xc1912',
                  channelId: '0xc1912',
                  nonce: 100,
                  partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                  partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                  partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                  subchanAI: '0xc1912',
                  subchanBI: '0xc1912',
                  balanceA: Web3.utils.toBN('0'),
                  balanceB: undefined
                })
              } catch (e) {
                assert.equal(
                  e.message,
                  `Error: [number-to-bn] while converting number undefined to BN.js instance, error: invalid number value. Value must be an integer, hex string, BN or BigNumber instance. Note, decimals are not supported. Given value: "undefined"`
                )
              }
            })
            it('does throw an error when param is null', async () => {
              try {
                Connext.recoverSignerFromVCStateUpdate({
                  sig: '0xc1912',
                  vcId: '0xc1912',
                  nonce: 100,
                  partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                  partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                  partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                  subchanAI: '0xc1912',
                  subchanBI: '0xc1912',
                  balanceA: Web3.utils.toBN('100'),
                  balanceB: null
                })
              } catch (e) {
                assert.equal(
                  e.message,
                  `TypeError: Cannot read property 'toString' of null Given value: "null"`
                )
              }
            })
          })

          describe('channelId', () => {
            it('throws an error when vcId is not a hex String', async () => {
              try {
                Connext.recoverSignerFromVCStateUpdate({
                  sig: '0xc1912',
                  channelId: 'bad VC ID',
                  balanceA: Web3.utils.toBN('0'),
                  balanceB: Web3.utils.toBN('0')
                })
              } catch (e) {
                assert.equal(
                  e.message,
                  `[recoverSignerFromVCStateUpdate][channelId] : bad VC ID is not hex string prefixed with 0x.`
                )
              }
            })
            it('does not throw a vcId error when vcId is a valid hex', async () => {
              try {
                Connext.recoverSignerFromVCStateUpdate({
                  sig: '0xc1912',
                  vcId: '0xc1912'
                })
              } catch (e) {
                assert.notEqual(
                  e.message,
                  `[recoverSignerFromVCStateUpdate][vcId] : bad VC ID is not hex string prefixed with 0x.'`
                )
              }
            })
          })
          describe('nonce', () => {
            it('does throw an error when nonce is not postive int', async () => {
              try {
                Connext.recoverSignerFromVCStateUpdate({
                  sig: '0xc1912',
                  vcId: '0xc1912',
                  nonce: '100aa',
                  balanceA: Web3.utils.toBN('0'),
                  balanceB: Web3.utils.toBN('0')
                })
              } catch (e) {
                assert.equal(
                  e.message,
                  `[recoverSignerFromVCStateUpdate][nonce] : 100aa is not a positive integer.`
                )
              }
            })
          })
          describe('partyA', () => {
            it('does throw an error when partyA is not an address', async () => {
              try {
                Connext.recoverSignerFromVCStateUpdate({
                  sig: '0xc1912',
                  vcId: '0xc1912',
                  nonce: 100,
                  partyA: 'its a party',
                  balanceA: Web3.utils.toBN('0'),
                  balanceB: Web3.utils.toBN('0')
                })
              } catch (e) {
                assert.equal(
                  e.message,
                  `[recoverSignerFromVCStateUpdate][partyA] : its a party is not address.`
                )
              }
            })
          })
          describe('partyB', () => {
            it('does throw an error when partyB is not an address', async () => {
              try {
                Connext.recoverSignerFromVCStateUpdate({
                  sig: '0xc1912',
                  vcId: '0xc1912',
                  nonce: 100,
                  partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                  partyB: 'cardi B party B',
                  balanceA: Web3.utils.toBN('0'),
                  balanceB: Web3.utils.toBN('0')
                })
              } catch (e) {
                assert.equal(
                  e.message,
                  `[recoverSignerFromVCStateUpdate][partyB] : cardi B party B is not address.`
                )
              }
            })
          })
          // describe('subchanAI', () => {
          //   it('does throw an error when subchanAI is not a strict hex', async () => {
          //     try {
          //       Connext.recoverSignerFromVCStateUpdate({
          //         sig: '0xc1912',
          //         vcId: '0xc1912',
          //         nonce: 100,
          //         partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
          //         partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
          //         partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
          //         subchanAI: 'I am ai'
          //       })
          //     } catch (e) {
          //       assert.equal(
          //         e.message,
          //         `[recoverSignerFromVCStateUpdate][subchanAI] : I am ai is not hex string prefixed with 0x.`
          //       )
          //     }
          //   })
          // })
          // describe('subchanBI', () => {
          //   it('does throw an error when subchanBI is not a strict hex', async () => {
          //     try {
          //       Connext.recoverSignerFromVCStateUpdate({
          //         sig: '0xc1912',
          //         vcId: '0xc1912',
          //         nonce: 100,
          //         partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
          //         partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
          //         partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
          //         subchanAI: '0xc1912',
          //         subchanBI: 'invalid'
          //       })
          //     } catch (e) {
          //       assert.equal(
          //         e.message,
          //         `[recoverSignerFromVCStateUpdate][subchanBI] : invalid is not hex string prefixed with 0x.`
          //       )
          //     }
          //   })
          // })
          describe('balanceA', () => {
            it('does throw an error when balanceA is not BN', async () => {
              try {
                Connext.recoverSignerFromVCStateUpdate({
                  sig: '0xc1912',
                  vcId: '0xc1912',
                  nonce: 100,
                  partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                  partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                  partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                  subchanAI: '0xc1912',
                  subchanBI: '0xc1912',
                  balanceA: 'cow'
                })
              } catch (e) {
                assert.equal(
                  e.message,
                  `Error: [number-to-bn] while converting number "cow" to BN.js instance, error: invalid number value. Value must be an integer, hex string, BN or BigNumber instance. Note, decimals are not supported. Given value: "cow"`
                )
              }
            })
          })
          describe('balanceB', () => {
            it('does throw an error when balanceB is not BN', async () => {
              try {
                Connext.recoverSignerFromVCStateUpdate({
                  sig: '0xc1912',
                  vcId: '0xc1912',
                  nonce: 100,
                  partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                  partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                  partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                  subchanAI: '0xc1912',
                  subchanBI: '0xc1912',
                  balanceA: Web3.utils.toBN('100'),
                  balanceB: '7 cats'
                })
              } catch (e) {
                assert.equal(
                  e.message,
                  `Error: [number-to-bn] while converting number "7 cats" to BN.js instance, error: invalid number value. Value must be an integer, hex string, BN or BigNumber instance. Note, decimals are not supported. Given value: "7 cats"`
                )
              }
            })
          })
        })
      })
    })

    describe('createVCStateUpdateFingerprint', () => {
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3 }, Web3)
      describe('recoverSignerFromVCStateUpdate with real web3.utils and valid params', async () => {
        const accounts = await web3.eth.getAccounts()
        partyA = accounts[0]
        partyB = accounts[1]
        ingridAddress = accounts[2]
        describe('Should create a valid hash.', async () => {
          it('returns a hashed value', () => {
            const hash = Connext.createVCStateUpdateFingerprint({
              channelId: '0xc1912',
              nonce: 0,
              partyA: partyA,
              partyB: partyB,
              partyI: ingridAddress,
              subchanAI: '0xc1912',
              subchanBI: '0xc1912',
              balanceA: Web3.utils.toBN('0'),
              balanceB: Web3.utils.toBN('0')
            })
            assert.equal(true, web3.utils.isHexStrict(hash))
          })
        })
      })
      describe('throws an error when validator fails', () => {
        describe('Null or undefined', () => {
          it('does throw an error when param is undefined', async () => {
            try {
              Connext.createVCStateUpdateFingerprint({
                vcId: '0xc1912',
                nonce: 100,
                partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                subchanAI: '0xc1912',
                subchanBI: '0xc1912',
                balanceA: Web3.utils.toBN('0'),
                balanceB: undefined
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[createVCStateUpdateFingerprint][balanceB] : can\'t be blank,undefined is not BN.`
              )
            }
          })
          it('does throw an error when param is null', async () => {
            try {
              Connext.createVCStateUpdateFingerprint({
                vcId: '0xc1912',
                nonce: 100,
                partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                subchanAI: '0xc1912',
                subchanBI: '0xc1912',
                balanceA: Web3.utils.toBN('100'),
                balanceB: null
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[createVCStateUpdateFingerprint][balanceB] : can\'t be blank,null is not BN.`
              )
            }
          })
        })

        describe('vcId', () => {
          it('throws an error when vcId is not a hex String', async () => {
            try {
              Connext.createVCStateUpdateFingerprint({ vcId: 'bad VC ID' })
            } catch (e) {
              assert.equal(
                e.message,
                `[createVCStateUpdateFingerprint][vcId] : bad VC ID is not hex string prefixed with 0x.`
              )
            }
          })
          it('does not throw a vcId error when vcId is a valid hex', async () => {
            try {
              Connext.createVCStateUpdateFingerprint({ vcId: '0xc1912' })
            } catch (e) {
              assert.notEqual(
                e.message,
                `[createVCStateUpdateFingerprint][vcId] : bad VC ID is not hex string prefixed with 0x.'`
              )
            }
          })
        })
        describe('nonce', () => {
          it('does throw an error when nonce is not postive int', async () => {
            try {
              Connext.createVCStateUpdateFingerprint({
                vcId: '0xc1912',
                nonce: '100aa'
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[createVCStateUpdateFingerprint][nonce] : 100aa is not a positive integer.`
              )
            }
          })
        })
        describe('partyA', () => {
          it('does throw an error when partyA is not an address', async () => {
            try {
              Connext.createVCStateUpdateFingerprint({
                vcId: '0xc1912',
                nonce: 100,
                partyA: 'its a party'
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[createVCStateUpdateFingerprint][partyA] : its a party is not address.`
              )
            }
          })
        })
        describe('partyB', () => {
          it('does throw an error when partyB is not an address', async () => {
            try {
              Connext.createVCStateUpdateFingerprint({
                vcId: '0xc1912',
                nonce: 100,
                partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyB: 'cardi B party B'
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[createVCStateUpdateFingerprint][partyB] : cardi B party B is not address.`
              )
            }
          })
        })
        describe('partyI', () => {
          it('does throw an error when partyI is not an address', async () => {
            try {
              Connext.createVCStateUpdateFingerprint({
                vcId: '0xc1912',
                nonce: 100,
                partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyI: 'cardi I party i'
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[createVCStateUpdateFingerprint][partyI] : cardi I party i is not address.`
              )
            }
          })
        })
        // describe('subchanAI', () => {
        //   it('does throw an error when subchanAI is not a strict hex', async () => {
        //     try {
        //       Connext.createVCStateUpdateFingerprint({
        //         vcId: '0xc1912',
        //         nonce: 100,
        //         partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
        //         partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
        //         partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
        //         subchanAI: 'I am ai'
        //       })
        //     } catch (e) {
        //       assert.equal(
        //         e.message,
        //         `[createVCStateUpdateFingerprint][subchanAI] : I am ai is not hex string prefixed with 0x.`
        //       )
        //     }
        //   })
        // })
        // describe('subchanBI', () => {
        //   it('does throw an error when subchanBI is not a strict hex', async () => {
        //     try {
        //       Connext.createVCStateUpdateFingerprint({
        //         vcId: '0xc1912',
        //         nonce: 100,
        //         partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
        //         partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
        //         partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
        //         subchanAI: '0xc1912',
        //         subchanBI: 'invalid'
        //       })
        //     } catch (e) {
        //       assert.equal(
        //         e.message,
        //         `[createVCStateUpdateFingerprint][subchanBI] : invalid is not hex string prefixed with 0x.`
        //       )
        //     }
        //   })
        // })
        describe('balanceA', () => {
          it('does throw an error when subchanBI is not a strict hex', async () => {
            try {
              Connext.createVCStateUpdateFingerprint({
                vcId: '0xc1912',
                nonce: 100,
                partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                subchanAI: '0xc1912',
                subchanBI: '0xc1912',
                balanceA: 'cow'
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[createVCStateUpdateFingerprint][balanceA] : cow is not BN.`
              )
            }
          })
        })
        describe('balanceB', () => {
          it('does throw an error when subchanBI is not a strict hex', async () => {
            try {
              Connext.createVCStateUpdateFingerprint({
                vcId: '0xc1912',
                nonce: 100,
                partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                subchanAI: '0xc1912',
                subchanBI: '0xc1912',
                balanceA: Web3.utils.toBN('100'),
                balanceB: '7 cats'
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[createVCStateUpdateFingerprint][balanceB] : 7 cats is not BN.`
              )
            }
          })
        })
      })
    })

    describe('generateVcRootHash', () => {
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3 }, Web3)
      describe('generateVCRootHash with real web3.utils and valid params', () => {
        it('should create an empty 32 byte buffer vcRootHash when no VCs are provided', () => {
          const vc0s = []
          const vcRootHash = Connext.generateVcRootHash({ vc0s })
          assert.equal('0x0', vcRootHash)
        })

        it('should create a vcRootHash containing vcs', async () => {
          const accounts = await client.web3.eth.getAccounts()
          partyA = accounts[0]
          partyB = accounts[1]
          ingridAddress = accounts[2]
          const vc0 = {
            vcId: '0x1',
            nonce: 0,
            partyA: partyA,
            partyB: partyB,
            partyI: ingridAddress,
            balanceA: Web3.utils.toBN(1000),
            balanceB: Web3.utils.toBN(0)
          }
          const vc1 = {
            vcId: '0x2',
            nonce: 0,
            partyA: partyA,
            partyB: partyB,
            partyI: ingridAddress,
            balanceA: Web3.utils.toBN(1000),
            balanceB: Web3.utils.toBN(0)
          }
          const vc0s = []
          vc0s.push(vc0)
          vc0s.push(vc1)
          const vcRootHash = Connext.generateVcRootHash({ vc0s })
          assert.equal(
            '0xbc8a7623f3fd4779a4510b266265248fc8dfbc1a28988c9d8284a87419b2643c',
            vcRootHash
          )
        })
      })
    })
  })

  describe('validatorsResponseToError', () => {
    it('return the method name var name and validator error', async () => {
      try {
        Connext.validatorsResponseToError(
          ['value is not hex'],
          'methodName',
          'testVar'
        )
      } catch (e) {
        assert.equal(e.message, '[methodName][testVar] : value is not hex')
      }
    })
  })
})

describe('ingridClientRequests: running local hub', () => {
  it('should init web3 and the connext client', async () => {
    // set party variables
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    accounts = await web3.eth.getAccounts()
    ingridAddress = accounts[0]
    partyA = accounts[1]
    partyB = accounts[2]
    client = new Connext({
      web3,
      ingridAddress,
      watcherUrl,
      ingridUrl,
      contractAddress,
      hubAuth
    })
    assert.ok(
      client.ingridAddress === ingridAddress.toLowerCase() &&
        client.ingridUrl === ingridUrl &&
        client.watcherUrl === watcherUrl
    )
  })

  describe('populate the database with an lc and a vc', () => {
    describe('generating LCs in database using contract calls', () => {
      it('should generate a unique id for subchanAI', () => {
        // accounts[0] is hardcoded into the client
        // create subchanAI with contract functions directly
        subchanAI = Connext.getNewChannelId()
        console.log('subchanAI:', subchanAI)
        assert.ok(Web3.utils.isHexStrict(subchanAI))
      })

      it('should create subchanAI on channel manager instance', async () => {
        // hardcode contract call, accounts[0] is encoded in client
        response = await client.channelManagerInstance.methods
          .createChannel(subchanAI, ingridAddress)
          .send({ from: partyA, value: initialDeposit, gas: 3000000 })
        assert.ok(Web3.utils.isHex(response.transactionHash))
      }).timeout(7000)

      it('should generate a unique id for subchanBI', () => {
        // accounts[0] is hardcoded into the client
        // create subchanBI with contract functions directly
        subchanBI = Connext.getNewChannelId()
        console.log('subchanBI:', subchanBI)
        assert.ok(Web3.utils.isHexStrict(subchanBI))
        // assert.equal(subchanBI, ';)')
      })

      it('should create subchanBI on channel manager instance', async () => {
        // hardcode contract call, accounts[0] is encoded in client
        response = await client.channelManagerInstance.methods
          .createChannel(subchanBI, ingridAddress)
          .send({ from: partyB, value: initialDeposit, gas: 3000000 })
        assert.ok(Web3.utils.isHex(response.transactionHash))
        //   assert.equal(response.transactionHash, ';)')
      }).timeout(7000)

      it(
        'should force ingrid to join subchanBI by calling it on contract',
        async () => {
          let responseBI = await client.channelManagerInstance.methods
            .joinChannel(subchanBI)
            .send({ from: ingridAddress, value: initialDeposit, gas: 3000000 })
          // assert.equal(responseAI.transactionHash, ';)')
          assert.ok(Web3.utils.isHex(responseBI.transactionHash))
        }
      ).timeout(10000)
    })

    describe('requestJoinLc', () => {
      it('should return tx hash of ingrid joining channel', async () => {
        subchanAI =
          '0x00cdd51e75ebd5afed428d9d3c4d0d2d6928f4714ae6b1927bc8fa9f659096d9'
        response = await Promise.all([
          client.requestJoinLc(subchanAI),
          timeout(15000)
        ])
        assert.ok(Web3.utils.isHex(response))
      }).timeout(20000)

      it('should throw an error if the channel is not in contract', async () => {
        let subchan =
          '0x9d6f7f8230a387fa584dd9e4c45c53d22967e306b433c27acff9a11aaea76cc1'
        try {
          response = await client.requestJoinLc(subchan)
        } catch (e) {
          assert.equal(e.statusCode, 401)
        }
      })

      it('should throw an error if partyI is not ingrid', async () => {
        subchanBI =
          '0x0b92647ba6be3e07b2c07218262ec2a55a093636cac5fdfe98da64da67db370b'
        client.ingridAddress = accounts[4]
        try {
          response = await client.requestJoinLc(subchanBI)
        } catch (e) {
          client.ingridAddress = accounts[0] // reset in case of continuous testing
          assert.equal(e.statusCode, 402)
        }
      })

      it('should throw an error if it is past the joining period', async () => {
        subchanBI =
          '0x0b92647ba6be3e07b2c07218262ec2a55a093636cac5fdfe98da64da67db370b'
        try {
          response = await client.requestJoinLc(subchanBI)
        } catch (e) {
          assert.equal(e.statusCode, 403)
        }
      })
    })

    describe('creating virtual channel in database', () => {
      it('partyA should create a virtual channel with 5 eth in it', async () => {
        vcId = await client.openChannel({ to: partyB })
        assert.ok(Web3.utils.isHexStrict(vcId))
      })

      it('partyB should join the virtual channel with 0 eth', async () => {
        vcId =
          '0x9d6f7f8230a387fa584dd9e4c45c53d22967e306b433c27acff9a11aaea76cc1'
        response = await client.joinChannel(vcId)
        assert.equal(response, vcId)
      })

      it('partyA sends a state update in the virtual channel of 1 eth', async () => {
        vcId =
          '0x9d6f7f8230a387fa584dd9e4c45c53d22967e306b433c27acff9a11aaea76cc1'
        balanceA = Web3.utils.toBN(Web3.utils.toWei('4', 'ether'))
        balanceB = Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
        response = await client.updateBalance({
          channelId: vcId,
          balanceA,
          balanceB
        })
        assert.ok(
          Web3.utils.toBN(response.balanceA) === balanceA &&
            Web3.utils.toBN(response.balanceB) === balanceB
        )
      })
    })
  })

  describe('testing ingrid getter functions', () => {
    subchanAI =
      '0x00cdd51e75ebd5afed428d9d3c4d0d2d6928f4714ae6b1927bc8fa9f659096d9'
    vcId = '0x9d6f7f8230a387fa584dd9e4c45c53d22967e306b433c27acff9a11aaea76cc1'
    describe('getLedgerChannelChallengeTimer', () => {
      it('should return the default time of 3600 seconds to local host', async () => {
        response = await client.getLedgerChannelChallengeTimer()
        assert.equal(response, 3600)
      })
    })

    describe('getLcById', () => {
      it('should return subchanAI', async () => {
        subchanAI =
          '0x9d6f7f8230a387fa584dd9e4c45c53d22967e306b433c27acff9a11aaea76cc1'
        response = await client.getLcById(subchanAI)
        assert.equal(response.channelId, subchanAI)
      })
      it('should return null if lc doesnt exist', async () => {
        subchanAI =
          '0x9d6f7f8230a387fa584dd9e4c45c53d22967e306b433c27acff9a11aaea76cc1'
        response = await client.getLcById(subchanAI)
        assert.equal(response, null)
      })
    })

    describe('getLcByPartyA', () => {
      it('should return ledger channel between ingrid and accounts[1] when no partyA', async () => {
        response = await client.getLcByPartyA()
        assert.equal(response.partyA, accounts[1].toLowerCase())
      })
      it('should return ledger channel between ingrid and partyA = accounts[2]', async () => {
        response = await client.getLcByPartyA(partyB)
        assert.equal(response.partyA, partyB.toLowerCase())
      })
    })

    // describe('getLatestLedgerStateUpdate', () => {
    //   it('should return latest state for subchanAI', async () => {
    //     response = await client.getLatestLedgerStateUpdate(subchanAI)
    //     assert.equal(response, ';)')
    //   })
    // })

    describe('getVcInitialStates', () => {
      it('should return the initial state of the vcs for subchanAI', async () => {
        response = await client.getVcInitialStates(subchanAI)
        assert.equal(response[0].channelId, vcId)
      })
    })

    // describe('getVcInitialState', () => {
    //   it('should return the initial state of the vcs for subchanAI', async () => {
    //     response = await client.getVcInitialStates(vcId)
    //     assert.equal(response.balanceA, balanceA)
    //   })
    // })

    describe('getChannelById', () => {
      it('should return the initial state of the vcs for subchanAI', async () => {
        response = await client.getChannelById(vcId)
        assert.equal(response.channelId, vcId)
      })
    })

    // describe('getChannelByParties', () => {
    //   it('should return the initial state of the vcs for subchanAI', async () => {
    //     response = await client.getChannelByParties({partyA, partyB})
    //     assert.equal(response.partyA, partyA.toLowerCase())
    //   })
    // })

    describe('getLatestVCStateUpdate', () => {
      it('should return the latest vc state', async () => {
        response = await client.getLatestVCStateUpdate(vcId)
        assert.equal(
          response.balanceA,
          Web3.utils.toWei('4', 'ether').toString()
        )
      })
    })
  })
})
