const fs = require('fs')
const express = require('express')
const app = express()
const mysql = require('mysql')
const cors = require('cors')
const db = require('./config/db')
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const https = require('https');
const http = require('http');
const port = 8001;
app.use(cors());
require('dotenv').config()
const im = require('imagemagick');
const sharp = require('sharp')
//passport, jwt
const jwt = require('jsonwebtoken')
const { checkLevel, logRequestResponse, isNotNullOrUndefined,
        namingImagesPath, nullResponse, lowLevelResponse, response,
        returnMoment, sendAlarm, categoryToNumber, tooMuchRequest,
        getEnLevelByNum,
        formatPhoneNumber } = require('./util')
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '100mb' }));
//multer
const { upload } = require('./config/multerConfig')
//express
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(passport.initialize());
// app.use(passport.session());
// passportConfig(passport);
const schedule = require('node-schedule');

const path = require('path');
const { activeQuery } = require('./query-util')
const { sendAligoSms } = require('./routes/common')
const { getMyAutoCardReturn, onPay } = require('./routes/user')
app.set('/routes', __dirname + '/routes');
app.use('/config', express.static(__dirname + '/config'));
//app.use('/image', express.static('./upload'));
app.use('/image', express.static(__dirname + '/image'));
app.use('/api', require('./routes/router'))

app.get('/', (req, res) => {
        console.log("back-end initialized")
        res.send('back-end initialized')
});
const is_test = true;
app.connectionsN = 0;
const HTTP_PORT = 8001;
const HTTPS_PORT = 8443;


const dbQueryList = (sql, list) => {
        return new Promise((resolve, reject) => {
                db.query(sql, list, (err, result, fields) => {
                        if (err) {
                                console.log(err)
                                reject({
                                        code: -200,
                                        result: result
                                })
                        }
                        else {
                                resolve({
                                        code: 200,
                                        result: result
                                })
                        }
                })
        })
}

let time = new Date(returnMoment()).getTime();
let overFiveTime = new Date(returnMoment());
overFiveTime.setMinutes(overFiveTime.getMinutes() + 5)
overFiveTime = overFiveTime.getTime();

const scheduleSystem = () => {
        let use_alarm = false;
        let use_create_pay = true;

        schedule.scheduleJob('0 0/1 * * * *', async function () {
                let return_moment = returnMoment()
                if (use_alarm) {
                        let date = return_moment.substring(0, 10);
                        let dayOfWeek = new Date(date).getDay()
                        let result = await dbQueryList(`SELECT * FROM alarm_table WHERE ((DATEDIFF(?, start_date) >= 0 AND days LIKE '%${dayOfWeek}%' AND type=1) OR ( start_date=? AND type=2 )) AND STATUS=1`, [date, date]);
                        if (result.code > 0) {
                                let list = [...result.result];
                                for (var i = 0; i < list.length; i++) {
                                        let time = new Date(return_moment).getTime();
                                        let overFiveTime = new Date(return_moment);
                                        overFiveTime.setMinutes(overFiveTime.getMinutes() + 1)
                                        overFiveTime = overFiveTime.getTime();

                                        let item_time = new Date(return_moment.substring(0, 11) + list[i].time).getTime();

                                        if (item_time >= time && item_time < overFiveTime) {
                                                sendAlarm(list[i].title, list[i].note, "alarm", list[i].pk, list[i].url);
                                                activeQuery("INSERT INTO alarm_log_table (title, note, item_table, item_pk, url) VALUES (?, ?, ?, ?, ?)", [list[i].title, list[i].note, "alarm", list[i].pk, list[i].url])
                                        }
                                }
                        }
                }
                if (return_moment.includes('08:00:')) {
                        if (use_create_pay) {
                                let return_moment_list = return_moment.substring(0, 10).split('-');
                                let pay_day = parseInt(return_moment_list[2]);

                                let setting = await dbQueryList(`SELECT * FROM setting_table `);
                                setting = setting?.result[0];

                                let contracts = await dbQueryList(`SELECT * FROM v_contract WHERE end_date >= '${return_moment.substring(0, 10)}' AND is_deposit_com=1`);
                                contracts = contracts?.result;
                                let pays = await dbQueryList(`SELECT contract_pk, MAX(day) as max_day FROM v_pay WHERE pay_category=0 group by contract_pk`);
                                pays = pays?.result;
                                let users = await dbQueryList(`SELECT * FROM user_table WHERE status=1`);
                                users = users?.result;
                                users_obj = {};
                                for (var i = 0; i < users.length; i++) {
                                        users_obj[users[i]?.pk] = users[i];
                                }

                                let user_cards = await dbQueryList(`SELECT auto_card_table.*, user_card_table.bill_key AS bill_key FROM auto_card_table LEFT JOIN user_card_table ON auto_card_table.item_pk=user_card_table.pk `);
                                user_cards = user_cards?.result;

                                for (var i = 0; i < user_cards.length; i++) {
                                        if (users_obj[user_cards[i]?.user_pk]) {
                                                if (user_cards[i]?.item_pk > 0) {
                                                        users_obj[user_cards[i]?.user_pk]['pay_bill_key'] = user_cards[i]?.bill_key;
                                                } else if (user_cards[i]?.item_pk == 0) {
                                                        users_obj[user_cards[i]?.user_pk]['pay_bill_key'] = users_obj[user_cards[i]?.user_pk]?.bill_key;
                                                }
                                        }
                                }

                                let send_message_list = [];
                                let pay_obj = {};
                                for (var i = 0; i < pays.length; i++) {
                                        pay_obj[`${pays[i]?.contract_pk}-${pays[i]?.max_day}`] = true;
                                }

                                let pay_list = [];
                                let dead_day = 30;
                                for (var i = 0; i < contracts.length; i++) {
                                        let end_date = contracts[i]?.end_date;
                                        let distance_day = differenceTwoDate(end_date, return_moment.substring(0, 10));
                                        if (distance_day <= dead_day && distance_day >= 1) {
                                                if (users_obj[contracts[i][`${getEnLevelByNum(0)}_pk`]]) {
                                                        send_message_list.push({//임대인 푸시
                                                                phone: [users_obj[contracts[i][`${getEnLevelByNum(0)}_pk`]]?.phone, formatPhoneNumber(users_obj[contracts[i][`${getEnLevelByNum(0)}_pk`]]?.phone)],
                                                                message: `\n월세 계약 만료 ${distance_day}일 남았습니다.\n\n-달카페이-`
                                                        })
                                                }
                                                if (users_obj[contracts[i][`${getEnLevelByNum(5)}_pk`]]) {
                                                        send_message_list.push({//임대인 푸시
                                                                phone: [users_obj[contracts[i][`${getEnLevelByNum(5)}_pk`]]?.phone, formatPhoneNumber(users_obj[contracts[i][`${getEnLevelByNum(5)}_pk`]]?.phone)],
                                                                message: `\n월세 계약 만료 ${distance_day}일 남았습니다.\n\n-달카페이-`
                                                        })
                                                }
                                                if (users_obj[contracts[i][`${getEnLevelByNum(10)}_pk`]]) {
                                                        send_message_list.push({//임대인 푸시
                                                                phone: [users_obj[contracts[i][`${getEnLevelByNum(10)}_pk`]]?.phone, formatPhoneNumber(users_obj[contracts[i][`${getEnLevelByNum(10)}_pk`]]?.phone)],
                                                                message: `\n월세 계약 만료 ${distance_day}일 남았습니다.\n\n-달카페이-`
                                                        })
                                                }
                                        }

                                        if (contracts[i]?.pay_day == pay_day && !pay_obj[`${contracts[i]?.pk}-${return_moment.substring(0, 10)}`] && contracts[i][`${getEnLevelByNum(0)}_appr`] == 1 && contracts[i][`${getEnLevelByNum(5)}_appr`] == 1) {
                                                pay_list.push([
                                                        contracts[i][`${getEnLevelByNum(0)}_pk`],
                                                        contracts[i][`${getEnLevelByNum(5)}_pk`],
                                                        contracts[i][`${getEnLevelByNum(10)}_pk`],
                                                        contracts[i][`monthly`],
                                                        0,
                                                        0,
                                                        contracts[i][`pk`],
                                                        return_moment.substring(0, 10),
                                                        0,
                                                        '0000-00-00 00:00:99',
                                                        '0000-00-00',
                                                        '',
                                                        '',
                                                        '',
                                                ])
                                        }
                                }
                                //계약 만료 발송
                                for (var i = 0; i < send_message_list.length; i++) {
                                        //let result = await sendAligoSms({ receivers: send_message_list[i].phone, message: send_message_list[i].message })
                                }
                                //월세 입금 필요 추가
                                if (pay_list.length > 0) {
                                        let next_pay_day = return_moment.substring(0, 10).split('-');
                                        if (next_pay_day[1] == '12') {
                                                next_pay_day[0] = parseInt(next_pay_day[0]) + 1;
                                                next_pay_day[1] = '01';
                                        } else {
                                                next_pay_day[1] = parseInt(next_pay_day[1]) + 1;
                                                next_pay_day[1] = `${next_pay_day[1] <= 9 ? '0' : ''}${next_pay_day[1]}`;
                                        }
                                        next_pay_day = `${next_pay_day[0]}-${next_pay_day[1]}-${next_pay_day[2]}`;

                                        let result = await activeQuery(`INSERT pay_table (${getEnLevelByNum(0)}_pk, ${getEnLevelByNum(5)}_pk, ${getEnLevelByNum(10)}_pk, price, pay_category, status, contract_pk, day, is_auto, trade_date, trade_day, order_num, transaction_num, approval_num) VALUES ?`, [pay_list]);
                                        let result_pay_list = await dbQueryList(`SELECT * FROM pay_table WHERE day='${return_moment.substring(0, 10)}' AND pay_category=0 AND status=0`);
                                        result_pay_list = result_pay_list?.result;
                                        let send_message = `오늘은 ${return_moment.substring(0, 10)} 월세 납부하는 날입니다. :-)\n\n-달카페이-`;
                                        let confirm_send_message = `${return_moment.substring(0, 10)} 월세 납부 완료 되었습니다.\n 다음 정기결제일은 ${next_pay_day}일 입니다. \n\n-달카페이-`;
                                        for (var i = 0; i < result_pay_list.length; i++) {
                                                if (!users_obj[result_pay_list[i][`${getEnLevelByNum(0)}_pk`]]?.pay_bill_key) {
                                                        let result2 = await sendAligoSms({
                                                                receivers: [users_obj[result_pay_list[i][`${getEnLevelByNum(0)}_pk`]].phone, formatPhoneNumber(users_obj[result_pay_list[i][`${getEnLevelByNum(0)}_pk`]].phone)],
                                                                message: send_message
                                                        })
                                                } else {
                                                        let pay_item = result_pay_list[i];
                                                        users_obj[result_pay_list[i][`${getEnLevelByNum(0)}_pk`]]['bill_key'] = users_obj[result_pay_list[i][`${getEnLevelByNum(0)}_pk`]]?.pay_bill_key;
                                                        let temp_price = pay_item['price'];
                                                        pay_item['price'] = getMoneyByCardPercent(pay_item['price'], setting?.card_percent);
                                                        let resp = await onPay(users_obj[result_pay_list[i][`${getEnLevelByNum(0)}_pk`]], pay_item);
                                                        if (resp?.ResultCode == '00') {
                                                                try {
                                                                        pay_item['price'] = temp_price;
                                                                        await db.beginTransaction();
                                                                        let trade_day = `${resp?.PayDate.substring(0, 4)}-${resp?.PayDate.substring(4, 6)}-${resp?.PayDate.substring(6, 8)}`;
                                                                        let trade_date = `${trade_day} ${resp?.PayTime.substring(0, 2)}:${resp?.PayTime.substring(2, 4)}:${resp?.PayTime.substring(4, 6)}`
                                                                        let update_pay = await activeQuery(`UPDATE pay_table SET status=1, trade_date=?, trade_day=?, order_num=?, transaction_num=?, approval_num=?, card_percent=?, is_auto=1 WHERE pk=?`, [
                                                                                trade_date,
                                                                                trade_day,
                                                                                resp?.oid,
                                                                                resp?.tid,
                                                                                resp?.ApplNum,
                                                                                setting?.card_percent,
                                                                                pay_item?.pk
                                                                        ])
                                                                        let insert_point = await activeQuery(`INSERT INTO point_table (price, status, type, user_pk, pay_pk) VALUES (?, ?, ?, ?, ?)`, [
                                                                                parseInt(pay_item?.price) * (setting?.point_percent) / 100,
                                                                                1,
                                                                                pay_item?.pay_category,
                                                                                pay_item[`${getEnLevelByNum(0)}_pk`],
                                                                                pay_item?.pk
                                                                        ])
                                                                        let insert_commission = await activeQuery(`INSERT INTO commission_table (user_pk, pay_pk, percent, price, status, pay_user_pk) VALUES (?, ?, ?, ?, ?, ?)`, [
                                                                                pay_item[`${getEnLevelByNum(10)}_pk`],
                                                                                pay_item?.pk,
                                                                                users_obj[pay_item[`${getEnLevelByNum(10)}_pk`]]?.commission_percent,
                                                                                parseInt(pay_item?.price) * (users_obj[pay_item[`${getEnLevelByNum(10)}_pk`]]?.commission_percent) / 100,
                                                                                1,
                                                                                pay_item[`${getEnLevelByNum(0)}_pk`],
                                                                        ])
                                                                        await db.commit();
                                                                        let result2 = await sendAligoSms({
                                                                                receivers: [users_obj[result_pay_list[i][`${getEnLevelByNum(0)}_pk`]].phone, formatPhoneNumber(users_obj[result_pay_list[i][`${getEnLevelByNum(0)}_pk`]].phone)],
                                                                                message: confirm_send_message
                                                                        })
                                                                } catch (err) {
                                                                        console.log(err);
                                                                        await db.rollback();
                                                                }
                                                        }

                                                }
                                        }
                                }
                        }

                }

        })

}

const getMoneyByCardPercent = (price_, percent_) => {
        let price = parseFloat(price_);
        let percent = parseFloat(percent_);

        return price * (100 + percent) / 100;
}
const differenceTwoDate = (f_d_, s_d_) => {//두날짜의 시간차
        let f_d = new Date(f_d_).getTime();//큰시간
        let s_d = new Date(s_d_).getTime();//작은시간
        let hour = (f_d - s_d) / (1000 * 3600);
        let minute = (f_d - s_d) / (1000 * 60);
        let day = (f_d - s_d) / (1000 * 3600 * 24);
        return day;
}
let server = undefined
if (is_test) {
        server = http.createServer(app).listen(HTTP_PORT, function () {
                console.log("Server on " + HTTP_PORT)
                scheduleSystem();
        });
} else {
        const options = { // letsencrypt로 받은 인증서 경로를 입력해 줍니다.
                ca: fs.readFileSync("/etc/letsencrypt/live/dalcapay.com/fullchain.pem"),
                key: fs.readFileSync("/etc/letsencrypt/live/dalcapay.com/privkey.pem"),
                cert: fs.readFileSync("/etc/letsencrypt/live/dalcapay.com/cert.pem")
        };
        server = https.createServer(options, app).listen(HTTPS_PORT, function () {
                console.log("Server on " + HTTPS_PORT);
                scheduleSystem();
        });
}


// fs.readdir('./image/profile', async (err, filelist) => {
//         if (err) {
//                 console.log(err);
//         } else {
//                 for (var i = 0; i < filelist.length; i++) {
//                         if (filelist[i].includes('!@#')) {
//                                 await resizeFile('./image/profile', filelist[i]);
//                         }
//                 }
//         }
// });

// Default route for server status

app.get('/api/item', async (req, res) => {
        try {
                // if (tooMuchRequest(app.connectionsN)) {
                //          return response(req, res, -120, "접속자 수가 너무많아 지연되고있습니다.(잠시후 다시 시도 부탁드립니다.)", [])
                //  }
                let table = req.query.table ?? "user";
                //console.log(table)
                const pk = req.query.pk ?? 0;
                const community_list = ['faq', 'notice', 'guide'];
                const only_my_item = ['pay', 'contract'];
                const decode = checkLevel(req.cookies.token, 0)
                if (!decode) {
                        return response(req, res, -150, "권한이 없습니다.", []);
                }

                await db.beginTransaction();
                if (community_list.includes(table)) {
                        let community_add_view = await activeQuery(`UPDATE ${table}_table SET views=views+1 WHERE pk=?`, [pk]);
                }
                if (only_my_item.includes(table)) {
                        table = `v_${table}`;
                } else {
                        table = `${table}_table`;
                }
                let item = await dbQueryList(`SELECT * FROM ${table} WHERE pk=${pk}`);
                item = item?.result[0];
                if (only_my_item.includes(table)) {
                        if (decode?.user_level < 40) {
                                if (item[`${getEnLevelByNum(decode?.user_level)}_pk`] != decode?.pk) {
                                        await db.rollback();
                                        return response(req, res, -150, "권한이 없습니다.", []);
                                }
                        }
                }
                db.commit();
                return response(req, res, 100, "success", item);
        }
        catch (err) {
                await db.rollback();
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", []);
        }
});
app.get('/', (req, res) => {
        res.json({ message: `Server is running on port ${req.secure ? HTTPS_PORT : HTTP_PORT}` });
});
module.exports = {
        is_test
}