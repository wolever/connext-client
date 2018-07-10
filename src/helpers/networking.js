const axios = require("axios");

export const GET = "GET";
export const POST = "POST";

module.exports = function networking(baseUrl, useAxios) {
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
      method
    };

    let res;
    if (useAxios === false) {
      if (method === POST) {
        opts.body = JSON.stringify(body);
        opts.headers = {
          "Content-Type": "application/json"
        };
      }
      opts.mode = "cors";
      opts.credentials = "include";
      res = await fetch(`${baseUrl}/${url}`, opts);
    } else {
      if (method === POST) {
        opts.data = body;
      }
      opts.headers = {
        Authorization: `Bearer ${process.env.HUB_AUTH}`
      };
      try {
        res = await axios(`${baseUrl}/${url}`, opts);
      } catch (e) {
        res = e.response;
      }
    }

    if (res.status < 200 || res.status > 299) {
      throw errorResponse(
        res.status,
        res.body,
        `Received non-200 response: ${res.status}`
      );
    }

    if (res.status === 204) {
      return {
        data: null
      };
    }

    const data = useAxios ? res.data : await res.json();

    return {
      data
    };
  }
};

function errorResponse(status, body, message) {
  return {
    status,
    body,
    message
  };
}
