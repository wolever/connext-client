const sinon = require('sinon')
const nock = require('nock')
const Web3 = require('web3')
const Connext = require('../../src/Connext')

export function createStubbedContract () {
  const sendTxStub = {
    send: sinon.stub().resolves({
      transactionHash: 'transactionHash',
      blockNumber: 'blockNumber'
    })
  }

  const contractMethods = {
    createChannel: sinon.stub().returns(sendTxStub),
    joinChannel: sinon.stub().returns(sendTxStub),
    deposit: sinon.stub().returns(sendTxStub),
    consensusCloseChannel: sinon.stub().returns(sendTxStub),
    updateLCState: sinon.stub().returns(sendTxStub),
    initVCstate: sinon.stub().returns(sendTxStub),
    settleVC: sinon.stub().returns(sendTxStub),
    closeVirtualChannel: sinon.stub().returns(sendTxStub),
    byzantineCloseChannel: sinon.stub().returns(sendTxStub)
  }

  return contractMethods
}

export async function createStubbedHub (baseUrl, type) {
  const web3 = new Web3('http://localhost:8545')
  const accounts = await web3.eth.getAccounts()
  const ingridAddress = accounts[0]
  const partyA = accounts[1]

  const channelId1 =
    '0x1000000000000000000000000000000000000000000000000000000000000000'

  let stubHub = nock(baseUrl).persist(true)
  // get challenge timer
  stubHub
    // define the method to be intercepted
    .get('/ledgerchannel/challenge')
    // respond with a OK and the specified JSON response
    .reply(200, {
      challenge: 3600
    })
  // get open ledger channels
  switch (type) {
    case 'OPEN_LC':
      stubHub
        .get(`/ledgerchannel/a/${partyA.toLowerCase()}?status=LCS_OPENED`)
        .reply(200, [
          {
            channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
            partyA: partyA.toLowerCase(),
            partyI: ingridAddress.toLowerCase(),
            state: 'LCS_OPENED',
            balanceA: Web3.utils.toWei('5', 'ether'),
            balanceI: '0',
            nonce: 0,
            openVcs: 0,
            vcRootHash: Connext.generateVcRootHash({ vc0s: [] })
          }
        ])
      break
    case 'NO_LC':
      stubHub
        .get(`/ledgerchannel/a/${partyA.toLowerCase()}?status=LCS_OPENED`)
        .reply(200, {
          data: []
        })
      break
    default:
      break
  }

  stubHub.get(`/ledgerchannel/${channelId1}`).reply(200, {
    channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
    partyA: partyA.toLowerCase(),
    partyI: ingridAddress.toLowerCase(),
    state: 'LCS_OPENED',
    balanceA: Web3.utils.toWei('5', 'ether'),
    balanceI: '0',
    nonce: 0,
    openVcs: 0,
    vcRootHash: Connext.generateVcRootHash({ vc0s: [] })
  })

  return stubHub
}
