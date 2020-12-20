var ssc = require('@nichoth/ssc')
var faunadb = require('faunadb')
var envKey = process.env.FAUNA_KEY

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


    // see https://github.com/ssb-js/ssb-validate/blob/main/index.js#L149


    client.query(
        q.Get(
            q.Match(q.Index('author'), '@' + keys.public)
        )
    )
        .then(res => {
            // if the feed exists,
            // make sure `.previous` in the new msg is the existing msg key

            // console.log('floobobobb', res)

            // res.data.value
            // res.data.key

            // return cb(null, {
            //     statusCode: 200,
            //     body: JSON.stringify({
            //         lllllllllll: res,
            //         ok: true
            //     })
            // })

            console.log('res.data.key', res.data.key)
            console.log('msg.previous', msg.previous)

            if (res.data.key !== msg.previous) {
                console.log('mismatch!!!!!', res.data.key, msg.previous)
                return cb(null, {
                    statusCode: 422,
                    body: JSON.stringify({
                        ok: false,
                        error: new Error('mismatch previous')
                    })
                })
            }

            writeMsg()
        })
        .catch(err => {
            if (err.name === 'NotFound') {
                // write the msg b/c the feed is new
                return writeMsg()
            }

            return cb(null, {
                statusCode: 500,
                body: JSON.stringify({
                    ok: false,
                    error: err
                })
            })
        })


//     msg: {
//         previous: null,
//         sequence: 1,
//         author: '@vYAqxqmL4/WDSoHjg54LUJRN4EH9/I4A/OFrMpXIWkQ=.ed25519',
//         timestamp: 1606692151952,
//         hash: 'sha256',
//         content: { type: 'test', text: 'woooo' },
//         signature: 'wHdXRQBt8k0rFEa9ym35pNqmeHwA+kTTdOC3N6wAn4yOb6dsfIq/X0JpHCBZVJcw6Luo6uH1udpq12I4eYzBAw==.sig.ed25519'
//     }


    // msg is valid, write it to DB
    function writeMsg () {
        var hash = ssc.getId(msg)
        client.query(
            q.Create(q.Collection('posts'), {
                key: hash,
                data: { value: msg, key: hash}
            })
        )
            .then(res => {
                // console.log('res here', res)
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
                // console.log('errrrr in publish', err)
                cb(null, {
                    statusCode: 500,
                    body: JSON.stringify({
                        ok: false,
                        error: err
                    })
                })
            })
            
    }
}
