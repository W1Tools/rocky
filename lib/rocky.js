var router       = require('router')
var httpProxy    = require('http-proxy')
var parseUrl     = require('url').parse
var Route        = require('./route')
var createServer = require('./server')

module.exports = Rocky

function Rocky(opts) {
  opts = opts || {}
  this.opts    = opts
  this.replays = []
  this.router  = router(opts.router)
  this.proxy   = httpProxy.createProxyServer(opts)
}

Rocky.prototype.target  =
Rocky.prototype.forward = function (url) {
  this.opts.target = parseUrl(url)
  return this
}

Rocky.prototype.replay = function (url) {
  this.replays.push.apply(this.replays, arguments)
  return this
}

Rocky.prototype.use = function () {
  this.router.use.apply(this.router, arguments)
  return this
}

Rocky.prototype.on = function (event, fn) {
  this.proxy.on(event, fn)
  return this
}

Rocky.prototype.route = function (path, method) {
  var route = new Route(path)
  var handler = route._handle(this)
  this.router[method || 'all'](path, handler)
  return route
}

Rocky.prototype.requestHandler = function (req, res, next) {
  this.router(req, res, next || function () {})
  return this
}

Rocky.prototype.middleware = function () {
  return this.requestHandler.bind(this)
}

Rocky.prototype.listen = function (port, host) {
  var opts = { ssl: this.opts.ssl, port: port, host: host }
  var handler = this.requestHandler.bind(this)
  this.server = createServer(opts, handler)
  return this
}

Rocky.prototype.close = function (cb) {
  if (this.server) {
    this.server.close(cb)
  }
  return this
}

;['get', 'post', 'delete', 'patch', 'put', 'options', 'all'].forEach(function (method) {
  Rocky.prototype[method] = function (path) {
    return this.route(path, method)
  }
})