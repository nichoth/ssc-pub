var ssc = require('@nichoth/ssc')
var faunadb = require('faunadb')
var envKey = process.env.FAUNA_KEY
var xtend = require('xtend')

var q = faunadb.query
var client = new faunadb.Client({
    secret: envKey
})


var msg = {
    previous: null,
    sequence: 1,
    author: '@vYAqxqmL4/WDSoHjg54LUJRN4EH9/I4A/OFrMpXIWkQ=.ed25519',
    timestamp: 1606692151952,
    hash: 'sha256',
    content: { type: 'test', text: 'woooo' },
    signature: 'wHdXRQBt8k0rFEa9ym35pNqmeHwA+kTTdOC3N6wAn4yOb6dsfIq/X0JpHCBZVJcw6Luo6uH1udpq12I4eYzBAw==.sig.ed25519'
}

var hash = ssc.getId(msg)
client.query(
    q.Create(q.Collection('posts'), {
        data: xtend(msg, { key: hash })
    })
)
    .then(res => {
        console.log('res', res)
    })
    .catch(err => {
        console.log('errrrr', err)
    })