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
    channelOpenTimout: sinon.stub().returns(sendTxStub),  
    deposit: sinon.stub().returns(sendTxStub),
    consensusCloseChannel: sinon.stub().returns(sendTxStub),
    updateChannelState: sinon.stub().returns(sendTxStub),
    initThreadState: sinon.stub().returns(sendTxStub),
    settleThread: sinon.stub().returns(sendTxStub),
    closeThread: sinon.stub().returns(sendTxStub),
    byzantineCloseChannel: sinon.stub().returns(sendTxStub)
  }

  return contractMethods
}

export async function createStubbedHub (
  baseUrl,
  channelType,
  threadType = 'NOT_UPDATED'
) {
  const web3 = new Web3('http://localhost:8545')
  const accounts = await web3.eth.getAccounts()
  const ingridAddress = accounts[0]
  const partyA = accounts[1]
  const partyB = accounts[2]
  const partyC = accounts[3]
  const partyD = accounts[4]
  // channel IDs
  const channelId1 =
    '0x1000000000000000000000000000000000000000000000000000000000000000'
  const channelId2 =
    '0x2000000000000000000000000000000000000000000000000000000000000000'
  const channelId3 =
    '0x3000000000000000000000000000000000000000000000000000000000000000'
  const channelId4 =
    '0x4000000000000000000000000000000000000000000000000000000000000000'

  // thread IDs
  const threadId1 =
    '0x0100000000000000000000000000000000000000000000000000000000000000'
  const threadId2 =
    '0x0200000000000000000000000000000000000000000000000000000000000000'
  const threadId3 =
    '0x0300000000000000000000000000000000000000000000000000000000000000'

  let stubHub = nock(baseUrl).persist(true)

  // // get challenge timer
  // stubHub
  //   // define the method to be intercepted
  //   .get('/ledgerchannel/challenge')
  //   // respond with a OK and the specified JSON response
  //   .reply(200, {
  //     challenge: 3600
  //   })

  // get open channels by partyA
  switch (channelType) {
    case 'OPEN_CHANNEL_OPEN_THREAD':
      // partyA LC has ETH/TOKEN
      stubHub
        .get(`/channel/a/${partyA.toLowerCase()}`)
        .reply(200, [
          {
            channelId: channelId1,
            partyA: partyA.toLowerCase(),
            partyI: ingridAddress.toLowerCase(),
            nonce: 1,
            weiBalanceA: Web3.utils.toWei('4', 'ether').toString(),
            weiBalanceI: '0',
            token: '0x0100000000000000000000000000000000000000000000000000000000000000',
            tokenBalanceA: Web3.utils.toWei('4', 'ether').toString(),
            tokenBalanceI: '0',
            status: 'JOINED',
            numOpenThread: 1,
            updateTimeout: 0,
            threadRootHash: Connext.generateThreadRootHash({
              threadInitialStates: [
                {
                  channelId: threadId1,
                  partyA: partyA.toLowerCase(),
                  partyB: partyB.toLowerCase(),
                  nonce: 0,
                  weiBond: Web3.utils.toWei('1', 'ether').toString(),
                  tokenBond: Web3.utils.toWei('1', 'ether').toString(),
                  weiBalanceA: Web3.utils.toWei('1', 'ether').toString(),
                  weiBalanceB: '0',
                  tokenBalanceA: Web3.utils.toWei('1', 'ether').toString(),
                  tokenBalanceB: '0',
                }
              ]
            })
          }
        ])
      // partyC LC has ETH only
      stubHub
        .get(`/channel/a/${partyC.toLowerCase()}`)
        .reply(200, [
          {
            channelId: channelId3,
            partyA: partyC.toLowerCase(),
            partyI: ingridAddress.toLowerCase(),
            status: 'JOINED',
            nonce: 1,
            updateTimeout: 0,
            numOpenThread: 1,
            token: '0x0100000000000000000000000000000000000000000000000000000000000000',
            weiBalanceA: Web3.utils.toWei('4', 'ether').toString(),
            weiBalanceI: '0',
            tokenBalanceA: '0',
            tokenBalanceI: '0',
            threadRootHash: Connext.generateThreadRootHash({
              threadInitialStates: [
                {
                  channelId: threadId2, // eth only thread
                  partyA: partyC.toLowerCase(),
                  partyB: partyB.toLowerCase(),
                  nonce: 0,
                  weiBond: Web3.utils.toWei('1', 'ether').toString(),
                  tokenBond: '0',
                  weiBalanceA: Web3.utils.toWei('1', 'ether').toString(),
                  weiBalanceB: '0',
                  tokenBalanceA: '0',
                  tokenBalanceB: '0'
                }
              ]
            })
          }
        ])
      // partyD LC has TOKEN only
      stubHub
        .get(`/channel/a/${partyD.toLowerCase()}`)
        .reply(200, [
          {
            channelId: channelId4,
            partyA: partyD.toLowerCase(),
            partyI: ingridAddress.toLowerCase(),
            status: 'JOINED',
            nonce: 1,
            updateTimeout: 0,
            numOpenThread: 1,
            token: '0x0100000000000000000000000000000000000000000000000000000000000000',
            weiBalanceA: '0',
            weiBalanceI: '0',
            tokenBalanceA: Web3.utils.toWei('4', 'ether').toString(),
            tokenBalanceI: '0',
            threadRootHash: Connext.generateThreadRootHash({
              threadInitialStates: [
                {
                  channelId: threadId3, // eth only thread
                  partyA: partyD.toLowerCase(),
                  partyB: partyB.toLowerCase(),
                  nonce: 0,
                  weiBond: '0',
                  tokenBond: Web3.utils.toWei('1', 'ether').toString(),
                  weiBalanceA: '0',
                  weiBalanceB: '0',
                  tokenBalanceA: Web3.utils.toWei('1', 'ether').toString(),
                  tokenBalanceB: '0'
                }
              ]
            })
          }
        ])
      // partyB LC is recieving all threads
      stubHub
        .get(`/channel/a/${partyB.toLowerCase()}`)
        .reply(200, [
          {
            channelId: channelId2,
            partyA: partyB.toLowerCase(),
            partyI: ingridAddress.toLowerCase(),
            status: 'JOINED',
            nonce: 3,
            updateTimeout: 0,
            numOpenThread: 3,
            token: '0x0100000000000000000000000000000000000000000000000000000000000000',
            weiBalanceA: '0',
            weiBalanceI: Web3.utils.toWei('5', 'ether').toString(),
            tokenBalanceA: '0',
            tokenBalanceI: Web3.utils.toWei('5', 'ether').toString(),
            threadRootHash: Connext.generateThreadRootHash({
              threadInitialStates: [
                {
                  channelId: threadId1, // eth + token thread
                  partyA: partyA.toLowerCase(),
                  partyB: partyB.toLowerCase(),
                  nonce: 0,
                  weiBond: Web3.utils.toWei('1', 'ether').toString(),
                  tokenBond: Web3.utils.toWei('1', 'ether').toString(),
                  weiBalanceA: Web3.utils.toWei('1', 'ether').toString(),
                  weiBalanceB: '0',
                  tokenBalanceA: Web3.utils.toWei('1', 'ether').toString(),
                  tokenBalanceB: '0'
                },
                {
                  channelId: threadId2, // eth only thread
                  partyA: partyC.toLowerCase(),
                  partyB: partyB.toLowerCase(),
                  nonce: 0,
                  weiBond: Web3.utils.toWei('1', 'ether').toString(),
                  tokenBond: '0',
                  weiBalanceA: Web3.utils.toWei('1', 'ether').toString(),
                  weiBalanceB: '0',
                  tokenBalanceA: '0',
                  tokenBalanceB: '0'
                },
                {
                  channelId: threadId3, // token only thread
                  partyA: partyD.toLowerCase(),
                  partyB: partyB.toLowerCase(),
                  nonce: 0,
                  weiBond: '0',
                  tokenBond: Web3.utils.toWei('1', 'ether').toString(),
                  weiBalanceA: '0',
                  weiBalanceB: '0',
                  tokenBalanceA: Web3.utils.toWei('1', 'ether').toString(),
                  tokenBalanceB: '0'
                }
              ]
            })
          }
        ])
      break
    case 'OPEN_CHANNEL_NO_THREAD':
      stubHub
        .get(`/channel/a/${partyA.toLowerCase()}`)
        .reply(200, [
          {
            channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
            partyA: partyA.toLowerCase(),
            partyI: ingridAddress.toLowerCase(),
            status: 'JOINED',
            nonce: 0,
            updateTimeout: 0,
            numOpenThread: 0,
            token: '0x0100000000000000000000000000000000000000000000000000000000000000',
            weiBalanceA: Web3.utils.toWei('5', 'ether').toString(),
            weiBalanceI: '0',
            tokenBalanceA: Web3.utils.toWei('5', 'ether').toString(),
            tokenBalanceI: '0',
            threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] })
          }
        ])
      stubHub
        .get(`/channel/a/${partyB.toLowerCase()}`)
        .reply(200, [
          {
            channelId: '0x2000000000000000000000000000000000000000000000000000000000000000',
            partyA: partyB.toLowerCase(),
            partyI: ingridAddress.toLowerCase(),
            status: 'JOINED',
            weiBalanceA: Web3.utils.toWei('5', 'ether').toString(),
            weiBalanceI: '0',
            tokenBalanceA: Web3.utils.toWei('5', 'ether').toString(),
            tokenBalanceI: '0',
            nonce: 0,
            updateTimeout: 0,
            numOpenThread: 0,
            token: '0x0100000000000000000000000000000000000000000000000000000000000000',
            threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] })
          }
        ])
      break

    case 'NO_CHANNEL':
      stubHub
        .get(`/channel/a/${partyA.toLowerCase()}`)
        .reply(200, {
          data: []
        })
      stubHub
        .get(`/channel/a/${partyB.toLowerCase()}`)
        .reply(200, {
          data: []
        })
      stubHub
        .get(`/channel/a/${partyC.toLowerCase()}`)
        .reply(200, {
          data: []
        })
      stubHub
        .get(`/channel/a/${partyD.toLowerCase()}`)
        .reply(200, {
          data: []
        })
      break

      case 'OPEN_CHANNEL_CLOSED_THREAD':
      // channel 1 - ETH/TOKEN (viewer)
      stubHub.get(`/channel/a/${partyA.toLowerCase()}`).reply(200, [{
        channelId: channelId1,
        partyA: partyA.toLowerCase(),
        partyI: ingridAddress.toLowerCase(),
        status: 'JOINED',
        weiBalanceA: Web3.utils.toWei('4.9', 'ether').toString(),
        weiBalanceI: Web3.utils.toWei('0.1', 'ether').toString(),
        tokenBalanceA: Web3.utils.toWei('4.9', 'ether').toString(),
        tokenBalanceI: Web3.utils.toWei('0.1', 'ether').toString(),
        nonce: 2,
        updateTimeout: 0,
        numOpenThread: 0,
        token: '0x0100000000000000000000000000000000000000000000000000000000000000',
        threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] })
      }])

      // channel 2 - receiver
      stubHub.get(`/channel/a/${partyB.toLowerCase()}`).reply(200, [{
        channelId: channelId2,
        partyA: partyB.toLowerCase(),
        partyI: ingridAddress.toLowerCase(),
        status: 'JOINED',
        weiBalanceA: Web3.utils.toWei('0.2', 'ether').toString(),
        weiBalanceI: '0',
        tokenBalanceA: Web3.utils.toWei('0.2', 'ether').toString(),
        tokenBalanceI: '0',
        nonce: 6, // open thread 1-3, close thread 1-3
        updateTimeout: 0,
        numOpenThread: 0,
        token: '0x0100000000000000000000000000000000000000000000000000000000000000',
        threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] })
      }])

      // channel 3 - ETH (viewer)
      stubHub.get(`/channel/a/${partyC.toLowerCase()}`).reply(200, [{
        channelId: channelId3,
        partyA: partyC.toLowerCase(),
        partyI: ingridAddress.toLowerCase(),
        status: 'JOINED',
        weiBalanceA: Web3.utils.toWei('4.9', 'ether').toString(),
        weiBalanceI: Web3.utils.toWei('0.1', 'ether').toString(),
        tokenBalanceA: '0',
        tokenBalanceI: '0',
        nonce: 2,
        updateTimeout: 0,
        numOpenThread: 0,
        token: '0x0100000000000000000000000000000000000000000000000000000000000000',
        threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] })
      }])

      // channel 4 - TOKEN (viewer)
      stubHub.get(`/channel/a/${partyD.toLowerCase()}`).reply(200, [{
        channelId: channelId4,
        partyA: partyD.toLowerCase(),
        partyI: ingridAddress.toLowerCase(),
        status: 'JOINED',
        weiBalanceA: '0',
        weiBalanceI: '0',
        tokenBalanceA: Web3.utils.toWei('4.9', 'ether').toString(),
        tokenBalanceI: Web3.utils.toWei('0.1', 'ether').toString(),
        nonce: 2,
        updateTimeout: 0,
        numOpenThread: 0,
        token: '0x0100000000000000000000000000000000000000000000000000000000000000',
        threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] })
      }])
      break

    default:
      break
  }

  // get thread initial states by lc id
  // get ledger channels by id
  switch (channelType) {
    case 'OPEN_CHANNEL_OPEN_THREAD':
      // add initial states endpoints
      stubHub.get(`/channel/${channelId1}/threadinitialstates`).reply(200, [
        {
          channelId: threadId1,
          partyA: partyA.toLowerCase(),
          partyB: partyB.toLowerCase(),
          partyI: partyI.toLowerCase(),
          subchanA: channelId1,
          subchanB: channelId2,
          nonce: 0,
          weiBalanceA: Web3.utils.toWei('1', 'ether').toString(),
          weiBalanceB: '0',
          tokenBalanceA: Web3.utils.toWei('1', 'ether').toString(),
          tokenBalanceB: '0',
          status: 'JOINED'
        }
      ])
      stubHub.get(`/channel/${channelId2}/threadinitialstates`).reply(200, [
        {
          channelId: threadId1, // eth + token thread
          partyA: partyA.toLowerCase(),
          partyB: partyB.toLowerCase(),
          partyI: partyI.toLowerCase(),
          subchanA: channelId2,
          subchanB: channelId1,
          nonce: 0,
          weiBalanceA: Web3.utils.toWei('1', 'ether').toString(),
          weiBalanceB: '0',
          tokenBalanceA: Web3.utils.toWei('1', 'ether').toString(),
          tokenBalanceB: '0',
          status: 'JOINED'
        },
        {
          channelId: threadId2, // eth only thread
          partyA: partyC.toLowerCase(),
          partyB: partyB.toLowerCase(),
          partyI: partyI.toLowerCase(),
          subchanA: channelId2,
          subchanB: channelId3,
          nonce: 0,
          weiBalanceA: Web3.utils.toWei('1', 'ether').toString(),
          weiBalanceB: '0',
          tokenBalanceA: '0',
          tokenBalanceB: '0',
          status: 'JOINED'
        },
        {
          channelId: threadId3, // token only thread
          partyA: partyD.toLowerCase(),
          partyB: partyB.toLowerCase(),
          partyI: partyI.toLowerCase(),
          subchanA: channelId2,
          subchanB: channelId4,
          nonce: 0,
          weiBalanceA: '0',
          weiBalanceB: '0',
          tokenBalanceA: Web3.utils.toWei('1', 'ether').toString(),
          tokenBalanceB: '0',
          status: 'JOINED'
        }
      ])
      stubHub.get(`/channel/${channelId3}/threadinitialstates`).reply(200, [
        {
          channelId: threadId2,
          partyA: partyC.toLowerCase(),
          partyB: partyB.toLowerCase(),
          partyI: partyI.toLowerCase(),
          subchanA: channelId3,
          subchanB: channelId2,
          nonce: 0,
          weiBalanceA: Web3.utils.toWei('1', 'ether').toString(),
          weiBalanceB: '0',
          tokenBalanceA: '0',
          tokenBalanceB: '0',
          status: 'JOINED'
        }
      ])
      stubHub.get(`/channel/${channelId4}/threadinitialstates`).reply(200, [
        {
          channelId: threadId3,
          partyA: partyD.toLowerCase(),
          partyB: partyB.toLowerCase(),
          partyI: partyI.toLowerCase(),
          subchanA: channelId4,
          subchanB: channelId2,
          nonce: 0,
          weiBalanceA: '0',
          weiBalanceB: '0',
          tokenBalanceA: Web3.utils.toWei('1', 'ether').toString(),
          tokenBalanceB: '0',
          status: 'JOINED'
        }
      ])

      // channel 1 - ETH/TOKEN (viewer)
      stubHub.get(`/channel/${channelId1}`).reply(200, {
        channelId: channelId1,
        partyA: partyA.toLowerCase(),
        partyI: ingridAddress.toLowerCase(),
        status: 'JOINED',
        weiBalanceA: Web3.utils.toWei('4', 'ether').toString(),
        weiBalanceI: '0',
        tokenBalanceA: Web3.utils.toWei('4', 'ether').toString(),
        tokenBalanceI: '0',
        nonce: 1,
        numOpenThread: 1,
        updateTimeout: 0,
        token: '0x0100000000000000000000000000000000000000000000000000000000000000',
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: [
            {
              channelId: threadId1,
              partyA: partyA.toLowerCase(),
              partyB: partyB.toLowerCase(),
              nonce: 0,
              weiBond: Web3.utils.toWei('1', 'ether').toString(),
              tokenBond: Web3.utils.toWei('1', 'ether').toString(),
              weiBalanceA: Web3.utils.toWei('1', 'ether').toString(),
              weiBalanceB: '0',
              tokenBalanceA: Web3.utils.toWei('1', 'ether').toString(),
              tokenBalanceB: '0'
            }
          ]
        })
      })

      // channel 2 - receiver
      stubHub.get(`/channel/${channelId2}`).reply(200, {
        channelId: channelId2,
        partyA: partyB.toLowerCase(),
        partyI: ingridAddress.toLowerCase(),
        status: 'JOINED',
        weiBalanceA: '0',
        weiBalanceI: Web3.utils.toWei('5', 'ether').toString(),
        tokenBalanceA: '0',
        tokenBalanceI: Web3.utils.toWei('5', 'ether').toString(),
        nonce: 3,
        numOpenThread: 3,
        updateTimeout: 0,
        token: '0x0100000000000000000000000000000000000000000000000000000000000000',
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: [
            {
              channelId: threadId1, // eth + token thread
              partyA: partyA.toLowerCase(),
              partyB: partyB.toLowerCase(),
              nonce: 0,
              weiBond: Web3.utils.toWei('1', 'ether').toString(),
              tokenBond: Web3.utils.toWei('1', 'ether').toString(),
              weiBalanceA: Web3.utils.toWei('1', 'ether').toString(),
              weiBalanceB: '0',
              tokenBalanceA: Web3.utils.toWei('1', 'ether').toString(),
              tokenBalanceB: '0'
            },
            {
              channelId: threadId2, // eth only thread
              partyA: partyC.toLowerCase(),
              partyB: partyB.toLowerCase(),
              nonce: 0,
              weiBond: Web3.utils.toWei('1', 'ether').toString(),
              tokenBond: '0',
              weiBalanceA: Web3.utils.toWei('1', 'ether').toString(),
              weiBalanceB: '0',
              tokenBalanceA: '0',
              tokenBalanceB: '0'
            },
            {
              channelId: threadId3, // token only thread
              partyA: partyD.toLowerCase(),
              partyB: partyB.toLowerCase(),
              nonce: 0,
              weiBond: '0',
              tokenBond: Web3.utils.toWei('1', 'ether').toString(),
              weiBalanceA: '0',
              weiBalanceB: '0',
              tokenBalanceA: Web3.utils.toWei('1', 'ether').toString(),
              tokenBalanceB: '0'
            }
          ]
        })
      })

      // channel 3 - ETH (viewer)
      stubHub.get(`/channel/${channelId3}`).reply(200, {
        channelId: channelId3,
        partyA: partyC.toLowerCase(),
        partyI: ingridAddress.toLowerCase(),
        status: 'JOINED',
        weiBalanceA: Web3.utils.toWei('4', 'ether').toString(),
        weiBalanceI: '0',
        tokenBalanceA: '0',
        tokenBalanceI: '0',
        nonce: 1,
        numOpenThread: 1,
        updateTimeout: 0,
        token: '0x0100000000000000000000000000000000000000000000000000000000000000',
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: [
            {
              channelId: threadId2,
              partyA: partyC.toLowerCase(),
              partyB: partyB.toLowerCase(),
              nonce: 0,
              weiBond: Web3.utils.toWei('1', 'ether').toString(),
              tokenBond: '0',
              weiBalanceA: Web3.utils.toWei('1', 'ether').toString(),
              weiBalanceB: '0',
              tokenBalanceA: '0',
              tokenBalanceB: '0'
            }
          ]
        })
      })

      // channel 4 - TOKEN (viewer)
      stubHub.get(`/channel/${channelId4}`).reply(200, {
        channelId: channelId4,
        partyA: partyD.toLowerCase(),
        partyI: ingridAddress.toLowerCase(),
        status: 'JOINED',
        weiBalanceA: '0',
        weiBalanceI: '0',
        tokenBalanceA: Web3.utils.toWei('4', 'ether').toString(),
        tokenBalanceI: '0',
        nonce: 1,
        numOpenThread: 1,
        updateTimeout: 0,
        token: '0x0100000000000000000000000000000000000000000000000000000000000000',
        threadRootHash: Connext.generateThreadRootHash({
          threadInitialStates: [
            {
              channelId: threadId3,
              partyA: partyA.toLowerCase(),
              partyB: partyB.toLowerCase(),
              nonce: 0,
              weiBond : '0',
              tokenBond: Web3.utils.toWei('1', 'ether').toString(),
              weiBalanceA: '0',
              weiBalanceB: '0',
              tokenBalanceA: Web3.utils.toWei('1', 'ether').toString(),
              tokenBalanceB: '0'
            }
          ]
        })
      })
      break

    case 'OPEN_CHANNEL_NO_THREAD':
      // add initial states endpoints
      stubHub.get(`/channel/${channelId1}/theadinitialstates`).reply(200, [])
      stubHub.get(`/channel/${channelId2}/threadinitialstates`).reply(200, [])
      stubHub.get(`/channel/${channelId3}/threadinitialstates`).reply(200, [])
      stubHub.get(`/channel/${channelId4}/threadinitialstates`).reply(200, [])

      // channel 1 - ETH/TOKEN (viewer)
      stubHub.get(`/channel/${channelId1}`).reply(200, {
        channelId: channelId1,
        partyA: partyA.toLowerCase(),
        partyI: ingridAddress.toLowerCase(),
        status: 'JOINED',
        weiBalanceA: Web3.utils.toWei('5', 'ether').toString(),
        weiBalanceI: '0',
        tokenBalanceA: Web3.utils.toWei('5', 'ether').toString(),
        tokenBalanceI: '0',
        nonce: 0,
        numOpenThread: 0,
        updateTimeout: 0,
        token: '0x0100000000000000000000000000000000000000000000000000000000000000',
        threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] })
      })

      // channel 2 - receiver
      stubHub.get(`/channel/${channelId2}`).reply(200, {
        channelId: channelId2,
        partyA: partyB.toLowerCase(),
        partyI: ingridAddress.toLowerCase(),
        status: 'JOINED',
        weiBalanceA: '0',
        weiBalanceI: Web3.utils.toWei('5', 'ether').toString(),
        tokenBalanceA: '0',
        tokenBalanceI: Web3.utils.toWei('5', 'ether').toString(),
        nonce: 0,
        numOpenThread: 0,
        updateTimeout: 0,
        token: '0x0100000000000000000000000000000000000000000000000000000000000000',
        threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] })
      })

      // channel 3 - ETH (viewer)
      stubHub.get(`/channel/${channelId3}`).reply(200, {
        channelId: channelId3,
        partyA: partyC.toLowerCase(),
        partyI: ingridAddress.toLowerCase(),
        status: 'JOINED',
        weiBalanceA: Web3.utils.toWei('5', 'ether').toString(),
        weiBalanceI: '0',
        tokenBalanceA: '0',
        tokenBalanceI: '0',
        nonce: 0,
        numOpenThread: 0,
        updateTimeout: 0,
        token: '0x0100000000000000000000000000000000000000000000000000000000000000',
        threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] })
      })

      // channel 4 - TOKEN (viewer)
      stubHub.get(`/channel/${channelId4}`).reply(200, {
        channelId: channelId4,
        partyA: partyD.toLowerCase(),
        partyI: ingridAddress.toLowerCase(),
        status: 'JOINED',
        weiBalanceA: '0',
        weiBalanceI: '0',
        tokenBalanceA: Web3.utils.toWei('5', 'ether').toString(),
        tokenBalanceI: '0',
        nonce: 0,
        numOpenThread: 0,
        updateTimeout: 0,
        token: '0x0100000000000000000000000000000000000000000000000000000000000000',
        threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] })
      })
      break

    case 'OPEN_LC_CLOSED_VC':
      // channel 1 - ETH/TOKEN (viewer)
      stubHub.get(`/channel/${channelId1}`).reply(200, {
        channelId: channelId1,
        partyA: partyA.toLowerCase(),
        partyI: ingridAddress.toLowerCase(),
        status: 'JOINED',
        weiBalanceA: Web3.utils.toWei('4.9', 'ether').toString(),
        weiBalanceI: Web3.utils.toWei('0.1', 'ether').toString(),
        tokenBalanceA: Web3.utils.toWei('4.9', 'ether').toString(),
        tokenBalanceI: Web3.utils.toWei('0.1', 'ether').toString(),
        nonce: 2,
        numOpenThread: 0,
        updateTimeout: 0,
        token: '0x0100000000000000000000000000000000000000000000000000000000000000',
        threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] })
      })

      // channel 2 - receiver
      stubHub.get(`/channel/${channelId2}`).reply(200, {
        channelId: channelId2,
        partyA: partyB.toLowerCase(),
        partyI: ingridAddress.toLowerCase(),
        status: 'JOINED',
        weiBalanceA: Web3.utils.toWei('0.2', 'ether').toString(),
        weiBalanceI: '0',
        tokenBalanceA: Web3.utils.toWei('0.2', 'ether').toString(),
        tokenBalanceI: '0',
        nonce: 6, // open thread 1-3, close thread 1-3
        numOpenThread: 0,
        updateTimeout: 0,
        token: '0x0100000000000000000000000000000000000000000000000000000000000000',
        threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] })
      })

      // channel 3 - ETH (viewer)
      stubHub.get(`/channel/${channelId3}`).reply(200, {
        channelId: channelId3,
        partyA: partyC.toLowerCase(),
        partyI: ingridAddress.toLowerCase(),
        status: 'JOINED',
        weiBalanceA: Web3.utils.toWei('4.9', 'ether').toString(),
        weiBalanceI: Web3.utils.toWei('0.1', 'ether').toString(),
        tokenBalanceA: '0',
        tokenBalanceI: '0',
        nonce: 2,
        numOpenThread: 0,
        updateTimeout: 0,
        token: '0x0100000000000000000000000000000000000000000000000000000000000000',
        threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] })
      })

      // channel 4 - TOKEN (viewer)
      stubHub.get(`/channel/${channelId4}`).reply(200, {
        channelId: channelId4,
        partyA: partyD.toLowerCase(),
        partyI: ingridAddress.toLowerCase(),
        status: 'JOINED',
        weiBalanceA: '0',
        weiBalanceI: '0',
        tokenBalanceA: Web3.utils.toWei('4.9', 'ether').toString(),
        tokenBalanceI: Web3.utils.toWei('0.1', 'ether').toString(),
        nonce: 2,
        numOpenThread: 0,
        updateTimeout: 0,
        token: '0x0100000000000000000000000000000000000000000000000000000000000000',
        threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] })
      })
      break

    default:
      break
  }

  // maybe we wont need this..
  switch (threadType) {
    case 'NOT_UPDATED':
      // get thread 1 by ID (nonce = 0)
      // ETH_TOKEN vc
      stubHub.get(`/thread/${threadId1}`).reply(200, {
        channelId: threadId1,
        partyA: partyA.toLowerCase(),
        partyB: partyB.toLowerCase(),
        partyI: partyI.toLowerCase(),
        subchanA: channelId1,
        subchanB: channelId2,
        status: 'JOINED',
        weiBalanceA: Web3.utils.toWei('1', 'ether').toString(),
        weiBalanceB: '0',
        tokenBalanceA: Web3.utils.toWei('1', 'ether').toString(),
        tokenBalanceB: '0',
        nonce: 0
      })

      // ETH VC
      stubHub.get(`/thread/${threadId2}`).reply(200, {
        channelId: threadId2,
        partyA: partyC.toLowerCase(),
        partyB: partyB.toLowerCase(),
        partyI: partyI.toLowerCase(),
        subchanA: channelId3,
        subchanB: channelId2,
        status: 'JOINED',
        weiBalanceA: Web3.utils.toWei('1', 'ether').toString(),
        weiBalanceB: '0',
        tokenBalanceA: '0',
        tokenBalanceB: '0',
        nonce: 0
      })

      // TOKEN VC
      stubHub.get(`/thread/${threadId3}`).reply(200, {
        channelId: threadId3,
        partyA: partyD.toLowerCase(),
        partyB: partyB.toLowerCase(),
        partyI: partyI.toLowerCase(),
        subchanA: channelId4,
        subchanB: channelId2,
        status: 'JOINED',
        weiBalanceA: '0',
        weiBalanceB: '0',
        tokenBalanceA: Web3.utils.toWei('1', 'ether').toString(),
        tokenBalanceB: '0',
        nonce: 0
      })

      // add get latest thread state endpoint
      // ETH/TOKEN
      let sigA = await web3.eth.sign(
        Connext.createThreadStateUpdateFingerprint({
          channelId: threadId1,
          partyA,
          partyB,
          weiBond: Web3.utils.toWei('1', 'ether').toString(),
          tokenBond: Web3.utils.toWei('1', 'ether').toString(),
          weiBalanceA: Web3.utils.toWei('1', 'ether').toString(),
          weiBalanceB: Web3.utils.toBN('0'),
          tokenBalanceA: Web3.utils.toWei('1', 'ether').toString(),
          tokenBalanceB: Web3.utils.toBN('0'),
          nonce: 0
        }),
        partyA
      )
      stubHub.get(`/thread/${threadId1}/update/latest`).reply(200, {
        weiBalanceA: Web3.utils.toWei('1', 'ether').toString(),
        weiBalanceB: '0',
        tokenBalanceA: Web3.utils.toWei('1', 'ether').toString(),
        tokenBalanceB: '0',
        nonce: 0,
        sigA
      })

      // ETH
      sigA = await web3.eth.sign(
        Connext.createThreadStateUpdateFingerprint({
          channelId: threadId2,
          partyA: partyC,
          partyB,
          weiBond: Web3.utils.toWei('1', 'ether').toString(),
          tokenBond: '0',
          weiBalanceA: Web3.utils.toWei('1', 'ether').toString(),
          weiBalanceB: Web3.utils.toBN('0'),
          tokenBalanceA: Web3.utils.toBN('0'),
          tokenBalanceB: Web3.utils.toBN('0'),
          nonce: 0
        }),
        partyC
      )
      stubHub.get(`/thread/${threadId2}/update/latest`).reply(200, {
        weiBalanceA: Web3.utils.toWei('1', 'ether').toString(),
        weiBalanceB: '0',
        tokenBalanceA: '0',
        tokenBalanceB: '0',
        nonce: 0,
        sigA
      })

      // TOKEN
      sigA = await web3.eth.sign(
        Connext.createThreadStateUpdateFingerprint({
          channelId: threadId3,
          partyA: partyD,
          partyB,
          weiBond: '0',
          tokenBond: Web3.utils.toWei('1', 'ether').toString(),
          weiBalanceA: Web3.utils.toBN('0'),
          weiBalanceB: Web3.utils.toBN('0'),
          tokenBalanceA: Web3.utils.toWei('1', 'ether').toString(),
          tokenBalanceB: Web3.utils.toBN('0'),
          nonce: 0
        }),
        partyD
      )
      stubHub.get(`/thread/${threadId3}/update/latest`).reply(200, {
        weiBalanceA: '0',
        weiBalanceB: '0',
        tokenBalanceA: Web3.utils.toWei('1', 'ether').toString(),
        tokenBalanceB: '0',
        nonce: 0,
        sigA
      })

      break

    case 'UPDATED':
      // ETH_TOKEN vc
      stubHub.get(`/thread/${threadId1}`).reply(200, {
        channelId: threadId1,
        partyA: partyA.toLowerCase(),
        partyB: partyB.toLowerCase(),
        partyI: partyI.toLowerCase(),
        subchanA: channelId1,
        subchanB: channelId2,
        state: 'JOINED',
        weiBalanceA: Web3.utils.toWei('0.9', 'ether').toString(),
        weiBalanceB: Web3.utils.toWei('0.1', 'ether').toString(),
        tokenBalanceA: Web3.utils.toWei('0.9', 'ether').toString(),
        tokenBalanceB: Web3.utils.toWei('0.1', 'ether').toString(),
        nonce: 1
      })

      // ETH VC
      stubHub.get(`/thread/${threadId2}`).reply(200, {
        channelId: threadId2,
        partyA: partyC.toLowerCase(),
        partyB: partyB.toLowerCase(),
        partyI: partyI.toLowerCase(),
        subchanA: channelId3,
        subchanB: channelId2,
        state: 'JOINED',
        weiBalanceA: Web3.utils.toWei('0.9', 'ether').toString(),
        weiBalanceB: Web3.utils.toWei('0.1', 'ether').toString(),
        tokenBalanceA: '0',
        tokenBalanceB: '0',
        nonce: 1
      })

      // TOKEN VC
      stubHub.get(`/thread/${threadId3}`).reply(200, {
        channelId: threadId3,
        partyA: partyD.toLowerCase(),
        partyB: partyB.toLowerCase(),
        partyI: partyI.toLowerCase(),
        subchanA: channelId4,
        subchanB: channelId2,
        state: 'JOINED',
        weiBalanceA: '0',
        weiBalanceB: '0',
        tokenBalanceA: Web3.utils.toWei('0.9', 'ether').toString(),
        tokenBalanceB: Web3.utils.toWei('0.1', 'ether').toString(),
        nonce: 1
      })

      // add get latest thread state endpoint
      // ETH/TOKEN
      sigA = await web3.eth.sign(
        Connext.createThreadStateUpdateFingerprint({
          channelId: threadId1,
          partyA: partyA,
          partyB,
          weiBond: Web3.utils.toWei('1', 'ether'),
          tokenBond: Web3.utils.toWei('1', 'ether'),
          weiBalanceA: Web3.utils.toWei('0.9', 'ether'),
          weiBalanceB: Web3.utils.toWei('0.1', 'ether'),
          tokenBalanceA: Web3.utils.toWei('0.9', 'ether'),
          tokenBalanceB: Web3.utils.toWei('0.1', 'ether'),
          nonce: 1
        }),
        partyA
      )
      stubHub.get(`/thread/${threadId1}/update/latest`).reply(200, {
        weiBalanceA: Web3.utils.toWei('0.9', 'ether').toString(),
        weiBalanceB: Web3.utils.toWei('0.1', 'ether').toString(),
        tokenBalanceA: Web3.utils.toWei('0.9', 'ether').toString(),
        tokenBalanceB: Web3.utils.toWei('0.1', 'ether').toString(),
        nonce: 1,
        sigA
      })

      // ETH
      sigA = await web3.eth.sign(
        Connext.createThreadStateUpdateFingerprint({
          channelId: threadId2,
          partyA: partyC,
          partyB,
          weiBond: Web3.utils.toWei('1', 'ether'),
          tokenBond: '0',
          weiBalanceA: Web3.utils.toWei('0.9', 'ether'),
          weiBalanceB: Web3.utils.toWei('0.1', 'ether'),
          tokenBalanceA: Web3.utils.toBN('0'),
          tokenBalanceB: Web3.utils.toBN('0'),
          nonce: 1
        }),
        partyC
      )
      stubHub.get(`/thread/${threadId2}/update/latest`).reply(200, {
        weiBalanceA: Web3.utils.toWei('0.9', 'ether').toString(),
        weiBalanceB: Web3.utils.toWei('0.1', 'ether').toString(),
        tokenBalanceA: '0',
        tokenBalanceB: '0',
        nonce: 1,
        sigA
      })

      // TOKEN
      sigA = await web3.eth.sign(
        Connext.createThreadStateUpdateFingerprint({
          channelId: threadId3,
          partyA: partyD,
          partyB,
          weiBond: '0',
          tokenBond: Web3.utils.toWei('1', 'ether'),
          weiBalanceA: Web3.utils.toBN('0'),
          weiBalanceB: Web3.utils.toBN('0'),
          tokenBalanceA: Web3.utils.toWei('0.9', 'ether'),
          tokenBalanceB: Web3.utils.toWei('0.1', 'ether'),
          nonce: 1
        }),
        partyD
      )
      stubHub.get(`/thread/${threadId3}/update/latest`).reply(200, {
        weiBalanceA: '0',
        weiBalanceB: '0',
        tokenBalanceA: Web3.utils.toWei('0.9', 'ether').toString(),
        tokenBalanceB: Web3.utils.toWei('0.1', 'ether').toString(),
        nonce: 1,
        sigA
      })

      // post to close VC endpoint
      let sigParams = {
        channelId: channelId1,
        isClose: false,
        nonce: 2,
        numOpenThread: 0,
        threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] }),
        partyA: partyA.toLowerCase(),
        partyI: ingridAddress,
        weiBalanceA: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')),
        weiBalanceI: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
        tokenBalanceA: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')),
        tokenBalanceI: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
      }
      const sigItoAThread1 = await web3.eth.sign(
        Connext.createChannelStateUpdateFingerprint(sigParams),
        ingridAddress
      )
      // update for eth only thread
      sigParams.partyA = partyC.toLowerCase()
      sigParams.channelId = channelId3
      sigParams.tokenBalanceA = sigParams.tokenBalanceI = Web3.utils.toBN('0')
      const sigItoAThread2 = await web3.eth.sign(
        Connext.createChannelStateUpdateFingerprint(sigParams),
        ingridAddress
      )
      // update for token only thread
      sigParams.partyA = partyD.toLowerCase()
      sigParams.channelId = channelId4
      sigParams.tokenBalanceA = Web3.utils.toBN(
        Web3.utils.toWei('4.9', 'ether')
      )
      sigParams.tokenBalanceI = Web3.utils.toBN(
        Web3.utils.toWei('0.1', 'ether')
      )
      sigParams.weiBalanceA = sigParams.weiBalanceI = Web3.utils.toBN('0')
      const sigItoAThread3 = await web3.eth.sign(
        Connext.createChannelStateUpdateFingerprint(sigParams),
        ingridAddress
      )
      stubHub
        .post(`/thread/${threadId1}/close`)
        .reply(200, { sigI: sigItoAThread1 })
      stubHub
        .post(`/thread/${threadId2}/close`)
        .reply(200, { sigI: sigItoAThread2 })
      stubHub
        .post(`/thread/${threadId3}/close`)
        .reply(200, { sigI: sigItoAThread3 })

      break

    default:
      break
  }


//What is this for? Is there an equivalent with new hub? - Arjun
  // post to payments endpoint
  // 1 payment, return array of 1
  // stubHub
  //   .post(`/payments/`, body => {
  //     return body.payments.length === 1
  //   })
  //   .reply(200, [
  //     {
  //       id: 2,
  //       balanceA: '20000',
  //       balanceB: '6000',
  //       nonce: 2,
  //       sigA: '0x6e4f3d1782440461d72436afb5f087b74db3d034a9623cc0c10e0819dba7d2eb45818f11d2ceaf4e647eae4e946115bcb22cb99d5b1c6e134efbbc7629898e8f01',
  //       sigB: null
  //     }
  //   ])
  // // 1 payment, return array of 2
  // stubHub
  //   .post(`/payments/`, body => {
  //     return body.payments.length === 2
  //   })
  //   .reply(200, [
  //     {
  //       id: 2,
  //       balanceA: '20000',
  //       balanceB: '6000',
  //       nonce: 2,
  //       sigA: '0x6e4f3d1782440461d72436afb5f087b74db3d034a9623cc0c10e0819dba7d2eb45818f11d2ceaf4e647eae4e946115bcb22cb99d5b1c6e134efbbc7629898e8f01',
  //       sigB: null
  //     },
  //     {
  //       id: 3,
  //       balanceA: '20000',
  //       balanceB: '6000',
  //       nonce: 2,
  //       sigA: '0x6e4f3d1782440461d72436afb5f087b74db3d034a9623cc0c10e0819dba7d2eb45818f11d2ceaf4e647eae4e946115bcb22cb99d5b1c6e134efbbc7629898e8f01',
  //       sigB: null
  //     }
  //   ])

  // add post to create vc endpoint
  stubHub
    .post(`/thread/`, body => {
      return body.channelId === threadId1
    })
    .reply(200, {
      channelId: threadId1
    })
  stubHub
    .post(`/thread/`, body => {
      return body.channelId === threadId2
    })
    .reply(200, {
      channelId: threadId2
    })
  stubHub
    .post(`/thread/`, body => {
      return body.channelId === threadId3
    })
    .reply(200, {
      channelId: threadId3
    })

  // add post to fastclose lc endpoint
  // ETH/TOKEN channel (viewer)
  // generate hash
  let hash = Connext.createChannelStateUpdateFingerprint({
    channelId: channelId1,
    partyA,
    partyI: ingridAddress,
    isClose: true,
    nonce: 3,
    numOpenThread: 0,
    threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] }),
    weiBalanceA: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')),
    weiBalanceI: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
    tokenBalanceA: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')),
    tokenBalanceI: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
  })
  let sigAFinal = await web3.eth.sign(hash, partyA)
  let sigIAFinal = await web3.eth.sign(hash, ingridAddress)
  stubHub.post(`/channel/${channelId1}/close`).reply(200, {
    nonce: 3,
    numOpenThread: 0,
    threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] }),
    weiBalanceA: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')).toString(),
    weiBalanceI: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')).toString(),
    tokenBalanceA: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')).toString(),
    tokenBalanceI: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')).toString(),
    sigA: sigAFinal,
    sigI: sigIAFinal
  })

  // ETH/TOKEN channel (receiver)
  hash = Connext.createChannelStateUpdateFingerprint({
    channelId: channelId2,
    partyA: partyB,
    partyI: ingridAddress,
    isClose: true,
    nonce: 7,
    numOpenThread: 0,
    threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] }),
    weiBalanceA: Web3.utils.toBN(Web3.utils.toWei('0.2', 'ether')),
    weiBalanceI: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
    tokenBalanceA: Web3.utils.toBN(Web3.utils.toWei('0.2', 'ether')),
    tokenBalanceI: Web3.utils.toBN(Web3.utils.toWei('0', 'ether'))
  })
  let sigBFinal = await web3.eth.sign(hash, partyB)
  let sigIBFinal = await web3.eth.sign(hash, ingridAddress)
  stubHub.post(`/channel/${channelId2}/close`).reply(200, {
    isClose: true,
    nonce: 7,
    numOpenThread: 0,
    threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] }),
    weiBalanceA: Web3.utils.toBN(Web3.utils.toWei('0.2', 'ether')).toString(),
    weiBalanceI: '0',
    tokenBalanceA: Web3.utils.toBN(Web3.utils.toWei('0.2', 'ether')).toString(),
    tokenBalanceI: '0',
    sigA: sigBFinal,
    sigI: sigIBFinal
  })

  // ETH channel (viewer)
  hash = Connext.createChannelStateUpdateFingerprint({
    channelId: channelId3,
    partyA: partyC,
    partyI: ingridAddress,
    isClose: true,
    nonce: 3,
    numOpenThread: 0,
    threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] }),
    weiBalanceA: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')),
    weiBalanceI: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
    tokenBalanceA: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
    tokenBalanceI: Web3.utils.toBN(Web3.utils.toWei('0', 'ether'))
  })
  let sigCFinal = await web3.eth.sign(hash, partyC)
  let sigICFinal = await web3.eth.sign(hash, ingridAddress)
  stubHub.post(`/channel/${channelId3}/close`).reply(200, {
    isClose: true,
    nonce: 3,
    numOpenThread: 0,
    threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] }),
    weiBalanceA: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')).toString(),
    weiBalanceI: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')).toString(),
    tokenBalanceA: '0',
    tokenBalanceI: '0',
    sigA: sigCFinal,
    sigI: sigICFinal
  })

  // TOKEN channel (viewer)
  hash = Connext.createChannelStateUpdateFingerprint({
    channelId: channelId4,
    partyA: partyD,
    partyI: ingridAddress,
    isClose: true,
    nonce: 3,
    numOpenThread: 0,
    threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] }),
    weiBalanceA: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
    weiBalanceI: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
    tokenBalanceA: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')),
    tokenBalanceI: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
  })
  let sigDFinal = await web3.eth.sign(hash, partyD)
  let sigIDFinal = await web3.eth.sign(hash, ingridAddress)
  stubHub.post(`/channel/${channelId4}/close`).reply(200, {
    isClose: true,
    nonce: 3,
    numOpenThread: 0,
    threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] }),
    weiBalanceA: '0',
    weiBalanceI: '0',
    tokenBalanceA: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')).toString(),
    tokenBalanceI: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')).toString(),
    sigA: sigDFinal,
    sigI: sigIDFinal
  })

  // // add get latest i-signed channel state endpoint
  // // ETH/TOKEN (viewer)
  // hash = Connext.createChannelStateUpdateFingerprint({
  //   channelId: channelId1,
  //   partyA,
  //   partyI: ingridAddress,
  //   isClose: false,
  //   nonce: 2,
  //   numOpenThread: 0,
  //   threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] }),
  //   weiBalanceA: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')),
  //   weiBalanceI: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
  //   tokenBalanceA: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')),
  //   tokenBalanceI: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether'))
  // })
  // sigAFinal = await web3.eth.sign(hash, partyA)
  // sigIAFinal = await web3.eth.sign(hash, ingridAddress)
  // stubHub
  //   .get(`/channel/${channelId1}/update/latest?sig[]=sigI`)
  //   .reply(200, {
  //     isClose: false,
  //     partyA,
  //     partyI: ingridAddress,
  //     nonce: 2,
  //     numOpenThread: 0,
  //     threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] }),
  //     weiBalanceA: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')).toString(),
  //     weiBalanceI: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')).toString(),
  //     tokenBalanceA: Web3.utils
  //       .toBN(Web3.utils.toWei('4.9', 'ether'))
  //       .toString(),
  //     tokenBalanceI: Web3.utils
  //       .toBN(Web3.utils.toWei('0.1', 'ether'))
  //       .toString(),
  //     sigI: sigIAFinal,
  //     sigA: sigAFinal
  //   })

  // // ETH/TOKEN (recipient)
  // hash = Connext.createChannelStateUpdateFingerprint({
  //   channelId: channelId2,
  //   partyA: partyB,
  //   partyI: ingridAddress,
  //   isClose: false,
  //   nonce: 6,
  //   numOpenThread: 0,
  //   threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] }),
  //   weiBalanceA: Web3.utils.toBN(Web3.utils.toWei('0.2', 'ether')),
  //   weiBalanceI: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
  //   tokenBalanceA: Web3.utils.toBN(Web3.utils.toWei('0.2', 'ether')),
  //   tokenBalanceI: Web3.utils.toBN(Web3.utils.toWei('0', 'ether'))
  // })
  // sigBFinal = await web3.eth.sign(hash, partyB)
  // sigIBFinal = await web3.eth.sign(hash, ingridAddress)
  // stubHub
  //   .get(`/ledgerchannel/${channelId2}/update/latest?sig[]=sigI`)
  //   .reply(200, {
  //     isClose: false,
  //     partyA: partyB,
  //     partyI: ingridAddress,
  //     nonce: 6,
  //     numOpenThread: 0,
  //     threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] }),
  //     weiBalanceA: Web3.utils.toBN(Web3.utils.toWei('0.2', 'ether')).toString(),
  //     weiBalanceI: '0',
  //     tokenBalanceA: Web3.utils
  //       .toBN(Web3.utils.toWei('0.2', 'ether'))
  //       .toString(),
  //     tokenBalanceI: '0',
  //     sigI: sigIBFinal,
  //     sigA: sigBFinal
  //   })

  // // ETH (viewer)
  // hash = Connext.createChannelStateUpdateFingerprint({
  //   channelId: channelId3,
  //   partyA: partyC,
  //   partyI: ingridAddress,
  //   isClose: false,
  //   nonce: 2,
  //   numOpenThread: 0,
  //   threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] }),
  //   weiBalanceA: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')),
  //   weiBalanceI: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
  //   tokenBalanceA: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
  //   tokenBalanceI: Web3.utils.toBN(Web3.utils.toWei('0', 'ether'))
  // })
  // sigCFinal = await web3.eth.sign(hash, partyC)
  // sigICFinal = await web3.eth.sign(hash, ingridAddress)
  // stubHub
  //   .get(`/ledgerchannel/${channelId3}/update/latest?sig[]=sigI`)
  //   .reply(200, {
  //     isClose: false,
  //     partyA: partyC,
  //     partyI: ingridAddress,
  //     nonce: 2,
  //     numOpenThread: 0,
  //     threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] }),
  //     weiBalanceA: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')).toString(),
  //     weiBalanceI: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')).toString(),
  //     tokenBalanceA: '0',
  //     tokenBalanceI: '0',
  //     sigI: sigICFinal,
  //     sigA: sigCFinal
  //   })

  // // TOKEN (viewer)
  // hash = Connext.createChannelStateUpdateFingerprint({
  //   channelId: channelId4,
  //   partyA: partyD,
  //   partyI: ingridAddress,
  //   isClose: false,
  //   nonce: 2,
  //   numOpenThread: 0,
  //   threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] }),
  //   tokenBalanceA: Web3.utils.toBN(Web3.utils.toWei('4.9', 'ether')),
  //   tokenBalanceI: Web3.utils.toBN(Web3.utils.toWei('0.1', 'ether')),
  //   weiBalanceA: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
  //   weiBalanceI: Web3.utils.toBN(Web3.utils.toWei('0', 'ether'))
  // })
  // sigDFinal = await web3.eth.sign(hash, partyD)
  // sigIDFinal = await web3.eth.sign(hash, ingridAddress)
  // stubHub
  //   .get(`/ledgerchannel/${channelId4}/update/latest?sig[]=sigI`)
  //   .reply(200, {
  //     isClose: false,
  //     partyA: partyD,
  //     partyI: ingridAddress,
  //     nonce: 2,
  //     numOpenThread: 0,
  //     threadRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] }),
  //     tokenBalanceA: Web3.utils
  //       .toBN(Web3.utils.toWei('4.9', 'ether'))
  //       .toString(),
  //     tokenBalanceI: Web3.utils
  //       .toBN(Web3.utils.toWei('0.1', 'ether'))
  //       .toString(),
  //     weiBalanceA: '0',
  //     weiBalanceI: '0',
  //     sigI: sigIDFinal,
  //     sigA: sigDFinal
  //   })

  // request hub join
  stubHub
    .post(`/ledgerchannel/${channelId1}/join`)
    .reply(200, {
      channelId: channelId1,
      partyA: partyA.toLowerCase(),
      partyI: partyI.toLowerCase(),
      nonce: 0,
      weiBalanceA: Web3.utils.toWei('5', 'ether'),
      weiBalanceI: '0',
      token: '0x0100000000000000000000000000000000000000000000000000000000000000',
      tokenBalanceA: Web3.utils.toWei('5', 'ether'),
      tokenBalanceI: '0',
      status: 'JOINED',
      updateTimeout: 0,
      numOpenThread: 0
    })
  stubHub
    .post(`/ledgerchannel/${channelId2}/join`)
    .reply(200, {
      channelId: channelId2,
      partyA: partyA.toLowerCase(),
      partyI: partyI.toLowerCase(),
      nonce: 0,
      weiBalanceA: '0',
      weiBalanceI: Web3.utils.toWei('5', 'ether'),
      token: '0x0100000000000000000000000000000000000000000000000000000000000000',
      tokenBalanceA: '0',
      tokenBalanceI: Web3.utils.toWei('5', 'ether'),
      status: 'JOINED',
      updateTimeout: 0,
      numOpenThread: 0
    })
  stubHub
    .post(`/ledgerchannel/${channelId3}/join`)
    .reply(200, {
      channelId: channelId3,
      partyA: partyA.toLowerCase(),
      partyI: partyI.toLowerCase(),
      nonce: 0,
      weiBalanceA: Web3.utils.toWei('5', 'ether'),
      weiBalanceI: '0',
      token: '0x0100000000000000000000000000000000000000000000000000000000000000',
      tokenBalanceA: '0',
      tokenBalanceI: '0',
      status: 'JOINED',
      updateTimeout: 0,
      numOpenThread: 0
    })
  stubHub
    .post(`/ledgerchannel/${channelId4}/join`)
    .reply(200, {
      channelId: channelId3,
      partyA: partyA.toLowerCase(),
      partyI: partyI.toLowerCase(),
      nonce: 0,
      weiBalanceA: '0',
      weiBalanceI: '0',
      token: '0x0100000000000000000000000000000000000000000000000000000000000000',
      tokenBalanceA: Web3.utils.toWei('5', 'ether'),
      tokenBalanceI: '0',
      status: 'JOINED',
      updateTimeout: 0,
      numOpenThread: 0
    })
  return stubHub
}
