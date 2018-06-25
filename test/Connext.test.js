const assert = require('assert')
const Connext = require('../src/Connext')
const axios = require('axios')
const MockAdapter = require('axios-mock-adapter')
const { createFakeWeb3, retry, pause, backoff } = require('./Helpers')
const sinon = require('sinon')
const MerkleTree = require('../src/helpers/MerkleTree')
const Utils = require('../src/helpers/utils')
const Web3 = require('web3')
const channelManagerAbi = require('../artifacts/LedgerChannel.json')
const { initWeb3, getWeb3 } = require('../web3')

// timeout

// named variables
let web3
let partyA // accounts[0] in truffledev
let partyB // accounts[1]
let ingridAddress // accounts[2]
let ingridUrl = process.env.INGRID_URL_DEV
let lcId = '0x01'

const emptyRootHash = Connext.generateVcRootHash({ vc0s: [] })

let lc0 = {
  isClose: false,
  lcId: '0x01',
  nonce: 0,
  openVCs: 0,
  vcRootHash: emptyRootHash,
  partyA: '0x627306090abab3a6e1400e9345bc60c78a8bef57',
  partyI: '0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef',
  balanceA: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
  balanceI: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
  unlockedAccountPresent: true
}

describe('Connext', async () => {
  describe('client init', () => {
    it('should create a connext client with a fake version of web3', async () => {
      const client = new Connext({ web3 }, createFakeWeb3())
      assert.ok(typeof client === 'object')
    })
    it('should create a connext client with real web3 and channel manager', async () => {
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let ingridUrl = process.env.INGRID_URL_DEV
      let client = new Connext({ web3, ingridAddress, ingridUrl }, Web3)
      assert.ok(typeof client === 'object')
    })
  })

  describe('register(initialDeposit)', async () => {
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3, ingridAddress, ingridUrl }, Web3)
    describe('register with real web3 and valid params', () => {
      describe('ingrid is responsive and returns correct results', () => {
        let lcId
        it('should return lcID of channel created on contract', async () => {
          // params
          const accounts = await client.web3.eth.getAccounts()
          partyA = lc0.partyA = accounts[0]
          client.ingridAddress = accounts[2]
          const initialDeposit = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
          // // url requests
          // let url = `${client.ingridUrl}/ledgerchannel/challenge`
          // const mock = new MockAdapter(axios)
          // mock.onGet(url).reply(() => {
          //   return [
          //     200,
          //     {
          //       challenge: 3600
          //     }
          //   ]
          // })
          // url = `${client.ingridUrl}/ledgerchannel/join?a=${partyA}`
          // mock.onPost(url).reply(() => {
          //   return [
          //     200,
          //     {
          //       data: {}
          //     }
          //   ]
          // })
          lcId = await client.register(initialDeposit)
          assert.ok(
            Web3.utils.isHex(lcId)
          )
        }).timeout(5000)
        it('should request ingrid joins ledger channel until confirmation is recieved', async () => {
          lcId = '0x2364f2c0d779c26bccae2df89a75499d89166e7228c444d29d36fd8652dc0fb6'
          const response = backoff(3, await client.requestJoinLc(lcId))
          assert.equal(response, ';)')
        }).timeout(5000)
        it('should generate a string to enter into truffle develop to create subchanBI with accounts[1] and ingrid', async () => {
          // params
          const accounts = await client.web3.eth.getAccounts()
          partyB = lc0.partyB = accounts[1]
          ingridAddress = client.ingridAddress = lc0.partyI = accounts[2]
          const initialDeposit = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
          // call create channel on contract
          const lcId = Connext.getNewChannelId()
          const command = `LedgerChannel.deployed().then(i => i.createChannel('${lcId}', '${ingridAddress.toLowerCase()}', {from: '${partyB.toLowerCase()}', value: ${initialDeposit}}))`
          console.log('lcId, subchan BI:', lcId)
          console.log(
            'TO CREATE SUBCHANBI, ENTER THE FOLLOWING INTO TRUFFLE CONSOLE:'
          )
          console.log(command)
          assert.ok(command)
        })
      })
    })
  })

  describe('openChannel', () => {
    // init web3
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('Web3 and contract properly initialized', () => {
      describe('Ingrid, partyA, and partyB are responsive and honest actors', () => {
        it('should call openChannel to create a virtual channel', async () => {
          // params
          const accounts = await client.web3.eth.getAccounts()
          partyA = accounts[0]
          partyB = accounts[1]
          ingridAddress = client.ingridAddress = accounts[2]
          const subchanAI =
            '0x73507f1b3aba85ff6794f4d27fa8e4cbf6daf294c09912c4856428e1e1b2c610'
          const subchanBI =
            '0x129ef8385463750d5557c11ee3a2acbb935e1702d342f287aaa0123bfa82a707'
          // url requests
          client.ingridUrl = 'ingridUrl'
          const mock = new MockAdapter(axios)
          // when requesting subchanBI id
          let url = `${client.ingridUrl}/ledgerchannel?a=${partyA}`
          mock.onGet(url).reply(() => {
            return [200, subchanAI]
          })
          // when requesting subchanBI id
          url = `${client.ingridUrl}/ledgerchannel?a=${partyB}`
          mock.onGet(url).reply(() => {
            return [200, subchanBI]
          })
          // when getting subchanAI object
          url = `${client.ingridUrl}/ledgerchannel/${subchanAI}`
          mock.onGet(url).reply(() => {
            return [
              200,
              {
                id: subchanAI,
                partyA: partyA,
                partyI: ingridAddress,
                balanceA: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
                balanceI: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
                vcRootHash: emptyRootHash,
                isOpen: true,
                isUpdateLCSettling: false,
                openVCs: 0
              }
            ]
          })
          // when getting intial states of open vcs
          url = `${client.ingridUrl}/ledgerchannel/${subchanAI}/virtualchannel/initialstates`
          mock.onGet(url).reply(() => {
            return [
              200,
              []
            ]
          })
          // when posting to client
          mock.onPost().reply(() => {
            return [
              200,
              {
                data: {}
              }
            ]
          })
          // client results
          const results = await client.openChannel({ to: partyB })
          assert.deepEqual(results, {
            data: {}
          })
        })
      })
    })
  })

  describe('joinChannel', () => {
    // init web3
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('Web3 and contract properly initialized', () => {
      describe('Ingrid, partyA, and partyB are responsive and honest actors', () => {
        it('should call joinChannel to join a virtual channel', async () => {
          // params
          const accounts = await client.web3.eth.getAccounts()
          partyA = accounts[0]
          partyB = accounts[1]
          ingridAddress = client.ingridAddress = accounts[2]
          const channelId =
            '0xc025e912181796cf8c15c86558ad580b6ab4a6779c0965d70ba25dc6509a0e13'
          const subchanAI =
            '0x73507f1b3aba85ff6794f4d27fa8e4cbf6daf294c09912c4856428e1e1b2c610'
          const subchanBI =
            '0x129ef8385463750d5557c11ee3a2acbb935e1702d342f287aaa0123bfa82a707'
          // url requests
          client.ingridUrl = 'ingridUrl'
          const mock = new MockAdapter(axios)
          // when requesting the virtual channel object
          let url = `${client.ingridUrl}/virtualchannel/${channelId}`
          mock.onGet(url).reply(() => {
            return [
              200,
              {
                vcId: channelId,
                nonce: 0,
                partyA: partyA,
                partyB: partyB,
                partyI: ingridAddress,
                subchanAI: subchanAI,
                subchanBI: subchanBI,
                balanceA: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
                balanceB: Web3.utils.toBN('0')
              }
            ]
          })
          // when requesting subchanBI id
          // requests with a = accounts[0], but fn should be called by accounts[1]
          url = `${client.ingridUrl}/ledgerchannel?a=${partyA}`
          mock.onGet(url).reply(() => {
            return [
              200,
              {
                data: {
                  ledgerChannel: {
                    id: subchanBI
                  }
                }
              }
            ]
          })
          // when requesting subchanAI id
          url = `${client.ingridUrl}/ledgerchannel?a=${partyB}`
          mock.onGet(url).reply(() => {
            return [
              200,
              {
                data: {
                  ledgerChannel: {
                    id: subchanAI
                  }
                }
              }
            ]
          })
          // when requesting vc initial states
          url = `${client.ingridUrl}/ledgerchannel/${subchanBI}/virtualchannel/initialstates`
          mock.onGet(url).reply(() => {
            return [
              200,
              []
            ]
          })
          // when posting to ingrid
          mock.onPost().reply(() => {
            return [
              200,
              {
                data: {}
              }
            ]
          })
          // client results
          const results = await client.joinChannel(channelId)
          assert.deepEqual(results, {})
        })
      })
    })
  })

  describe('updateBalance', () => {
    // init web3
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('Web3 and contract properly initialized', () => {
      describe('Ingrid, partyA, and partyB are responsive and honest actors', () => {
        it('should call updateBalance to create a state update in a virtual channel', async () => {
          // params
          const accounts = await client.web3.eth.getAccounts()
          partyA = accounts[0]
          partyB = accounts[1]
          ingridAddress = client.ingridAddress = accounts[2]
          // take from console.log of above, has to be better way of doing this
          const channelId =
            '0xc025e912181796cf8c15c86558ad580b6ab4a6779c0965d70ba25dc6509a0e13'
          const subchanAI = '0x73507f1b3aba85ff6794f4d27fa8e4cbf6daf294c09912c4856428e1e1b2c610'
          const subchanBI = '0x129ef8385463750d5557c11ee3a2acbb935e1702d342f287aaa0123bfa82a707'
          const balanceA = Web3.utils.toBN(Web3.utils.toWei('4', 'ether'))
          const balanceB = Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
          // url requests
          client.ingridUrl = 'ingridUrl'
          const mock = new MockAdapter(axios)
          // when requesting the virtual channel object before updating balance
          let url = `${client.ingridUrl}/virtualchannel/${channelId}`
          mock.onGet(url).reply(() => {
            return [
              200,
              {
                vcId: channelId,
                nonce: 0,
                partyA: partyA,
                partyB: partyB,
                partyI: ingridAddress,
                subchanAI: subchanAI,
                subchanBI: subchanBI,
                balanceA: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
                balanceB: Web3.utils.toBN('0')
              }
            ]
          })
          // when requesting subchannels
          // when requesting subchanAI id
          url = `${client.ingridUrl}/ledgerchannel?a=${partyA}`
          mock.onGet(url).reply(() => {
            return [
              200,
              {
                data: {
                  ledgerChannel: {
                    id: subchanAI
                  }
                }
              }
            ]
          })
          // when requesting subchanBI id
          url = `${client.ingridUrl}/ledgerchannel?a=${partyB}`
          mock.onGet(url).reply(() => {
            return [
              200,
              {
                data: {
                  ledgerChannel: {
                    id: subchanBI
                  }
                }
              }
            ]
          })
          // when posting to client
          mock.onPost().reply(() => {
            return [
              200,
              {}
            ]
          })
          // client results
          const results = await client.updateBalance({
            channelId,
            balanceA,
            balanceB
          })
          assert.deepEqual(results, {})
        })
      })
    })
  })

  describe('cosignBalanceUpdate', () => {
    // init web3
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('Web3 and contract properly initialized', () => {
      describe('Ingrid, partyA, and partyB are responsive and honest actors', () => {
        it('should call cosignBalanceUpdate to cosign a state update in a virtual channel', async () => {
          // params
          const balance = Web3.utils.toBN(Web3.utils.toWei('4', 'ether'))
          const accounts = await client.web3.eth.getAccounts()
          partyA = accounts[0]
          partyB = accounts[1]
          ingridAddress = client.ingridAddress = accounts[2]
          // take from console.log of above, has to be better way of doing this
          const channelId =
            '0x16fa1fb8a0c0c3eb5d44f5beaf5b27560e13b069fb111e1a4337d1663c11e9a6'
          const initialSig =
            '0x3ebf0c98bc2705464d0c903a54af235585fb614db52a187d1dc5e7299b319fc35cfa4bd630dc85d2f204ec37d459d6976dde43b395297f966ae3cbc5d5f23e4a00'
          // url requests
          client.ingridUrl = 'ingridUrl'
          const mock = new MockAdapter(axios)
          // when requesting the virtual channel object
          let url = `${client.ingridUrl}/virtualchannel/${channelId}`
          mock.onGet(url).reply(() => {
            return [
              200,
              {
                vcId: channelId,
                nonce: 1,
                partyA: partyA,
                partyB: partyB,
                partyI: ingridAddress,
                subchanAI: '0xc06672adc237aeabb9d8046b34ce7b7f783461f4fe1f8ce7e2efb740c64e3c6d',
                subchanBI: '0x271e72f1c740ef558f8702b0ba953c0fc30a4598bdc0e25633a8dcdc8bd0814d',
                balanceA: Web3.utils.toBN(Web3.utils.toWei('4', 'ether')),
                balanceB: Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
              }
            ]
          })
          // when requesting subchannels
          // when requesting subchanAI id
          url = `${client.ingridUrl}/ledgerchannel?a=${partyA}`
          mock.onGet(url).reply(() => {
            return [
              200,
              {
                data: {
                  ledgerChannel: {
                    id: '0xc06672adc237aeabb9d8046b34ce7b7f783461f4fe1f8ce7e2efb740c64e3c6d'
                  }
                }
              }
            ]
          })
          // when requesting subchanBI id
          url = `${client.ingridUrl}/ledgerchannel?a=${partyB}`
          mock.onGet(url).reply(() => {
            return [
              200,
              {
                data: {
                  ledgerChannel: {
                    id: '0x271e72f1c740ef558f8702b0ba953c0fc30a4598bdc0e25633a8dcdc8bd0814d'
                  }
                }
              }
            ]
          })
          // when posting to client
          mock.onPost().reply(() => {
            return [
              200,
              {
                data: {}
              }
            ]
          })
          // client results
          const results = await client.cosignBalanceUpdate({
            channelId,
            balance,
            sig: initialSig
          })
          assert.deepEqual(results, { data: {} })
        })
      })
    })
  })

  describe('fastCloseChannel', () => {
    // init web3
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('Web3 and contract properly initialized', () => {
      describe('Ingrid, partyA, and partyB are responsive and honest actors', () => {
        it('should call fastCloseChannel to close a vc with latest double signed update', async () => {
          // params
          const balance = Web3.utils.toBN(Web3.utils.toWei('4', 'ether'))
          const accounts = await client.web3.eth.getAccounts()
          partyA = accounts[0]
          partyB = accounts[1]
          ingridAddress = client.ingridAddress = accounts[2]
          // take from console.log of above, has to be better way of doing this
          const channelId =
            '0x16fa1fb8a0c0c3eb5d44f5beaf5b27560e13b069fb111e1a4337d1663c11e9a6'
          const sigA =
            '0x3ebf0c98bc2705464d0c903a54af235585fb614db52a187d1dc5e7299b319fc35cfa4bd630dc85d2f204ec37d459d6976dde43b395297f966ae3cbc5d5f23e4a00'
          const vcState = {
            sigA: sigA,
            vcId: channelId,
            nonce: 1,
            partyA: partyA,
            partyB: partyB,
            partyI: ingridAddress,
            subchanAI: '0xc06672adc237aeabb9d8046b34ce7b7f783461f4fe1f8ce7e2efb740c64e3c6d',
            subchanBI: '0x271e72f1c740ef558f8702b0ba953c0fc30a4598bdc0e25633a8dcdc8bd0814d',
            balanceA: Web3.utils.toBN(Web3.utils.toWei('4', 'ether')),
            balanceB: Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
          }
          const hash = Connext.createVCStateUpdateFingerprint(vcState)
          const sigB = await client.web3.eth.sign(hash, accounts[1])
          vcState.sigB = sigB
          // url requests
          client.ingridUrl = 'ingridUrl'
          const mock = new MockAdapter(axios)
          // when requesting the virtual channel object
          let url = `${client.ingridUrl}/virtualchannel/${channelId}/lateststate/doublesigned`
          mock.onGet(url).reply(() => {
            return [200, vcState]
          })
          // when posting to client
          mock.onPost().reply(() => {
            return [
              200,
              {
                data: {}
              }
            ]
          })
          // client results
          const results = await client.fastCloseChannel(channelId)
          assert.deepEqual(results, { data: {} })
        })
      })
    })
  })

  describe('withdraw', () => {
    // init web3
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('Web3 and contract properly initialized', () => {
      describe('Ingrid, partyA, and partyB are responsive and honest actors', () => {
        it('should call withdraw to close a ledger channel', async () => {
          // params
          const balanceA = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
          const balanceI = Web3.utils.toBN(Web3.utils.toWei('0', 'ether'))
          const accounts = await client.web3.eth.getAccounts()
          partyA = accounts[0]
          partyB = accounts[1]
          ingridAddress = client.ingridAddress = accounts[2]
          // generate sigI
          let latestLCState = {
            isClose: false,
            lcId: lcId,
            nonce: 0,
            openVCs: 0,
            vcRootHash: '0x0',
            partyA: partyA,
            partyI: ingridAddress,
            balanceA: balanceA,
            balanceI: balanceI
          }
          const hash = Connext.createLCStateUpdateFingerprint(latestLCState)
          const sigI = await client.web3.eth.sign(hash, ingridAddress)
          latestLCState.isClose = true
          const closingHash = Connext.createLCStateUpdateFingerprint(
            latestLCState
          )
          const closingSigI = await client.web3.eth.sign(
            closingHash,
            ingridAddress
          )
          latestLCState.sigI = sigI
          latestLCState.sigA = ''
          // client requests
          const mock = new MockAdapter(axios)
          client.ingridUrl = 'ingridUrl'
          // when getting lcId
          let url = `${client.ingridUrl}/ledgerchannel?a=${partyA}`
          mock.onGet(url).reply(() => {
            return [200, lcId]
          })
          // when requesting ingrid sign closing lc udpate
          url = `${client.ingridUrl}/ledgerchannel/${lcId}/fastclose`
          mock.onPost(url).reply(() => {
            return [200, closingSigI]
          })
          // when getting ledger channel state
          url = `${client.ingridUrl}/ledgerchannel/${lcId}/lateststate`
          mock.onGet(url).reply(() => {
            return [200, latestLCState]
          })

          // client results
          const results = await client.withdraw()
          assert.ok(Web3.utils.isHexStrict(results.transactionHash))
        }).timeout(5000)
      })
    })
  })

  describe('checkpoint', () => {
    // init web3
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('Web3 and contract properly initialized, valid paramereters', () => {
      it('should update the mapping in the contract when checkpointed', async () => {
        const accounts = await client.web3.eth.getAccounts()
        const lcId = '0x4b7c97c3ae6abca2ff2ba4e31ee594ac5e1b1f12d8fd2097211569f80dbb7d08'
        const balanceA = Web3.utils.toBN(Web3.utils.toWei('2', 'ether'))
        const balanceI = Web3.utils.toBN(Web3.utils.toWei('3', 'ether'))
        partyA = accounts[0]
        ingridAddress = client.ingridAddress = lc0.partyI = accounts[2]
        const params = {
          isClose: false,
          lcId: lcId,
          nonce: 1,
          openVCs: 0,
          vcRootHash: emptyRootHash,
          partyA: partyA,
          partyI: ingridAddress,
          balanceA: balanceA,
          balanceI: balanceI,
          sigA: ' '
        }
        const hash = await Connext.createLCStateUpdateFingerprint(params)
        const sigI = await client.web3.eth.sign(hash, accounts[2])
        params.sigI = sigI
        // mock client requests
        const mock = new MockAdapter(axios)
        // calling getLcId
        mock.onGet(`${client.ingridUrl}/ledgerchannel?a=${partyA}`).reply(() => {
          return [200, lcId]
        })
        // calling getLatestLedgerStateUpdate
        mock.onGet(`${client.ingridUrl}/ledgerchannel/${lcId}/lateststate`).reply(() => {
          return [
            200,
            params
          ]
        })

        // actual request
        const results = await client.checkpoint()
        assert.ok(Web3.utils.isHexStrict(response.transactionHash))
      })
    })
  })

  describe('withdrawFinal', () => {
    // init web3
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3, ingridAddress, ingridUrl }, Web3)
    describe('Web3 and contract properly initialized, valid parameters', () => {
      it('should call withdrawFinal on lc that has been settled on chain', async () => {
        const accounts = await client.web3.eth.getAccounts()
        partyA = accounts[0]
        ingridAddress = client.ingridAddress = accounts[2]
        const lcId = '0x4b7c97c3ae6abca2ff2ba4e31ee594ac5e1b1f12d8fd2097211569f80dbb7d08'
        const balanceA = Web3.utils.toBN(Web3.utils.toWei('4', 'ether'))
        const balanceI = Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
        const params = {
          isClose: false,
          lcId: lcId,
          nonce: 1,
          openVCs: 0,
          vcRootHash: emptyRootHash,
          partyA: partyA,
          partyI: ingridAddress,
          balanceA: balanceA,
          balanceI: balanceI,
          isSettling: true
        }

        // url requests
        client.ingridUrl = 'ingridUrl'
        const mock = new MockAdapter(axios)
        // when requesting subchanBI id
        let url = `${client.ingridUrl}/ledgerchannel?a=${partyA}`
        mock.onGet(url).reply(() => {
          return [200, lcId]
        })
        // calling getLc
        url = `${client.ingridUrl}/ledgerchannel/${lcId}`
        mock.onGet(url).reply(() => {
          return [200, params]
        })
        const response = await client.withdrawFinal()
        // assert.equal(response, ':)')
        assert.ok(Web3.utils.isHexStrict(response.transactionHash))
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
        const accounts = await client.web3.eth.getAccounts()
        partyA = accounts[0]
        partyB = accounts[1]
        ingridAddress = client.ingridAddress = accounts[2]
        const vcId = '0xc025e912181796cf8c15c86558ad580b6ab4a6779c0965d70ba25dc6509a0e13'
        const subchanAIId = '0x73507f1b3aba85ff6794f4d27fa8e4cbf6daf294c09912c4856428e1e1b2c610'
        const subchanBIId = '0x129ef8385463750d5557c11ee3a2acbb935e1702d342f287aaa0123bfa82a707'
        // initial state
        let state = {
          vcId,
          subchanAI: subchanAIId,
          subchanBI: subchanBIId,
          nonce: 0,
          partyA,
          partyB,
          balanceA: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
          balanceB: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
        }
        const hash0 = Connext.createVCStateUpdateFingerprint(state)
        const sigA0 = await client.web3.eth.sign(hash0, accounts[0])
        const sigB0 = await client.web3.eth.sign(hash0, accounts[1])
        // state 1
        state.nonce = 1
        state.balanceA = Web3.utils.toBN(Web3.utils.toWei('4', 'ether'))
        state.balanceB = Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
        const hash1 = Connext.createVCStateUpdateFingerprint(state)
        const sigA1 = await client.web3.eth.sign(hash1, accounts[0])
        const sigB1 = await client.web3.eth.sign(hash1, accounts[1])
        // url requests
        const mock = new MockAdapter(axios)
        // when requesting initial state of VC
        let url = `${client.ingridUrl}/virtualchannel/${vcId}/intialstate`
        mock.onGet(url).reply(() => {
          return [
            200,
            {
              vcId,
              subchanAI: subchanAIId,
              subchanBI: subchanBIId,
              nonce: 0,
              partyA,
              partyB,
              balanceA: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
              balanceB: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
              sigA: sigA0,
              sigB: sigB0
            }
          ]
        })
        // when requesting latest double signed state of VC
        url = `${client.ingridUrl}/virtualchannel/${vcId}/lateststate/doublesigned`
        mock.onGet(url).reply(() => {
          return [
            200,
            {
              vcId,
              subchanAI: subchanAIId,
              subchanBI: subchanBIId,
              nonce: 1,
              partyA,
              partyB,
              balanceA: Web3.utils.toBN(Web3.utils.toWei('4', 'ether')),
              balanceB: Web3.utils.toBN(Web3.utils.toWei('1', 'ether')),
              sigA: sigA1,
              sigB: sigB1
            }
          ]
        })
        // when requesting initial states of the subchanAI
        url = `${client.ingridUrl}/ledgerchannel/${subchanAIId}/virtualchannel/initialstates`
        mock.onGet(url).reply(() => {
          return [
            200,
            [
              // returns list of vc initial states
              {
                subchanAIId,
                vcId,
                nonce: 0,
                partyA,
                partyB,
                balanceA: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
                balanceB: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
                sigA: sigA0
              }
            ]
          ]
        })

        const response = await client.byzantineCloseVc(vcId)
        assert.ok(Web3.utils.isHexStrict(response.transactionHash))
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
        // parameters
        const accounts = await client.web3.eth.getAccounts()
        partyA = accounts[0]
        partyB = accounts[1]
        ingridAddress = client.ingridAddress = accounts[2]
        const vcId = '0xc025e912181796cf8c15c86558ad580b6ab4a6779c0965d70ba25dc6509a0e13'
        const subchanAIId = '0x73507f1b3aba85ff6794f4d27fa8e4cbf6daf294c09912c4856428e1e1b2c610'
        const subchanBIId = '0x129ef8385463750d5557c11ee3a2acbb935e1702d342f287aaa0123bfa82a707'

        // url requests
        const mock = new MockAdapter(axios)
        // when requesting subchanBI id
        let url = `${client.ingridUrl}/ledgerchannel?a=${partyA}`
        mock.onGet(url).reply(() => {
          return [200, subchanAIId]
        })
        // when requesting decomposed ledger state updates
        url = `${client.ingridUrl}/virtualchannel/${vcId}/decompose`
        const data = {}
        data[subchanAIId] = {
          lcId: subchanAIId,
          nonce: 1,
          openVCs: 1,
          vcRootHash: '0x421b9af3b91f2475a26671ea9217e632a6e7f5573b82343f1d5260b2a6f145a4',
          partyA,
          partyI: ingridAddress,
          balanceA: Web3.utils.toBN('0'),
          balanceI: Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
        }
        data[subchanBIId] = {}
        mock.onGet(url).reply(() => {
          return [
            200,
            data
          ]
        })
        // on posting sig to client
        mock.onPost().reply(() => {
          return [
            200,
            ':)'
          ]
        })

        const response = await client.closeChannel(vcId)
        assert.equal(response, ':)')
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

      })
    })
 })

  describe('createLedgerChannelContractHandler', () => {
    // init web3
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('Web3 and contract properly initialized, valid parameters', () => {
      it('should call createChannel on the channel manager instance', async () => {
        const accounts = await client.web3.eth.getAccounts()
        ingridAddress = accounts[2]
        const balanceA = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
        const response = await client.createLedgerChannelContractHandler({
          ingridAddress,
          lcId: '0x4b7c97c3ae6abca2ff2ba4e31ee594ac5e1b1f12d8fd2097211569f80dbb7d08',
          initialDeposit: balanceA
        })
        assert.ok(Web3.utils.isHexStrict(response.transactionHash))
      })
    })
  })

  describe('LCOpenTimeoutContractHandler', () => {
    // init web3
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('Web3 and contract properly initialized, valid parameters', () => {
      it('should call createChannel on the channel manager instance to create channel to delete', async () => {
        const accounts = await client.web3.eth.getAccounts()
        ingridAddress = accounts[2]
        const balanceA = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
        const lcId = '0xa6585504ea64ee76da1238482f08f6918e7a5e1c77418f6072af19530940cc04' // add lcid to obj
        const response = await client.createLedgerChannelContractHandler({
          ingridAddress,
          lcId: lcId,
          initialDeposit: balanceA
        })
        assert.ok(Web3.utils.isHexStrict(response.transactionHash))
      }).timeout(5000)
      it('should call LCOpenTimeout on the channel manager instance to delete created channel', async () => {
        const lcId = '0xa6585504ea64ee76da1238482f08f6918e7a5e1c77418f6072af19530940cc04'
        const results = await client.LCOpenTimeoutContractHandler(lcId)
        assert.ok(Web3.utils.isHexStrict(results.transactionHash))
      }).timeout(5000)
    })
  })

  describe('joinLedgerChannelContractHandler', () => {
    // init web3
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('Web3 and contract properly initialized, valid parameters', async () => {
      it('should call joinChannel on the channel manager instance (subchanAI)', async () => {
        const accounts = await client.web3.eth.getAccounts()
        client.ingridAddress = accounts[2]
        const params = {
          lcId: '0xb1029cf0849ee7f558dbfe224284277c2727ecb64c4673267454d932dbb10b0b', // subchan AI ID,
          deposit: Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
        }
        const response = await client.joinLedgerChannelContractHandler(params)
        assert.ok(
          response.transactionHash !== null &&
            response.transactionHash !== undefined
        )
      }).timeout(5000)
      it('should call joinChannel on the channel manager instance (subchanBI)', async () => {
        const accounts = await client.web3.eth.getAccounts()
        client.ingridAddress = accounts[2]
        const params = {
          lcId: '0x26574bf9ba599888f05c27dc1e45a2de36c4b5975abcdba601a4c2f2b79028dd' // subchan BI ID
        }
        const response = await client.joinLedgerChannelContractHandler(params)
        assert.ok(
          response.transactionHash !== null &&
            response.transactionHash !== undefined
        )
      }).timeout(5000)
    })
  })

  describe('depositContractHandler', () => {
    // init web3
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('Web3 and contract properly initialized, valid parameters', async () => {
      it('should call deposit on the channel manager instance', async () => {
        const accounts = await client.web3.eth.getAccounts()
        ingridAddress = client.ingridAddress = accounts[2]
        lcId = '0x01'
        const deposit = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
        const mock = new MockAdapter(axios)
        mock
          .onGet(`${client.ingridUrl}/ledgerchannel?a=${partyA}`)
          .reply(() => {
            return [200, lcId]
          })
        const response = await client.depositContractHandler(deposit)
        assert.ok(
          response.transactionHash !== null &&
            response.transactionHash !== undefined
        )
      })
    })
  })

  describe('updateLcStateContractHandler', () => {
    // init web3
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('Web3 and contract properly initialized, valid parameters', async () => {
      it('should call updateLcState on the channel manager instance with no open VCs', async () => {
        const accounts = await client.web3.eth.getAccounts()
        partyA = accounts[0]
        ingridAddress = client.ingridAddress = lc0.partyI = accounts[2]
        lcId = '0x4b7c97c3ae6abca2ff2ba4e31ee594ac5e1b1f12d8fd2097211569f80dbb7d08'
        const params = {
          isClose: false,
          lcId: lcId,
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
      it('should call updateLcState on the channel manager instance open VCs', async () => {
        const accounts = await client.web3.eth.getAccounts()
        partyA = accounts[0]
        partyB = accounts[1]
        ingridAddress = client.ingridAddress = lc0.partyI = accounts[2]
        lcId = '0x01'
        const vc0 = {
          isClose: false,
          vcId: '0xc12',
          nonce: 0,
          partyA: partyA,
          partyB: partyB,
          partyI: ingridAddress,
          subchanAI: '0x01',
          subchanBI: '0x02',
          balanceA: Web3.utils.toBN(Web3.utils.toWei('1', 'ether')),
          balanceB: Web3.utils.toBN(Web3.utils.toWei('0', 'ether'))
        }
        const vc1 = {
          isClose: false,
          vcId: '0xc13',
          nonce: 0,
          partyA: partyA,
          partyB: partyB,
          partyI: ingridAddress,
          subchanAI: '0x03',
          subchanBI: '0x04',
          balanceA: Web3.utils.toBN(Web3.utils.toWei('1', 'ether')),
          balanceB: Web3.utils.toBN(Web3.utils.toWei('0', 'ether'))
        }
        const vc0s = []
        vc0s.push(vc0)
        vc0s.push(vc1)
        const vcRootHash1 = Connext.generateVcRootHash({ vc0s })
        const params = {
          isClose: false,
          lcId: lcId,
          nonce: 3,
          openVCs: 2,
          vcRootHash: vcRootHash1,
          partyA: partyA,
          partyI: ingridAddress,
          balanceA: Web3.utils.toBN(Web3.utils.toWei('2', 'ether')),
          balanceI: Web3.utils.toBN(Web3.utils.toWei('3', 'ether'))
        }
        const hash = await Connext.createLCStateUpdateFingerprint(params)
        params.unlockedAccountPresent = true
        params.sigA = await client.createLCStateUpdate(params)
        params.sigI = await client.web3.eth.sign(hash, accounts[2])
        console.log('PARAMSA:', params)
        console.log('hashA:', hash)

        const response = await client.updateLcStateContractHandler(params)
        assert.ok(
          response.transactionHash !== null &&
            response.transactionHash !== undefined
        )
      })
    })
  })

  describe('consensusCloseChannelContractHandler', () => {
    // init web3
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('Web3 and contract properly initialized, valid parameters', async () => {
      it(
        'should call consensusCloseChannel on the channel manager instance',
        async () => {
          const accounts = await client.web3.eth.getAccounts()
          partyA = accounts[0]
          ingridAddress = client.ingridAddress = accounts[2]
          lcId = '0x01' // add lcid to obj
          const params = {
            isClose: true,
            lcId: lcId,
            nonce: 5,
            openVCs: 0,
            vcRootHash: emptyRootHash,
            partyA: partyA,
            partyI: ingridAddress,
            balanceA: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
            balanceI: Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
          }
          const hashI = await Connext.createLCStateUpdateFingerprint(params)
          params.unlockedAccountPresent = true
          const sigA = await client.createLCStateUpdate(params)
          const sigI = await client.web3.eth.sign(hashI, accounts[2])
          console.log('params:', params)
          console.log('hashI:', hashI)
          console.log('sigI:', sigI)
          console.log('sigA:', sigA)

          const result = await client.consensusCloseChannelContractHandler({
            lcId: params.lcId,
            nonce: params.nonce,
            balanceA: params.balanceA,
            balanceI: params.balanceI,
            sigA: sigA,
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
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('real Web3 and valid parameters', () => {
      it('should init a virtual channel state on chain', async () => {
        // get accounts
        const accounts = await client.web3.eth.getAccounts()
        const subchanId =
          '0x4b7c97c3ae6abca2ff2ba4e31ee594ac5e1b1f12d8fd2097211569f80dbb7d08'
        partyA = accounts[0]
        partyB = accounts[1]
        ingridAddress = client.ingridAddress = accounts[2]
        const vcId = Connext.getNewChannelId()
        console.log(vcId)
        const nonce = 0
        const balanceA = Web3.utils.toBN(Web3.utils.toWei('2', 'ether'))
        const balanceB = Web3.utils.toBN(Web3.utils.toWei('0', 'ether'))

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
        // mock urls
        const mock = new MockAdapter(axios)
        mock.onGet().reply(() => {
          return [
            200,
            [
              // returns list of vc initial states
              {
                subchanId,
                vcId,
                nonce,
                partyA,
                partyB,
                balanceA,
                balanceB,
                sigA
              }
            ]
          ]
        })
        // client call
        const results = await client.initVcStateContractHandler({
          subchanId,
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
        const vcId = "0x6c08ce0d3bcacaf067e75801c2e8aa5a29dd19a20ba773a2918d73765e255941"
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
          sigA,
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
        const vcId = "0x6c08ce0d3bcacaf067e75801c2e8aa5a29dd19a20ba773a2918d73765e255941"
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
        const results = await client.byzantineCloseChannelContractHandler(lcId)
        assert.ok(
          results.transactionHash !== null &&
          results.transactionHash !== undefined
        )
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

  describe('createLCStateUpdate', () => {
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('createLCStateUpdate with real web3.utils and valid params', () => {
      it('should create a valid signature.', async () => {
        const accounts = await web3.eth.getAccounts()
        partyA = accounts[0]
        partyB = accounts[1]
        ingridAddress = accounts[2]
        client.ingridAddress = ingridAddress
        const sigParams = {
          isClose: false,
          lcId: '0xc1912',
          nonce: 0,
          openVCs: 0,
          vcRootHash: '0xc1912',
          partyA: partyA,
          partyI: ingridAddress,
          balanceA: Web3.utils.toBN('0'),
          balanceI: Web3.utils.toBN('0'),
          unlockedAccountPresent: true
        }
        const sig = await client.createLCStateUpdate(sigParams)
        const hash = Connext.createLCStateUpdateFingerprint(sigParams)
        const realSig = await client.web3.eth.sign(hash, accounts[0])
        // console.log(sig)
        assert.equal(
          sig,
          realSig
        )
      })
    })
  })

  describe('recoverSignerFromLCStateUpdate', () => {
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('recoverSignerFromLCStateUpdate with real web3.utils and valid params', async () => {
      const accounts = await web3.eth.getAccounts()
      partyA = accounts[0]
      partyB = accounts[1]
      ingridAddress = accounts[2]
      describe('should recover the address of person who signed', () => {
        it('should return signer == accounts[0]', async () => {
          let sigParams = {
            isClose: false,
            lcId: '0xc1912',
            nonce: 0,
            openVCs: 0,
            vcRootHash: '0xc1912',
            partyA: partyA,
            partyI: ingridAddress,
            balanceA: Web3.utils.toBN('0'),
            balanceI: Web3.utils.toBN('0'),
            unlockedAccountPresent: true
          }
          const sig = await client.createLCStateUpdate(sigParams)
          sigParams.sig = sig
          const signer = Connext.recoverSignerFromLCStateUpdate(sigParams)
          assert.equal(signer, accounts[0].toLowerCase())
        })
      })
    })
  })

  describe('createVCStateUpdate', () => {
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('createVCStateUpdate with real web3.utils and valid params', () => {
      it('should return a valid signature.', async () => {
        const accounts = await web3.eth.getAccounts()
        partyA = accounts[0]
        partyB = accounts[1]
        ingridAddress = accounts[2]
        const mock = new MockAdapter(axios)
        mock.onGet().reply(() => {
          return [
            200,
            {
              data: {
                ledgerChannel: { id: '0xc1912' }
              }
            }
          ]
        })
        const sigParams = {
          vcId: '0xc1912',
          nonce: 0,
          partyA: partyA,
          partyB: partyB,
          balanceA: Web3.utils.toBN('0'),
          balanceB: Web3.utils.toBN('0'),
          unlockedAccountPresent: true
        }
        const sig = await client.createVCStateUpdate(sigParams)
        const hash = Connext.createVCStateUpdateFingerprint(sigParams)
        const realSig = await client.web3.eth.sign(hash, accounts[0])
        assert.equal(
          sig,
          realSig
        )
      })
    })
  })

  describe('recoverSignerFromVCStateUpdate', () => {
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('recoverSignerFromVCStateUpdate with real web3.utils and valid params', async () => {
      const accounts = await client.web3.eth.getAccounts()
      partyA = accounts[0]
      partyB = accounts[1]
      ingridAddress = accounts[2]
      describe('should recover the address of person who signed', () => {
        it('should return signer == accounts[1]', async () => {
          let sigParams = {
            vcId: '0xc1912',
            nonce: 0,
            partyA: partyA,
            partyB: partyB,
            balanceA: Web3.utils.toBN('0'),
            balanceB: Web3.utils.toBN('0'),
            unlockedAccountPresent: true
          }
          const sig = await client.createVCStateUpdate(sigParams)
          sigParams.sig = sig
          const signer = Connext.recoverSignerFromVCStateUpdate(sigParams)
          assert.equal(signer, accounts[1].toLowerCase())
        })
      })
    })

    describe('validators', () => {
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
            `[recoverSignerFromVCStateUpdate][balanceB] : can\'t be blank,null is not BN.`
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
                `[recoverSignerFromVCStateUpdate][balanceB] : can\'t be blank,undefined is not BN.`
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
                `[recoverSignerFromVCStateUpdate][balanceB] : can\'t be blank,null is not BN.`
              )
            }
          })
        })

        describe('vcId', () => {
          it('throws an error when vcId is not a hex String', async () => {
            try {
              Connext.recoverSignerFromVCStateUpdate({
                sig: '0xc1912',
                vcId: 'bad VC ID'
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[recoverSignerFromVCStateUpdate][vcId] : bad VC ID is not hex string prefixed with 0x.`
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
                nonce: '100aa'
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
                partyA: 'its a party'
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
                partyB: 'cardi B party B'
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[recoverSignerFromVCStateUpdate][partyB] : cardi B party B is not address.`
              )
            }
          })
        })
        describe('partyI', () => {
          it('does throw an error when partyI is not an address', async () => {
            try {
              Connext.recoverSignerFromVCStateUpdate({
                sig: '0xc1912',
                vcId: '0xc1912',
                nonce: 100,
                partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyI: 'cardi I party i'
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[recoverSignerFromVCStateUpdate][partyI] : cardi I party i is not address.`
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
          it('does throw an error when subchanBI is not a strict hex', async () => {
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
                `[recoverSignerFromVCStateUpdate][balanceA] : cow is not BN.`
              )
            }
          })
        })
        describe('balanceB', () => {
          it('does throw an error when subchanBI is not a strict hex', async () => {
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
                `[recoverSignerFromVCStateUpdate][balanceB] : 7 cats is not BN.`
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
            vcId: '0xc1912',
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

describe('ingridClientRequests', () => {
  let url
  let mock
  let ledgerChannel

  describe('valid web3 and ledger channel contract', () => {
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3, ingridAddress, ingridUrl }, Web3)
    beforeEach(() => {
      mock = new MockAdapter(axios)
    })

    describe('getLatestLedgerStateUpdate', () => {
      // it('should return the latest ledger channel state', async () => {
        // // create ledger channel
        // const balanceA = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
        // const lcId = await client.register(balanceA)
        // // wait for ingrid to join lc
        // const joinResponse = backoff(3, await client.requestJoinLc(lcId))
        // if (joinResponse) {
        //   // make a state update
        //   const state = {
        //     isClose: false,
        //     lcId,
        //     nonce: 1,
        //     openVCs: 0,
        //     vcRootHash: emptyRootHash,
        //     partyA,
        //     partyI: ingridAddress,
        //     balanceA: Web3.utils.toBN(Web3.utils.toWei('4', 'ether')),
        //     balanceI: Web3.utils.toBN(Web3.utils.toWei('6', 'ether'))
        //   }
        //   const sigA = client.createLCStateUpdate(state)
        //   // post state update to ingrid
        //   const stateUpdateResponse = await client.sendLCStateBalanceUpdate({
        //     sig: sigA,
        //     lcId,
        //     balanceA: state.balanceA,
        //     balanceI: state.balanceI
        //   })
        //   if (stateUpdateResponse) {
        //     const response = await client.getLatestLedgerStateUpdate(lcId)
        //   }
        // }
        // const response = await client.getLatestLedgerStateUpdate(lcId)
        // assert.equal(response, ';)')
      // })
      it('mocked ingrid request', async () => {
        client.ingridUrl = 'ingridUrl'
        const ledgerChannelId = '0xc12'
        url = `${client.ingridUrl}/ledgerchannel/${ledgerChannelId}/lateststate`
        mock.onGet(url).reply(() => {
          return [
            200,
            {
              data: {}
            }
          ]
        })
        const res = await client.getLatestLedgerStateUpdate('0xc12')
        assert.ok(typeof res === 'object')
      })
    })

    describe('getLedgerChannelChallengeTimer', () => {
      it('should return the default time of 3600 seconds to local host', async () => {
        client.ingridUrl = ingridUrl
        const response = await client.getLedgerChannelChallengeTimer()
        assert.equal(response, 3600)
      })
    })

    describe('requestJoinLc', () => {
      it('should request that ingrid joins the ledger channel with given lcID', async () => {
        const lcID = '0xa6585504ea64ee76da1238482f08f6918e7a5e1c77418f6072af19530940cc04'
        const response = await client.requestJoinLc(lcId)
        assert.equal(response, {})
      })
    })

    describe('getLcById', async () => {
      it('should return the ledger channel object with that id', async () => {
        // const accounts = await client.web3.eth.getAccounts()
        // client.ingridAddress = accounts[2]
        // const initialDeposit = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
        // const lcId = await client.register(initialDeposit)
        // console.log(lcId)
        // await client.joinLedgerChannelContractHandler({lcId, deposit: initialDeposit})

        const lcId = '0x2364f2c0d779c26bccae2df89a75499d89166e7228c444d29d36fd8652dc0fb6'

        const response = await client.getLcById(lcId)
        assert.equal(response.channelId, lcId)
      }).timeout(10000)
      it('mocked ingrid request', async() => {
        client.ingridUrl = 'ingridUrl'
        const accounts = await client.web3.eth.getAccounts()
        ingridAddress = client.ingridAddress = accounts[2]
        ledgerChannel = {
          "state": 0, // status of ledger channel
          "balanceA": "10000",
          "balanceI": "0",
          "channelId": "0x1000000000000000000000000000000000000000000000000000000000000000",
          "partyA": partyA,
          "partyI": ingridAddress,
          "nonce": 0,
          "openVcs": 0,
          "vcRootHash": emptyRootHash
        }
        url = `${client.ingridUrl}/ledgerchannel/${ledgerChannel.channelId}`
        mock.onGet(url).reply(() => {
          return [
            200,
            ledgerChannel
          ]
        })
        const res = await client.getLcById(ledgerChannel.channelId)
        assert.deepEqual(res, ledgerChannel)
      })

    })

    describe('getLcByPartyA', async () => {
      it('should return ledger channel between ingrid and accounts[0] when no partyA', async() => {
        const accounts = await client.web3.eth.getAccounts()
        const res = await client.getLcByPartyA()
        assert.equal(res.partyA, accounts[0])
      })
      it('should return ledger channel between ingrid and partyA = accounts[1]', async() => {
        const accounts = await client.web3.eth.getAccounts()
        partyA = accounts[1].toLowerCase()
        const res = await client.getLcByPartyA(partyA)
        assert.equal(res.partyA, partyA)
      })

      it('mocked ingrid request, agentA supplied', async() => {
        client.ingridUrl = 'ingridUrl'
        const accounts = await client.web3.eth.getAccounts()
        partyA = accounts[0]
        partyB = accounts[1]
        ingridAddress = client.ingridAddress = accounts[2]
        ledgerChannel = {
          "state": 0, // status of ledger channel
          "balanceA": "10000",
          "balanceI": "0",
          "channelId": "0x1000000000000000000000000000000000000000000000000000000000000000",
          "partyA": partyA,
          "partyI": ingridAddress,
          "nonce": 0,
          "openVcs": 0,
          "vcRootHash": emptyRootHash
        }
        url = `${client.ingridUrl}/ledgerchannel/a/${partyA}`
        mock.onGet(url).reply(() => {
          return [
            200,
            ledgerChannel
          ]
        })
        const res = await client.getLcByPartyA()
        assert.equal(res.partyA, partyA)
      })
      it('mocked ingrid request, agentA supplied', async () => {
        const accounts = await client.web3.eth.getAccounts()
        partyA = accounts[0]
        partyB = accounts[1]
        ingridAddress = client.ingridAddress = accounts[2]
        ledgerChannel.partyA = partyB
        url = `${client.ingridUrl}/ledgerchannel/a/${partyB}`
        mock.onGet(url).reply(() => {
          return [
            200,
            ledgerChannel
          ]
        })
        const res = await client.getLcByPartyA(partyB)
        assert.equal(res.partyA, partyB)
      })
    })

    describe('getLatestVirtualDoubleSignedStateUpdate', async () => {
      it('should return the latest double signed vc state', async () => {
        const channelId = ''
        const response = await client.getLatestLedgerStateUpdate(channelId)
        assert.equal(response, ';)')
      })
      it('mocked ingrid request', async () => {
        const channelId = '0xc12'
        url = `${client.ingridUrl}/virtualchannel/${channelId}/lateststate/doublesigned`
        mock.onGet(url).reply(() => {
          return [
            200,
            {
              data: {}
            }
          ]
        })
        const result = await client.getLatestVirtualDoubleSignedStateUpdate(
          channelId
        )
        assert.deepEqual(result, { data: {} })
      })
    })

    describe('cosignVcStateUpdateHandler', async () => {
      // it ('should cosign the latest vc updated state', async () => {
      //   const params = {
      //     channelId: '0xc12',
      //     sig: '0xc12',
      //     balance: Web3.utils.toBN(3)
      //   }
      //   const response = client.cosignVcStateUpdateHandler(params)
      //   assert.equal(response, ';)')
      // })
      it('mocked ingrid request', async () => {
        const params = {
          channelId: '0xc12',
          sig: '0xc12',
          balance: Web3.utils.toBN(3)
        }
        url = `${client.ingridUrl}/virtualchannel/${params.channelId}/cosign`
        mock = new MockAdapter(axios)
        mock.onPost().reply(() => {
          return [
            200,
            {
              data: {}
            }
          ]
        })
        const result = await client.cosignVcStateUpdateHandler(params)
        assert.deepEqual(result, { data: {} })
      })
    })

    describe('vcStateUpdateHandler', async () => {
      it('mocked ingrid request', async () => {
        const params = {
          channelId: '0xc12',
          sig: '0xc12',
          balanceA: Web3.utils.toBN(10),
          balanceB: Web3.utils.toBN(10)
        }
        url = `${client.ingridUrl}/virtualchannel/${params.channelId}/update`
        mock = new MockAdapter(axios)
        mock.onPost().reply(() => {
          return [
            200,
            {
              data: {}
            }
          ]
        })
        const result = await client.vcStateUpdateHandler(params)
        assert.deepEqual(result, { data: {} })
      })
    })

    describe('joinVcHandler', async () => {
      it('mocked ingrid request', async () => {
        const params = { channelId: '0xc12', sig: '0xc12', vcRootHash: '0xc12' }
        url = `${client.ingridUrl}/virtualchannel/${params.channelId}/join`
        mock = new MockAdapter(axios)
        mock.onPost().reply(() => {
          return [
            200,
            true // if ingrid agrees to be the hub for vc for agentB
          ]
        })
        const result = await client.joinVcHandler(params)
        assert.deepEqual(result, true)
      })
    })

    describe('openVc', async () => {
      it('mocked ingrid request', async () => {
        const params = {
          sig: '0xc12',
          balanceA: Web3.utils.toBN(10),
          to: partyB,
          vcRootHash: '0xc12'
        }
        mock = new MockAdapter(axios)
        mock.onPost().reply(() => {
          return [
            200,
            true // if ingrid agrees to open vc for agentA
          ]
        })
        const result = await client.openVc(params)
        assert.deepEqual(result, true)
      })
    })
  })
  })
