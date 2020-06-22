'use strict'

const net = require('net')
const path = require('path')
const spawn = require('child_process').spawn

const psockPath = path.resolve(path.join(__dirname, '..', 'psock.js'))

let messages = 0
let bytesReceived = 0
const server = net.createServer((connection) => {
  connection.on('data', (chunk) => {
    messages += chunk.toString().match(/[0-9]+\n/g).length
    bytesReceived += chunk.length
  })
})

server.listen(0, () => {
  const address = server.address().address
  const port = server.address().port
  const psock = spawn('node', [psockPath, '-m', 'tcp', '-a', address, '-p', port])
  psock.on('close', (code, signal) => console.log('psock closed: (%s, %s)', code, signal))
  psock.on('error', (err) => console.error('psock error: %s', err.message))
  psock.stderr.on('data', (data) => console.error('psock stderr: %s', data))
  psock.stdin.on('error', (err) => console.error('psock stdin error: %s', err.message))

  let start
  let stop
  let bytesTransferred = 0
  function send (cb) {
    start = Date.now()
    for (let i = 0, j = 100000; i < j; i += 1) {
      bytesTransferred += 2
      if (i === 99999) {
        psock.stdin.write(i + '\n', cb)
        continue
      }
      psock.stdin.write(i + '\n')
    }
    stop = Date.now()
  }

  function finished () {
    psock.kill()
    server.close()
    server.unref()
    const seconds = (stop - start) / 1000
    const msgsPerSecond = messages / seconds
    console.log('wrote %s messages in %s seconds: %s messages/second', messages, seconds, msgsPerSecond)
    console.log('bytes transfered: %s', bytesTransferred)
    console.log('bytes received: %s', bytesReceived)
    process.exit(0)
  }

  send(finished)
})
