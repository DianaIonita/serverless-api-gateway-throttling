String.prototype.replaceAll = function (search, replacement) {
  let target = this;

  return target
    .split(search)
    .join(replacement);
};

const escapeJsonPointer = path => {
  return path
    .replaceAll('~', '~0')
    .replaceAll('/', '~1')
    .replaceAll('{', '\{')
    .replaceAll('}', '\}');
}

const httpEventOf = (lambda, endpointSettings) => {
  let httpEvents = lambda.events.filter(e => e.http != undefined)
    .map(e => {
      if (typeof (e.http) === 'string') {
        let parts = e.http.split(' ');
        return {
          method: parts[0],
          path: parts[1]
        }
      } else {
        return {
          method: e.http.method,
          path: e.http.path
        }
      }
    });

  return httpEvents.filter(e => e.path = endpointSettings.path || "/" + e.path === endpointSettings.path)
    .filter(e => e.method.toUpperCase() == endpointSettings.method.toUpperCase())[0];
}

const httpApiEventOf = (lambda, endpointSettings) => {
  let httpApiEvents = lambda.events.filter(e => e.httpApi != undefined)
    .map(e => {
      if (typeof (e.http) === 'string') {
        let parts = e.http.split(' ');
        return {
          method: parts[0],
          path: parts[1]
        }
      } else {
        return {
          method: e.http.method,
          path: e.http.path
        }
      }
    });

  return httpApiEvents.filter(e => e.path = endpointSettings.path || "/" + e.path === endpointSettings.path)
    .filter(e => e.method.toUpperCase() == endpointSettings.method.toUpperCase())[0];
}

const patchPathFor = (path, method) => {
  let escapedPath = escapeJsonPointer(path);
  if (!escapedPath.startsWith('~1')) {
    escapedPath = `~1${escapedPath}`;
  }
  let patchPath = `${escapedPath}/${method.toUpperCase()}`;
  return patchPath;
}

module.exports = {
  patchPathFor,
  httpEventOf,
  httpApiEventOf
}
