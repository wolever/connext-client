export const GET = 'GET';
export const POST = 'POST';

module.exports = function networking(baseUrl) {
  return {
    get,
    post
  };

  function get(url) {
    return request(url, GET);
  }

  function post(url, body) {
    return request(url, POST, body);
  }

  async function request(url, method, body) {
    const opts = {
      method,
      mode: 'cors',
      credentials: 'include'
    };

    if (method === POST) {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(`${baseUrl}/${url}`, opts);

    if (res.status < 200 || res.status > 299) {
      throw errorResponse(res.status, res.body, `Received non-200 response: ${res.status}`)
    }

    const data = await res.json();

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