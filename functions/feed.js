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

    client.query(
        q.Map(
            q.Paginate(
                q.Match(q.Index('author'), author)
            ),
            q.Lambda( 'post', q.Get(q.Var('post')) )
        )
    )
        .then(function (res) {
            // console.log('**hhhhh**', res)
            return cb(null, {
                statusCode: 200,
                body: JSON.stringify({
                    ok: true,
                    msgs: res.data.map(post => post.data)
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
