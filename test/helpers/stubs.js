const sinon = require('sinon')
const nock = require('nock')
const Web3 = require('web3')

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

export async function createStubbedHub (baseUrl) {
  const web3 = new Web3('http://localhost:8545')
  const accounts = await web3.eth.getAccounts()
  const ingridAddress = accounts[0]
  const partyA = accounts[1]

  let stubHub = nock(baseUrl)
    .persist(true)
    // define the method to be intercepted
    .get('/ledgerchannel/challenge')
    // respond with a OK and the specified JSON response
    .reply(200, {
      challenge: 3600
    })

  stubHub
    .get(`/ledgerchannel/a/${partyA.toLowerCase()}?status=LCS_OPENED`)
    .reply(200, {
      data: []
    })
  return stubHub
}
