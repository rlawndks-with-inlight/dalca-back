const mysql = require('mysql')

const db = mysql.createConnection({
    host : "purplevery18.cafe24.com",
    user : 'root',
    password : 'qjfwk100djr!',
    port : 3306,
    database:'dalca_pay',
    timezone: 'Asia/Seoul',
    charset: 'utf8mb4'
})
db.connect();

module.exports = db;