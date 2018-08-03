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
  const partyB = accounts[2]
  // channel IDs
  const channelId1 =
    '0x1000000000000000000000000000000000000000000000000000000000000000'
  const channelId2 =
    '0x2000000000000000000000000000000000000000000000000000000000000000'
  const channelId3 =
    '0x3000000000000000000000000000000000000000000000000000000000000000'
  // thread IDs
  const threadId1 =
    '0x0100000000000000000000000000000000000000000000000000000000000000'
  const threadId2 =
    '0x0200000000000000000000000000000000000000000000000000000000000000'
  const threadId3 =
    '0x0300000000000000000000000000000000000000000000000000000000000000'

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
            ethBalanceA: Web3.utils.toWei('5', 'ether'),
            ethBalanceI: '0',
            tokenBalanceA: Web3.utils.toWei('5', 'ether'),
            tokenBalanceI: '0',
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
  // get channel 1 by ID
  // ETH_TOKEN lc
  stubHub.get(`/ledgerchannel/${channelId1}`).reply(200, {
    channelId: channelId1,
    partyA: partyA.toLowerCase(),
    partyI: ingridAddress.toLowerCase(),
    state: 'LCS_OPENED',
    ethBalanceA: Web3.utils.toWei('5', 'ether'),
    ethBalanceI: '0',
    tokenBalanceA: Web3.utils.toWei('5', 'ether'),
    tokenBalanceI: '0',
    nonce: 0,
    openVcs: 0,
    vcRootHash: Connext.generateVcRootHash({ vc0s: [] })
  })

  // ETH lc
  stubHub.get(`/ledgerchannel/${channelId2}`).reply(200, {
    channelId: channelId2,
    partyA: partyA.toLowerCase(),
    partyI: ingridAddress.toLowerCase(),
    state: 'LCS_OPENED',
    ethBalanceA: Web3.utils.toWei('5', 'ether'),
    ethBalanceI: '0',
    tokenBalanceA: '0',
    tokenBalanceI: '0',
    nonce: 0,
    openVcs: 0,
    vcRootHash: Connext.generateVcRootHash({ vc0s: [] })
  })

  // TOKEN lc
  stubHub.get(`/ledgerchannel/${channelId3}`).reply(200, {
    channelId: channelId3,
    partyA: partyA.toLowerCase(),
    partyI: ingridAddress.toLowerCase(),
    state: 'LCS_OPENED',
    ethBalanceA: '0',
    ethBalanceI: '0',
    tokenBalanceA: Web3.utils.toWei('5', 'ether'),
    tokenBalanceI: '0',
    nonce: 0,
    openVcs: 0,
    vcRootHash: Connext.generateVcRootHash({ vc0s: [] })
  })

  // get thread 1 by ID (nonce = 0)
  // ETH_TOKEN vc
  stubHub.get(`/virtualchannel/${threadId1}`).reply(200, {
    channelId: threadId1,
    partyA: partyA.toLowerCase(),
    partyB: partyB.toLowerCase(),
    state: 'VCS_OPENING',
    ethBalanceA: Web3.utils.toWei('1', 'ether'),
    ethBalanceB: '0',
    tokenBalanceA: Web3.utils.toWei('1', 'ether'),
    tokenBalanceB: '0',
    nonce: 0
  })

  // ETH VC
  stubHub.get(`/virtualchannel/${threadId2}`).reply(200, {
    channelId: threadId2,
    partyA: partyA.toLowerCase(),
    partyB: partyB.toLowerCase(),
    state: 'VCS_OPENING',
    ethBalanceA: Web3.utils.toWei('1', 'ether'),
    ethBalanceB: '0',
    tokenBalanceA: '0',
    tokenBalanceB: '0',
    nonce: 0
  })

  // TOKEN VC
  stubHub.get(`/virtualchannel/${threadId3}`).reply(200, {
    channelId: threadId3,
    partyA: partyA.toLowerCase(),
    partyB: partyB.toLowerCase(),
    state: 'VCS_OPENING',
    ethBalanceA: '0',
    ethBalanceB: '0',
    tokenBalanceA: Web3.utils.toWei('1', 'ether'),
    tokenBalanceB: '0',
    nonce: 0
  })

  // post to payments endpoint
  // 1 payment, return array of 1
  stubHub
    .post(`/payments/`, body => {
      return body.payments.length === 1
    })
    .reply(200, [
      {
        id: 2,
        balanceA: '20000',
        balanceB: '6000',
        nonce: 2,
        sigA: '0x6e4f3d1782440461d72436afb5f087b74db3d034a9623cc0c10e0819dba7d2eb45818f11d2ceaf4e647eae4e946115bcb22cb99d5b1c6e134efbbc7629898e8f01',
        sigB: null
      }
    ])
  // 1 payment, return array of 2
  stubHub
    .post(`/payments/`, body => {
      return body.payments.length === 2
    })
    .reply(200, [
      {
        id: 2,
        balanceA: '20000',
        balanceB: '6000',
        nonce: 2,
        sigA: '0x6e4f3d1782440461d72436afb5f087b74db3d034a9623cc0c10e0819dba7d2eb45818f11d2ceaf4e647eae4e946115bcb22cb99d5b1c6e134efbbc7629898e8f01',
        sigB: null
      },
      {
        id: 3,
        balanceA: '20000',
        balanceB: '6000',
        nonce: 2,
        sigA: '0x6e4f3d1782440461d72436afb5f087b74db3d034a9623cc0c10e0819dba7d2eb45818f11d2ceaf4e647eae4e946115bcb22cb99d5b1c6e134efbbc7629898e8f01',
        sigB: null
      }
    ])

  return stubHub
}
