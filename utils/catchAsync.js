
//pass func in and execute this func and catch any error
module.exports = func => {
    return (req, res, next) => {
        func(req, res, next).catch(next);
    }
}