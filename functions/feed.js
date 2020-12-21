// var ssc = require('@nichoth/ssc')
var faunadb = require('faunadb')
var envKey = process.env.FAUNA_KEY

var q = faunadb.query
var client = new faunadb.Client({
    secret: envKey
})

exports.handler = function (ev, ctx, cb) {
    var req = JSON.parse(ev.body)
    var { author } = req

    console.log('**author**', req, author)

    client.query(
        q.Paginate(
            q.Match(q.Index('author'), author)
        )
    )
        .then(function (res) {
            return cb(null, {
                statusCode: 200,
                body: JSON.stringify({
                    ok: true,
                    msgs: res
                })
            })
        })
        .catch(err => {
            console.log('errrrrrrr', err)
            return cb(null, {
                statusCode: 422,
                body: JSON.stringify({
                    ok: false,
                    error: new Error('query')
                })
            })
        })

}
