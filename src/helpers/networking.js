const axios = require('axios')

export const GET = 'GET'
export const POST = 'POST'

module.exports = function networking (
  baseUrl,
  useAxios = process.env.DEV ? !process.env.DEV : false
) {
  return {
    get,
    post
  }

  function get (url, useAxios) {
    return request(url, GET, useAxios)
  }

  function post (url, body, useAxios) {
    return request(url, POST, body, useAxios)
  }

  async function request (url, method, body, useAxios) {
    const opts = {
      method
    }

    if (method === POST) {
      opts.body = JSON.stringify(body)
    }

    let res
    if (useAxios === false) {
      opts['mode'] = 'cors'
      opts['credentials'] = 'include'
      res = await fetch(`${baseUrl}/${url}`, opts)
    } else {
      opts.headers = {
        Cookie: `hub.sid=${process.env.HUB_AUTH};`,
        Authorization: `Bearer ${process.env.HUB_AUTH}`
      }
      try {
        res = await axios(`${baseUrl}/${url}`, opts)
      } catch (e) {
        res = e.response
      }
    }

    if (res.status < 200 || res.status > 299) {
      throw errorResponse(
        res.status,
        res.body,
        `Received non-200 response: ${res.status}`
      )
    }

    console.log(':)))')
    const data = useAxios ? res.data : await res.json()
    console.log(data)

    return {
      data
    }
  }
}

function errorResponse (status, body, message) {
  return {
    status,
    body,
    message
  }
}
