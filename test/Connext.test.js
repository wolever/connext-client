const assert = require('assert')
const Connext = require('../src/Connext')
const axios = require('axios')
const MockAdapter = require('axios-mock-adapter')
const { createFakeWeb3 } = require('./Helpers')
const sinon = require('sinon')
const MerkleTree = require('../helpers/MerkleTree')
const Utils = require('../helpers/utils')
const Web3 = require('web3')
const artifacts = require('../artifacts/Ledger.json')
const { initWeb3, getWeb3 } = require('../web3')

let web3 = { currentProvider: 'mock' }
let partyA
let partyB
let ingridAddress
let contractAddress
let watcherUrl
let ingridUrl

describe('Connext', async () => {
  describe('client init', () => {
    it('should create a connext client with a fake version of web3', async () => {
      const client = new Connext({ web3 }, createFakeWeb3())
      assert.ok(typeof client === 'object')
    })
    it('should create a connect client with real web3', async () => {
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3 }, Web3)
      assert.ok(typeof client === 'object')
    })
  })

  describe('createVCStateUpdate', () => {
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('createVCStateUpdate with real web3.utils and valid params', () => {
      it('should return 0xc1912 for both subchannel ids', async () => {
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
          // console.log(sig)
        assert.equal(
            sig,
            '0xa72b2506d43e4e6e506c19c3f0400d88df7d138d0dcb54e274d415c13bc60c235b22988de3867f566856318f1783cc08324fd9c5a650631010aa7eb22bcc2a5b00'
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
      console.log('HOWWW', accounts)
      partyA = accounts[0]
      partyB = accounts[1]
      ingridAddress = accounts[2]
      describe('should recover the address of person who signed', () => {
        it('should return signer 0xC501E4e8aC8da07D9eC89122d375412477f561B1', () => {
          const signer = Connext.recoverSignerFromVCStateUpdate({
            sig: '0xa72b2506d43e4e6e506c19c3f0400d88df7d138d0dcb54e274d415c13bc60c235b22988de3867f566856318f1783cc08324fd9c5a650631010aa7eb22bcc2a5b00',
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
        describe('subchanAI', () => {
          it('does throw an error when subchanAI is not a strict hex', async () => {
            try {
              Connext.recoverSignerFromVCStateUpdate({
                sig: '0xc1912',
                vcId: '0xc1912',
                nonce: 100,
                partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                subchanAI: 'I am ai'
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[recoverSignerFromVCStateUpdate][subchanAI] : I am ai is not hex string prefixed with 0x.`
              )
            }
          })
        })
        describe('subchanBI', () => {
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
                subchanBI: 'invalid'
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[recoverSignerFromVCStateUpdate][subchanBI] : invalid is not hex string prefixed with 0x.`
              )
            }
          })
        })
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
      describe('subchanAI', () => {
        it('does throw an error when subchanAI is not a strict hex', async () => {
          try {
            Connext.createVCStateUpdateFingerprint({
              vcId: '0xc1912',
              nonce: 100,
              partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              subchanAI: 'I am ai'
            })
          } catch (e) {
            assert.equal(
              e.message,
              `[createVCStateUpdateFingerprint][subchanAI] : I am ai is not hex string prefixed with 0x.`
            )
          }
        })
      })
      describe('subchanBI', () => {
        it('does throw an error when subchanBI is not a strict hex', async () => {
          try {
            Connext.createVCStateUpdateFingerprint({
              vcId: '0xc1912',
              nonce: 100,
              partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              subchanAI: '0xc1912',
              subchanBI: 'invalid'
            })
          } catch (e) {
            assert.equal(
              e.message,
              `[createVCStateUpdateFingerprint][subchanBI] : invalid is not hex string prefixed with 0x.`
            )
          }
        })
      })
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
    mock = new MockAdapter(axios)
  })
  it('getLatestLedgerStateUpdate', async () => {
    const client = new Connext({ web3 }, createFakeWeb3())
    client.ingridUrl = 'ingridUrl'
    const ledgerChannelId = 'address'
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
    const res = await client.getLatestLedgerStateUpdate('address')
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
    assert.deepEqual(res, { data: {} })
  })

  it('fastCloseVcHandler', async () => {
    const client = new Connext({ web3 }, createFakeWeb3())
    const params = { vcId: 'vcId', sigA: 'sigA' }
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
    const params = { channelId: 'channelId' }
    const url = `${client.ingridUrl}/virtualchannel/${params.channelId}/lateststate/doublesigned`
    const mock = new MockAdapter(axios)
    mock.onGet().reply(() => {
      return [
        200,
        {
          data: {}
        }
      ]
    })
    const result = await client.getLatestVirtualDoubleSignedStateUpdate(params)
    assert.deepEqual(result, { data: {} })
  })

  it('cosignVcStateUpdateHandler', async () => {
    const client = new Connext({ web3 }, createFakeWeb3())
    client.ingridUrl = 'ingridUrl'
    const params = { channelId: 'channelId', sig: 'sig', balance: 12 }
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
    const params = { channelId: 'channelId', sig: 'sig', balance: 12 }
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
    const params = { channelId: 'channelId', sig: 'sig', vcRootHash: 1212033 }
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
      sig: 'sig',
      balanceA: 100,
      to: 230,
      vcRootHash: 'hashKey'
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
    assert.deepEqual(result, {data: {}})
  })
})
