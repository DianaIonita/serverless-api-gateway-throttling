'use strict';

class ServerlessFunction {
  constructor(name) {
    this[name] = {
    }
  }

  getFunction() {
    return this[Object.keys(this)[0]];
  }

  withRestEndpoint(method, path, throttling) {
    let f = this.getFunction();
    if (!f.events) { f.events = []; }

    const http = {
      path,
      method,
      throttling
    }
    f.events.push({
      http
    });

    return this;
  }

  withRestEndpointInShorthand(shorthand) {
    let f = this.getFunction();
    if (!f.events) { f.events = []; }
    f.events.push({
      http: shorthand
    });

    return this;
  }

  withHttpApiEndpoint(method, path, throttling) {
    let f = this.getFunction();
    if (!f.events) { f.events = []; }

    const httpApi = {
      path,
      method,
      throttling
    }
    f.events.push({
      httpApi
    });

    return this;
  }
}

module.exports = ServerlessFunction;
