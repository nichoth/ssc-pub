var ssc = require('@nichoth/ssc')
var faunadb = require('faunadb')
var envKey = process.env.FAUNA_KEY
var xtend = require('xtend')

// requests are like
// { keys: { public }, msg: {} }

exports.handler = function (ev, ctx, cb) {
    try {
        var { keys, msg } = JSON.parse(ev.body)
    } catch (err) {
        return cb(null, {
            statusCode: 422,
            body: JSON.stringify({
                ok: false,
                error: 'invalid json',
                message: err.message
            })
        })
    }

    console.log('**msg**', msg)
    console.log('**keys**', keys)

    // @TODO
    // need to lookup the previous message to make sure the new
    // message contains its hash
    // see https://github.com/ssb-js/ssb-validate/blob/main/index.js#L149
    // here state.id is the hash of the prev msg, and `msg` is the current

    var isValid
    try {
        isValid = ssc.verifyObj(keys, null, msg)
    } catch (err) {
        return cb(null, {
            statusCode: 422,
            body: JSON.stringify({
                ok: false,
                error: err,
                message: msg
            })
        })
    }

    if (!msg || !isValid) {
        // is invalid
        // 422 (Unprocessable Entity)
        return cb(null, {
            statusCode: 422,
            body: JSON.stringify({
                ok: false,
                error: 'invalid message',
                message: msg
            })
        })
    }

    var q = faunadb.query
    var client = new faunadb.Client({
        secret: envKey
    })
    if (msg.previous !== null) {
        // lookup the prev msg in db here
        console.log('not null', msg)
        var prevKey = msg.previous
    }


//     msg: {
//         previous: null,
//         sequence: 1,
//         author: '@vYAqxqmL4/WDSoHjg54LUJRN4EH9/I4A/OFrMpXIWkQ=.ed25519',
//         timestamp: 1606692151952,
//         hash: 'sha256',
//         content: { type: 'test', text: 'woooo' },
//         signature: 'wHdXRQBt8k0rFEa9ym35pNqmeHwA+kTTdOC3N6wAn4yOb6dsfIq/X0JpHCBZVJcw6Luo6uH1udpq12I4eYzBAw==.sig.ed25519'
//     }


    var hash = ssc.getId(msg)
    client.query(
        q.Create(q.Collection('posts'), {
            key: hash,
            author: msg.author,
            data: xtend(msg, { key: hash })
        })
    )
        .then(res => {
            console.log('res', res)
            cb(null, {
                statusCode: 200,
                body: JSON.stringify({
                    ok: true,
                    res: res,
                    msg: res.data
                })
            })
        })
        .catch(err => {
            console.log('errrrr', err)
            cb(null, {
                statusCode: 500,
                body: JSON.stringify({
                    ok: false,
                    error: err
                })
            })
        })


}

