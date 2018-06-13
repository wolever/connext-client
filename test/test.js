const MerkleTree = require('../helpers/MerkleTree')
const Utils = require('../helpers/utils')
const Web3 = require('web3')
const artifacts = require('../artifacts/Ledger.json')
const { getChannelManager, getLedgerChannel, initWeb3 } = require('../web3')

let web3
let partyA
let partyB
let ingridAddress
let contractAddress
let watcherUrl
let ingridUrl

describe('Connext', async () => {
  before(async () => {
    // set constructor params
    await initWeb3()
    web3 = getWeb3()
    const accounts = await web3.eth.getAccounts()
    partyA = accounts[0]
    partyB = accounts[1]
    ingridAddress = accounts[2]
  })

  describe('#register()', () => {
    it('should error out if provided invalid initial deposit', async () => {})
  })
})
