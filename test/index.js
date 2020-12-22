var test = require('tape')
var got = require('got')
var { spawn } = require('child_process')
var ssbKeys = require("ssb-keys")
var xtend = require('xtend')
var ssc = require('@nichoth/ssc')

var PATH = 'http://localhost:8888/.netlify/functions'

var ntl
var keys = ssbKeys.generate()
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
    ntl = spawn('npx', ['netlify', 'dev', '--port=8888'])

    // ntl.stdout.on('data', function (d) {
    //     console.log('stdout', d.toString('utf8'))
    // })

    ntl.stdout.once('data', (/* data */) => {
        t.end()
    })

    ntl.stdout.pipe(process.stdout)
    ntl.stderr.pipe(process.stderr)

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
    var content = { type: 'test', text: 'waaaa' }
    msg = ssc.createMsg(keys, null, content)
    console.log('**msg**', msg)

    // {
    //     previous: null,
    //     sequence: 1,
    //     author: '@x+KEmL4JmIKzK0eqR8vXLPUKSa87udWm+Enw2bsEiuU=.ed25519',
    //     timestamp: NaN,
    //     hash: 'sha256',
    //     content: { type: 'test', text: 'waaaa' },
    //     signature: 'RQXRrMUMqRlANeSBrfZ1AVerC9xGJxEGscx1MZrJUqAVylwVfi5i5r1msyZzqi7FuDf7DYr3OOHrTIO2P6ufDQ==.sig.ed25519'
    //   }


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
            t.equal(res.body.msg.value.signature, msg.signature,
                'should send back the message')
            t.end()
        })
        .catch(err => {
            t.error(err)
            t.end()
        })
})

test('publish another message', function (t) {
    t.plan(2)

    var req2 = {
        keys: { public: keys.public },
        // in here we pass in the previous msg we created
        // createMsg(keys, prevMsg, content)
        msg: ssc.createMsg(keys, msg, { type: 'test2', text: 'ok' })
    }

    got.post(PATH + '/publish', {
        json: req2,
        responseType: 'json'
    })
        .then(function (res) {
            // console.log('*****reseseses', res.body)
            t.pass('got a response')
            t.equal(res.body.msg.value.signature, req2.msg.signature,
                'should send back the message')
        })
        .catch(err => {
            t.error(err)
        })
})

// i guess this will work for now
test('publish a msg with the wrong `previous`', function (t) {
    var content = { type: 'test3', text: 'boo' }
    var req = {
        keys: { public: keys.public },
        // ssc takes the hash of the previous msg, so this would produce a 
        // different `previous` hash than the one in the DB
        msg: ssc.createMsg(keys, xtend(msg, { content: 'bad'}), content)
    }

    got.post(PATH + '/publish', {
        json: req,
        responseType: 'json'
    })
        .then(res => {
            t.fail('should return error for a bad `previous` hash')
            t.end()
        })
        .catch(err => {
            t.pass('should return error')
            t.ok(err.message.includes('422'), 'should have error code 422')
            t.end()
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
test('get a feed', function (t) {
    got.post(PATH + '/feed', {
        json: { author: msg.author },
        responseType: 'json'
    })
        .then(function ({ body }) {
            // console.log('**res from /feed**', body)
            t.pass('got a response')
            t.equal(body.msgs[0].value.signature, msg.signature,
                'should send back the first message')
            t.end()
        })
        .catch(err => {
            t.error(err)
            t.end()
        })
})




test('all done', function (t) {
    ntl.kill()
    t.end()
})

// toKeyValueTimestamp:
// https://github.com/ssb-js/ssb-validate/blob/main/index.js#L204
// `msg` is just the 'value' level

// the msg key is the id is the hash of the message (the value in KVT)
// https://github.com/ssb-js/ssb-validate/blob/main/index.js#L339



