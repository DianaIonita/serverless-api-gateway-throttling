'use strict';

class ServerlessFunction {
  constructor(name) {
    this[name] = {
    }
  }

  getFunction() {
    return this[Object.keys(this)[0]];
  }

  withHttpEndpoint(method, path, throttling) {
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

  withHttpEndpointInShorthand(shorthand) {
    let f = this.getFunction();
    if (!f.events) { f.events = []; }
    f.events.push({
      http: shorthand
    });

    return this;
  }
}

module.exports = ServerlessFunction;
