const assert = require('assert')
const Connext = require('../src/Connext')
const axios = require('axios')
const MockAdapter = require('axios-mock-adapter')
const { createFakeWeb3 } = require('./Helpers')
const sinon = require('sinon')
const MerkleTree = require('../src/helpers/MerkleTree')
const Utils = require('../src/helpers/utils')
const Web3 = require('web3')
const channelManagerAbi = require('../artifacts/LedgerChannel.json')
// const fakeChannelManagerAbi = require('../artifacts/Ledger.json')
const { initWeb3, getWeb3 } = require('../web3')

// named variables
let web3 = { currentProvider: 'mock' }
let partyA // accounts[0], hardcoded is truffle develop accts
let partyB // accounts[1]
let ingridAddress // accounts[2]

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

let vc0 = {
  vcId: '0xc12',
  nonce: 0,
  partyA: '0x627306090abab3a6e1400e9345bc60c78a8bef57',
  partyB: '0xf17f52151ebef6c7334fad080c5704d77216b732',
  partyI: '0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef',
  subchanAI: '0x01',
  subchanBI: '0x02',
  balanceA: Web3.utils.toBN(Web3.utils.toWei('2', 'ether')),
  balanceB: Web3.utils.toBN(Web3.utils.toWei('2', 'ether'))
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
      let client = new Connext({ web3 }, Web3)
      assert.ok(typeof client === 'object')
    })
  })

  describe('register(initialDeposit)', async () => {
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('register with real web3 and valid params', () => {
      describe('ingrid is responsive and returns correct results', () => {
        it('should create a ledger channel with ingrid and bond initial deposit', async () => {
          // params
          const accounts = await client.web3.eth.getAccounts()
          partyA = lc0.partyA = accounts[0]
          ingridAddress = client.ingridAddress = lc0.partyI = accounts[2]
          const initialDeposit = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
          // url requests
          client.ingridUrl = 'ingridUrl'
          let url = `${client.ingridUrl}/ledgerchannel/timer`
          const mock = new MockAdapter(axios)
          mock.onGet(url).reply(() => {
            return [
              200,
              {
                data: 3600
              }
            ]
          })
          url = `${client.ingridUrl}/ledgerchannel/join?a=${partyA}`
          mock.onPost(url).reply(() => {
            return [
              200,
              {
                data: {}
              }
            ]
          })
          const results = await client.register(initialDeposit)
          assert.deepEqual(
            {
              data: {}
            },
            results
          )
        })
        it('should generate a string to enter into truffle develop to create subchanBI with accounts[1] and ingrid', async () => {
          // params
          const accounts = await client.web3.eth.getAccounts()
          partyB = lc0.partyB = accounts[1]
          ingridAddress = client.ingridAddress = lc0.partyI = accounts[2]
          const initialDeposit = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
          // call create channel on contract
          const lcId = await Connext.getNewChannelId()
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
            '0xc06672adc237aeabb9d8046b34ce7b7f783461f4fe1f8ce7e2efb740c64e3c6d'
          const subchanBI =
            '0x271e72f1c740ef558f8702b0ba953c0fc30a4598bdc0e25633a8dcdc8bd0814d'
          // url requests
          client.ingridUrl = 'ingridUrl'
          const mock = new MockAdapter(axios)
          // when requesting subchanBI id
          let url = `${client.ingridUrl}/ledgerchannel?a=${partyA}`
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
          // when getting subchanAI object
          url = `${client.ingridUrl}/ledgerchannel/${subchanAI}`
          mock.onGet(url).reply(() => {
            return [
              200,
              {
                data: {
                  ledgerChannel: {
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
                }
              }
            ]
          })
          // when getting intial states of open vcs
          url = `${client.ingridUrl}/ledgerchannel/${subchanAI}/virtualchannel/initialstate`
          mock.onGet(url).reply(() => {
            return [
              200,
              {
                data: []
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
        it.only(
          'should call joinChannel to join a virtual channel',
          async () => {
            // params
            const accounts = await client.web3.eth.getAccounts()
            partyA = accounts[0]
            partyB = accounts[1]
            ingridAddress = client.ingridAddress = accounts[2]
            const channelId =
              '0x16fa1fb8a0c0c3eb5d44f5beaf5b27560e13b069fb111e1a4337d1663c11e9a6'
            const subchanAI =
              '0xc06672adc237aeabb9d8046b34ce7b7f783461f4fe1f8ce7e2efb740c64e3c6d'
            const subchanBI =
              '0x271e72f1c740ef558f8702b0ba953c0fc30a4598bdc0e25633a8dcdc8bd0814d'
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
                  subchanAI: '0xc06672adc237aeabb9d8046b34ce7b7f783461f4fe1f8ce7e2efb740c64e3c6d',
                  subchanBI: '0x271e72f1c740ef558f8702b0ba953c0fc30a4598bdc0e25633a8dcdc8bd0814d',
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
                      id: '0x271e72f1c740ef558f8702b0ba953c0fc30a4598bdc0e25633a8dcdc8bd0814d'
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
                      id: '0xc06672adc237aeabb9d8046b34ce7b7f783461f4fe1f8ce7e2efb740c64e3c6d'
                    }
                  }
                }
              ]
            })
            // when requesting vc initial states
            url = `${client.ingridUrl}/ledgerchannel/${subchanBI}/virtualchannel/initialstate`
            mock.onGet(url).reply(() => {
              return [
                200,
                {
                  data: []
                }
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
          }
        )
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
            '0x16fa1fb8a0c0c3eb5d44f5beaf5b27560e13b069fb111e1a4337d1663c11e9a6'
          const balance = Web3.utils.toBN(Web3.utils.toWei('4', 'ether'))
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
                subchanAI: '0xc06672adc237aeabb9d8046b34ce7b7f783461f4fe1f8ce7e2efb740c64e3c6d',
                subchanBI: '0x271e72f1c740ef558f8702b0ba953c0fc30a4598bdc0e25633a8dcdc8bd0814d',
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
          const results = await client.updateBalance({ channelId, balance })
          assert.deepEqual(results, { data: {} })
        })
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
        partyA = lc0.partyA = accounts[0]
        partyB = vc0.partyB = accounts[1]
        lc0.lcId = '0x01' // add lcid to obj
        const response = await client.createLedgerChannelContractHandler({
          ingridAddress,
          lcId: lc0.lcId,
          initialDeposit: lc0.balanceA
        })
        assert.ok(Web3.utils.isHexStrict(response.transactionHash))
      })
    })
  })

  describe('joinLedgerChannelContractHandler', () => {
    // init web3
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('Web3 and contract properly initialized, valid parameters', async () => {
      it('should call joinChannel on the channel manager instance', async () => {
        const accounts = await client.web3.eth.getAccounts()
        client.ingridAddress = accounts[2]
        const params = {
          lcId: '0x01'
        }
        const response = await client.joinLedgerChannelContractHandler(params)
        assert.ok(
          response.transactionHash !== null &&
            response.transactionHash !== undefined
        )
      })
    })
  })

  // describe('updateLcStateContractHandler', () => {
  //   // init web3
  //   const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
  //   web3 = new Web3(`ws://localhost:${port}`)
  //   let client = new Connext({ web3 }, Web3)
  //   describe('Web3 and contract properly initialized, valid parameters', async () => {
  //     it.only(
  //       'should call updateLcState on the channel manager instance',
  //       async () => {
  //         const accounts = await client.web3.eth.getAccounts()
  //         lc0.partyA = accounts[0]
  //         ingridAddress = client.ingridAddress = lc0.partyI = accounts[2]
  //         const vcRootHash = await Connext.generateVcRootHash({ vc0s: [] })
  //         lc0.vcRootHash = vcRootHash
  //         lc0.lcId = '0x01' // add lcid to obj
  //         const params = {
  //           isClose: lc0.isClose,
  //           lcId: lc0.lcId,
  //           nonce: 1,
  //           openVCs: lc0.openVCs,
  //           vcRootHash: lc0.vcRootHash,
  //           partyA: lc0.partyA,
  //           partyI: lc0.partyI,
  //           balanceA: Web3.utils.toBN(Web3.utils.toWei('4', 'ether')),
  //           balanceI: Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
  //         }
  //         const hashI = await Connext.createLCStateUpdateFingerprint(params)
  //         params.unlockedAccountPresent = true
  //         params.sigA = await client.createLCStateUpdate(params)
  //         params.sigI = await client.web3.eth.sign(hashI, accounts[2])
  //         console.log('PARAMS:', params)
  //         console.log('hashI:', hashI)
  //         // console.log('sigI:', paramssigI)
  //         // console.log('sigA:', sigA)

  //         const response = await client.updateLcStateContractHandler(params)
  //         assert.ok(
  //           response.transactionHash !== null &&
  //             response.transactionHash !== undefined
  //         )
  //       }
  //     )
  //   })
  // })

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
          lc0.partyA = accounts[0]
          ingridAddress = client.ingridAddress = lc0.partyI = accounts[2]
          const vcRootHash = await Connext.generateVcRootHash({ vc0s: [] })
          lc0.vcRootHash = vcRootHash
          lc0.lcId = '0x01' // add lcid to obj
          const params = {
            isClose: true,
            lcId: lc0.lcId,
            nonce: 2,
            openVCs: lc0.openVCs,
            vcRootHash: vcRootHash,
            partyA: lc0.partyA,
            partyI: lc0.partyI,
            balanceA: Web3.utils.toBN(Web3.utils.toWei('3', 'ether')),
            balanceI: Web3.utils.toBN(Web3.utils.toWei('2', 'ether'))
          }
          const hashI = await Connext.createLCStateUpdateFingerprint(params)
          params.unlockedAccountPresent = true
          const sigA = await client.createLCStateUpdate(params)

          const sigI = await client.web3.eth.sign(hashI, accounts[2])
          // console.log('params:', params)
          // console.log('hashI:', hashI)
          // console.log('sigI:', sigI)
          // console.log('sigA:', sigA)

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
          // assert.equal(result, accounts[0])
        }
      ).timeout(5000)
    })
  })

  describe('byzantineCloseChannelContractHandler', () => {})

  describe('initVcStateContractHandler', () => {})

  describe('settleVcContractHandler', () => {})

  describe('generateVcRootHash', () => {
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('generateVCRootHash with real web3.utils and valid params', () => {
      it('should create an empty 32 byte buffer vcRootHash when no VCs are provided', () => {
        const vc0s = []
        const vcRootHash = Connext.generateVcRootHash({ vc0s })
        assert.equal('0x', vcRootHash)
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

      // it.only('should correctly validate if VCs are in root hash', async () => {
      //   // generate vc0s and merkle tree
      //   const accounts = await client.web3.eth.getAccounts()
      //   partyA = accounts[0]
      //   partyB = accounts[1]
      //   ingridAddress = accounts[2]
      //   const vc0 = {
      //     vcId: '0x1',
      //     nonce: 0,
      //     partyA: partyA,
      //     partyB: partyB,
      //     partyI: ingridAddress,
      //     balanceA: Web3.utils.toBN(1000),
      //     balanceB: Web3.utils.toBN(0)
      //   }
      //   const vc1 = {
      //     vcId: '0x2',
      //     nonce: 0,
      //     partyA: partyA,
      //     partyB: partyB,
      //     partyI: ingridAddress,
      //     balanceA: Web3.utils.toBN(1000),
      //     balanceB: Web3.utils.toBN(0)
      //   }
      //   const vc0s = []
      //   vc0s.push(vc0)
      //   vc0s.push(vc1)
      //   // generate tree
      //   let elems = vc0s.map(vc0 => {
      //     const hash = Connext.createVCStateUpdateFingerprint(vc0)
      //     const vcBuf = Utils.hexToBuffer(hash)
      //     return vcBuf
      //   })
      //   const merkle = new MerkleTree.default(elems)
      //   // vcRootHash from test above
      //   const vcRootHash =
      //     '0xbc8a7623f3fd4779a4510b266265248fc8dfbc1a28988c9d8284a87419b2643c'
      //   // generate proof
      //   let proof = merkle.proof(Web3.utils.hexToBytes(vcRootHash))
      //   // proof = Utils.marshallState(proof)
      //   // set root
      //   console.log(proof)
      //   const isContained = merkle.verify(proof, vcRootHash)
      //   assert.equal(isContained, false)
      // })
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
        const sig = await client.createLCStateUpdate({
          lcId: '0xc1912',
          nonce: 0,
          openVCs: 0,
          vcRootHash: '0xc1912',
          partyA: partyA,
          balanceA: Web3.utils.toBN('0'),
          balanceI: Web3.utils.toBN('0'),
          unlockedAccountPresent: true
        })
        // console.log(sig)
        assert.equal(
          sig,
          '0x47fcfaa2daad4c569bb65985324c2f2ee66563ce558688733b04b3cef4cad69d7e48cc489f57a4268ecc8f73eab0a19cbc099d12ae7d319f277254e15eb297a701'
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
        it('should return signer 0x627306090abab3a6e1400e9345bc60c78a8bef57', () => {
          const signer = Connext.recoverSignerFromLCStateUpdate({
            sig: '0x47fcfaa2daad4c569bb65985324c2f2ee66563ce558688733b04b3cef4cad69d7e48cc489f57a4268ecc8f73eab0a19cbc099d12ae7d319f277254e15eb297a701',
            isClose: false,
            lcId: '0x01',
            nonce: 0,
            openVCs: 0,
            vcRootHash: '0xc1912',
            partyA: partyA,
            partyI: ingridAddress,
            balanceA: Web3.utils.toBN('0'),
            balanceI: Web3.utils.toBN('0')
          })
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
        const sig = await client.createVCStateUpdate({
          vcId: '0xc1912',
          nonce: 0,
          partyA: partyA,
          partyB: partyB,
          partyI: ingridAddress,
          balanceA: Web3.utils.toBN('0'),
          balanceB: Web3.utils.toBN('0'),
          unlockedAccountPresent: true
        })
        assert.equal(
          sig,
          '0x30565d3de1709474d36df47983053ae622e90784cf081755317e2fd1c07c86551986ec306838b3757e53bdfe1cde8b5e29b9996f35bb76fb280cca2920a287c300'
        )
      })
    })
  })

  describe('recoverSignerFromVCStateUpdate', () => {
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('recoverSignerFromVCStateUpdate with real web3.utils and valid params', async () => {
      const accounts = await web3.eth.getAccounts()
      partyA = accounts[0]
      partyB = accounts[1]
      ingridAddress = accounts[2]
      describe('should recover the address of person who signed', () => {
        it('should return signer 0x627306090abab3a6e1400e9345bc60c78a8bef57', () => {
          const signer = Connext.recoverSignerFromVCStateUpdate({
            sig: '0x30565d3de1709474d36df47983053ae622e90784cf081755317e2fd1c07c86551986ec306838b3757e53bdfe1cde8b5e29b9996f35bb76fb280cca2920a287c300',
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
          assert.equal(signer, accounts[0].toLowerCase())
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
  let mock
  let validLedgerState = {
    sigB: '0xc12',
    sigA: '0xc12',
    nonce: 0,
    openVCs: 0,
    vcRootHash: '0xc12',
    partyA: '0xC501E4e8aC8da07D9eC89122d375412477f561B1',
    partyI: '0x2c86bF8a3Fb43CE005d6897dCbBe6338912A14cc',
    balanceA: Web3.utils.toBN(3),
    balanceI: Web3.utils.toBN(3)
  }
  beforeEach(() => {
    mock = new MockAdapter(axios)
  })
  it('getLatestLedgerStateUpdate', async () => {
    const client = new Connext({ web3 }, createFakeWeb3())
    client.ingridUrl = 'ingridUrl'
    const ledgerChannelId = '0xc12'
    const url = `${client.ingridUrl}/ledgerchannel/${ledgerChannelId}/lateststate`
    const mock = new MockAdapter(axios)
    mock.onGet().reply(() => {
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

  it('getLedgerChannelChallengeTimer', async () => {
    const client = new Connext({ web3 }, createFakeWeb3())
    client.ingridUrl = 'ingridUrl'
    const ledgerChannelId = 'address'
    const url = `${client.ingridUrl}/ledgerchannel/timer`
    const mock = new MockAdapter(axios)
    mock.onGet().reply(() => {
      return [
        200,
        {
          data: {}
        }
      ]
    })
    const res = await client.getLedgerChannelChallengeTimer('address')
    assert.deepEqual(res, {})
  })

  it('fastCloseVcHandler', async () => {
    const client = new Connext({ web3 }, createFakeWeb3())
    const params = { vcId: '0xc12', sigA: '0xc12' }
    client.ingridUrl = 'ingridUrl'
    const url = `${client.ingridUrl}/virtualChannel/${params.vcId}/fastclose`
    const mock = new MockAdapter(axios)
    mock.onPost().reply(() => {
      return [
        200,
        {
          data: {}
        }
      ]
    })
    const result = await client.fastCloseVcHandler(params)
    assert.deepEqual(result, { data: {} })
  })

  it('getLatestVirtualDoubleSignedStateUpdate', async () => {
    const client = new Connext({ web3 }, createFakeWeb3())
    client.ingridUrl = 'ingridUrl'
    const channelId = '0xc12'
    const url = `${client.ingridUrl}/virtualchannel/${channelId}/lateststate/doublesigned`
    const mock = new MockAdapter(axios)
    mock.onGet().reply(() => {
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

  it('cosignVcStateUpdateHandler', async () => {
    const client = new Connext({ web3 }, createFakeWeb3())
    client.ingridUrl = 'ingridUrl'
    const params = {
      channelId: '0xc12',
      sig: '0xc12',
      balance: Web3.utils.toBN(3)
    }
    const url = `${client.ingridUrl}/virtualchannel/${params.channelId}/cosign`
    const mock = new MockAdapter(axios)
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

  it('vcStateUpdateHandler', async () => {
    const client = new Connext({ web3 }, createFakeWeb3())
    client.ingridUrl = 'ingridUrl'
    const params = {
      channelId: '0xc12',
      sig: '0xc12',
      balance: Web3.utils.toBN(10)
    }
    const url = `${client.ingridUrl}/virtualchannel/${params.channelId}/update`
    const mock = new MockAdapter(axios)
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

  it('joinVcHandler', async () => {
    const client = new Connext({ web3 }, createFakeWeb3())
    client.ingridUrl = 'ingridUrl'
    const params = { channelId: '0xc12', sig: '0xc12', vcRootHash: '0xc12' }
    const url = `${client.ingridUrl}/virtualchannel/${params.channelId}/join`

    const mock = new MockAdapter(axios)
    mock.onPost().reply(() => {
      return [
        200,
        {
          data: {}
        }
      ]
    })
    const result = await client.joinVcHandler(params)
    assert.deepEqual(result, { data: {} })
  })
  it('openVc', async () => {
    const client = new Connext({ web3 }, createFakeWeb3())
    const fakeAccounts = ['address']
    client.web3.eth.getAccounts = () => {
      return new Promise((resolve, reject) => {
        return resolve(fakeAccounts)
      })
    }
    client.ingridUrl = 'ingridUrl'
    const params = {
      sig: '0xc12',
      balanceA: Web3.utils.toBN(10),
      to: '0xC501E4e8aC8da07D9eC89122d375412477f561B1',
      vcRootHash: '0xc12'
    }
    const url = `${client.ingridUrl}/virtualchannel/open?a=${fakeAccounts[0]}`
    const mock = new MockAdapter(axios)
    mock.onPost().reply(() => {
      return [
        200,
        {
          data: {}
        }
      ]
    })
    const result = await client.openVc(params)
    assert.deepEqual(result, { data: {} })
  })
})
