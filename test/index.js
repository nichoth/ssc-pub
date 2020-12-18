var test = require('tape')
var got = require('got')
var { spawn } = require('child_process')
var ssbKeys = require("ssb-keys")
var xtend = require('xtend')
// const { scryptSync } = require('crypto')
var ssc = require('@nichoth/ssc')

var PATH = 'http://localhost:8888/.netlify/functions'

var ntl
var keys
var msg
var req


// var testReq = {
//     keys: {
//         public: 'vYAqxqmL4/WDSoHjg54LUJRN4EH9/I4A/OFrMpXIWkQ=.ed25519'
//     },
//     // this is a message we created previously
//     msg: {
//         previous: null,
//         sequence: 1,
//         author: '@vYAqxqmL4/WDSoHjg54LUJRN4EH9/I4A/OFrMpXIWkQ=.ed25519',
//         timestamp: 1606692151952,
//         hash: 'sha256',
//         content: { type: 'test', text: 'woooo' },
//         signature: 'wHdXRQBt8k0rFEa9ym35pNqmeHwA+kTTdOC3N6wAn4yOb6dsfIq/X0JpHCBZVJcw6Luo6uH1udpq12I4eYzBAw==.sig.ed25519'
//     }
// }


test('setup', function (t) {
    keys = ssbKeys.generate()
    ntl = spawn('npx', ['netlify', 'dev', '--port=8888'])
    // keys = ssbKeys.generate()

    // ntl.stdout.on('data', function (d) {
    //     console.log('stdout', d.toString('utf8'))
    // })

    ntl.stdout.once('data', (/* data */) => {
        t.end()
    })

    ntl.stdout.pipe(process.stdout)

    ntl.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    })

    ntl.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    })
})

test('demo', function (t) {
    t.plan(1)
    got(PATH + '/test')
        .then(function (res) {
            t.pass('netlify functions are working')
        })
        .catch(err => {
            t.error(err)
        })
})


// validate a msg
// comes down to sodium.verify --
// https://github.com/ssb-js/ssb-keys/blob/main/index.js#L104


// @TODO
// * create and sign msg client side
test('publish', function (t) {

    var content = { type: 'test', text: 'woooo' }
    msg = ssc.createMsg(keys, null, content)
    req = {
        keys: { public: keys.public },
        msg
    }

    got.post(PATH + '/publish', {
        json: req,
        responseType: 'json'
    })
        .then(function (res) {
            t.pass('got a response')
            t.equal(res.body.msg.signature, req.msg.signature,
                'should send back the message')
            t.end()
        })
        .catch(err => {
            console.log('errrrr', err)
            t.error(err)
            t.end()
        })
})

test('publish another message', function (t) {
    t.plan(2)

    // @TODO get the prev msg from DB

    var req2 = {
        keys: { public: keys.public },
        // in here we pass in the previous msg we created
        msg: ssc.createMsg(keys, msg, { type: 'test2', text: 'ok' })
    }

    got.post(PATH + '/publish', {
        json: req2,
        responseType: 'json'
    })
        .then(function (res) {
            t.pass('got a response')
            t.equal(res.body.msg.signature, req2.msg.signature,
                'should send back the message')
        })
        .catch(err => {
            t.error(err)
        })
})

test('publish with an invalid signature', function (t) {
    got.post(PATH + '/publish', {
        json: xtend(req, {
            msg: xtend(req.msg, { signature: 'bad' })
        }),
        responseType: 'json'
    })
        .then(function (res) {
            t.fail('got a response, not an error')
            t.end()
        })
        .catch(err => {
            t.ok(err, 'should return error')
            t.ok(err.message.includes('422'), 'should have error code 422')
            t.end()
        })
})


// @TODO
// publish with an invalid previous msg


// test('get a feed', function (t) {
//     got.post(PATH + '/feed', {
//         json: { user: testMsg.msg.author },
//         responseType: 'json'
//     })
//         .then(function (res) {
//             t.pass('got a response')
//             console.log('res', res.body)
//         })
//         .catch(err => {
//             t.error(err)
//         })
// })




test('all done', function (t) {
    ntl.kill()
    t.end()
})

// toKeyValueTimestamp:
// https://github.com/ssb-js/ssb-validate/blob/main/index.js#L204
// `msg` is just the 'value' level

// the msg key is the id is the hash of the message (the value in KVT)
// https://github.com/ssb-js/ssb-validate/blob/main/index.js#L339



