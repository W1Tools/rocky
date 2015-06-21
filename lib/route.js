var _       = require('lodash')
var http    = require('http')
var Emitter = require('events').EventEmitter

module.exports = Route

function Route(path) {
  this.path    = path
  this.target  = null
  this.replays = []
  Emitter.call(this)
}

Route.prototype = Object.create(Emitter.prototype)

Route.prototype.forward = function (url) {
  this.target = url
  return this
}

Route.prototype.replay = function (url) {
  this.replays.push.apply(this.replays, arguments)
  return this
}

Route.prototype._handle = function (rocky) {
  var route = this

  return function handler(req, res) {
    var target = route.target || rocky.opts.target.href
    var opts = _.assign({}, rocky.opts, { target: target })
    var eventProxy = proxyHandler(route, res, res)

    route.emit('start', opts, req, res)

    // Forward the request to the main target
    if (target) {
      rocky.proxy.web(req, res, opts, eventProxy('forward'))
    }

    // Replay the request if necessary
    var replays = [].concat(rocky.replays, route.replays)
    if (replays.length === 0) {
      return
    }

    replays.forEach(function (url) {
      var res = new http.ServerResponse(req)
      var opts = _.assign({}, rocky.opts, { target: url })
      rocky.proxy.web(req, res, opts, eventProxy('replay'))
    })
  }
}

function proxyHandler(route, req, res) {
  return function (type) {
    return function (err) {
      if (err) {
        return route.emit(type + ':error', err, req, res)
      }
      route.emit(type + ':success', req, res)
    }
  }
}