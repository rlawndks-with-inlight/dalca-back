//const { request } = require('express')
const jwt = require('jsonwebtoken')
const db = require('./config/db')
const firebase = require("firebase-admin");
const fcmNode = require("fcm-node");
const serviceAccount = require("./config/privatekey_firebase.json");
const { activeQuery, dbQueryList } = require('./query-util');
const crypto = require('crypto')
const salt = "435f5ef2ffb83a632c843926b35ae7855bc2520021a73a043db41670bfaeb722"
const saltRounds = 10
const pwBytes = 64
const jwtSecret = "djfudnsqlalfKeyFmfRkwu"

const firebaseToken = 'fV0vRpDpTfCnY_VggFEgN7:APA91bHdHP6ilBpe9Wos5Y72SXFka2uAM3luANewGuw7Bx2XGnvUNjK5e5k945xwcXpW8NNei3LEaBtKT2_2A6naix8Wg5heVik8O2Aop_fu8bUibnGxuCe3RLQDtHNrMeC5gmgGRoVh';
const fcmServerKey = "AAAAqJRPduU:APA91bEIVm9-Fli0Bty_hKUggbL0CGKe_CH6Mf1k09j2Iyv9Uqm1C7ILlIhEBNkjt5C5OvNtruMVMioVp962WWjbbxMb5zaY2nQ1TiXYZgFif5tQ58KayHQJpmubjBTeJ32qi3A4leQl";
firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount)
});
const sendAlarm = (title, note, table, pk, url) => {
    let fcm = new fcmNode(fcmServerKey)
    let message = {
        to: '/topics/' + 'first_academy',
        "click_action": "FLUTTER_NOTIFICATION_CLICK",
        "priority": "high",
        notification: {
            title: title,
            body: note,
            url: url ?? '/',
            click_action: "FLUTTER_NOTIFICATION_CLICK",
            badge: "1",
            "sound": "default"
        },
        data: {
            table: table,
            pk: pk.toString(),
            url: url ?? '/',
            title: title,
            body: note,
        }
    }
    //const options = { priority: 'high', timeToLive: 60 * 60 * 24 };
    fcm.send(message, (err, res) => {
        if (err) {
            console.log("Error sending message:", err);
        } else {
            console.log("Successfully sent message:", res);
        }
    })
}

let checkLevel = (token, level) => {
    try {
        if (token == undefined)
            return false

        //const decoded = jwt.decode(token)
        const decoded = jwt.verify(token, jwtSecret, (err, decoded) => {
            //console.log(decoded)
            if (err) {
                console.log("token이 변조되었습니다." + err);
                return false
            }
            else return decoded;
        })
        const user_level = decoded.user_level

        if (level > user_level && user_level != -10)
            return false
        else
            return decoded
    }
    catch (err) {
        console.log(err)
        return false
    }
}
const formatPhoneNumber = (input) => {
    const cleanInput = String(input).replaceAll(/[^0-9]/g, "");
    let result = "";
    const length = cleanInput.length;
    if (length === 8) {
        result = cleanInput.replace(/(\d{4})(\d{4})/, '$1-$2');
    } else if (cleanInput.startsWith("02") && (length === 9 || length === 10)) {
        result = cleanInput.replace(/(\d{2})(\d{3,4})(\d{4})/, '$1-$2-$3');
    } else if (!cleanInput.startsWith("02") && (length === 10 || length === 11)) {
        result = cleanInput.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
    } else {
        result = undefined;
    }
    return result;
}
const categoryToNumber = (str) => {
    if (str == 'oneword') {
        return 0;
    } else if (str == 'oneevent') {
        return 1;
    } else if (str == 'theme') {
        return 2;
    } else if (str == 'strategy') {
        return 3;
    } else if (str == 'issue') {
        return 4;
    } else if (str == 'feature') {
        return 5;
    } else if (str == 'video') {
        return 6;
    } else {
        return -1;
    }
}
const queryPromise = (table, sql, type) => {

    return new Promise(async (resolve, reject) => {
        await db.query(sql, (err, result, fields) => {
            if (err) {
                console.log(err)
                reject({
                    code: -200,
                    data: [],
                    table: table
                })
            } else {
                let type_ = type ?? 'list';
                let result_ = undefined;
                if (type_ == 'obj') {
                    result_ = { ...result[0] };
                } else {
                    result_ = [...result];
                }
                resolve({
                    code: 200,
                    data: result_,
                    table: table
                })
            }
        })
    })
}
const lowLevelException = {
    code: 403,
    message: "권한이 없습니다."
}
const nullRequestParamsOrBody = {
    code: 400,
    message: "입력이 잘못되었습니다.(요청 데이터 확인)"
}
const makeMaxPage = (num, page_cut) => {
    if (num % page_cut == 0) {
        return num / page_cut;
    } else {
        return parseInt(num / page_cut) + 1;
    }
}
const logRequestResponse = async (req, res, decode) => {

    let requestIp;
    try {
        requestIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || '0.0.0.0'
    } catch (err) {
        requestIp = '0.0.0.0'
    }

    let request = {
        url: req.originalUrl,
        headers: req.headers,
        query: req.query,
        params: req.params,
        body: req.body,
        file: req.file || req.files || null
    }
    request = JSON.stringify(request)
    let res_ = res;
    let response = JSON.stringify(res_)
    let user_pk = 0;
    let user_id = "";
    if (decode) {
        user_pk = decode.pk;
        user_id = decode.id;
    } else {
        user_pk = -1;
    }
    let result = await activeQuery(
        "INSERT INTO log_table (request, response_result, response_message, request_ip, user_id, user_pk) VALUES (?, ?, ?, ?, ?, ?)",
        [request, res?.result, res?.message, requestIp, user_id, user_pk]
    )
}

const tooMuchRequest = (num) => {
    if (num > 1000) {
        return true;
    }
}
const logRequest = (req) => {
    const requestIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip
    let request = {
        url: req.originalUrl,
        headers: req.headers,
        query: req.query,
        params: req.params,
        body: req.body
    }
    request = JSON.stringify(request)
    db.query(
        "INSERT INTO log_information_tb (request, request_ip) VALUES (?, ?)",
        [request, requestIp],
        (err, result, fields) => {
            if (err)
                console.log(err)
            else {
                console.log(result)
            }
        }
    )
}
const logResponse = (req, res) => {
    const requestIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip
    let response = JSON.stringify(res)
    // db.query(
    //     "UPDATE log_information_tb SET response=? WHERE request_ip=? ORDER BY pk DESC LIMIT 1",
    //     [response, requestIp],
    //     (err, result, fields) => {
    //         if(err)
    //             console.log(err)
    //         else {
    //             console.log(result)
    //         }
    //     }
    // )
}

/*

*/
const getUserPKArrStrWithNewPK = (userPKArrStr, newPK) => {
    let userPKList = JSON.parse(userPKArrStr)
    if (userPKList.indexOf(newPK) == -1)
        userPKList.push(newPK)
    return JSON.stringify(userPKList)
}

const isNotNullOrUndefined = (paramList) => {
    for (let i in paramList)
        if (i == undefined || i == null)
            return false
    return true
}

// api가 ad인지 product인지 확인 후 파일 네이밍
const namingImagesPath = (api, files) => {
    if (api == "ad") {
        return {
            image: (files) ? "/image/ad/" + files.filename : "/image/ad/defaultAd.png",
            isNull: !(files)
        }
    }
    else if (api == "product") {
        return {
            mainImage: (files.mainImage) ? "/image/item/" + files.mainImage[0].filename : "/image/item/defaultItem.png",
            detailImage: (files.detailImage) ? "/image/detailItem/" + files.detailImage[0].filename : "/image/detailItem/defaultDetail.png",
            qrImage: (files.qrImage) ? "/image/qr/" + files.qrImage[0].filename : "/image/qr/defaultQR.png",
            isNull: [!files.mainImage, !files.detailImage, !files.qrImage]
        }
    }
}
function removeItems(arr, value) {
    var i = 0;
    while (i < arr.length) {
        if (arr[i] === value) {
            arr.splice(i, 1);
        } else {
            ++i;
        }
    }
    return arr;
}

function getSQLnParams(query, params, colNames) {
    let sql = query
    let returnParams = []

    for (let i = 0, count = 0; i < params.length; i++) {
        if (params[i]) {
            if (count > 0)
                sql += ', '
            sql += colNames[i] + '=?'
            returnParams.push(params[i])
            count++
        }
    }
    return { sql, param: returnParams }
}
let concentration_user_list = [];
function response(req, res, code, message, data) {
    var resDict = {
        'result': code,
        'message': message,
        'data': data,
    }
    const decode = checkLevel(req.cookies.token, 0)
    if (true || req.originalUrl.includes('login') || req.originalUrl.includes('delete') || req.originalUrl.includes('insertpayresult') || concentration_user_list.includes(decode?.pk)) {
        logRequestResponse(req, resDict, decode);
    }
    res.send(resDict);
}
function nullResponse(req, res) {
    response(req, res, -200, "입력이 잘못되었습니다.(요청 데이터 확인)", [])
}
function lowLevelResponse(req, res) {
    response(req, res, -200, "권한이 없습니다", [])
}
const returnMoment = (d) => {
    var today = new Date();
    if (d) {
        today = new Date(d);
    }
    var year = today.getFullYear();
    var month = ('0' + (today.getMonth() + 1)).slice(-2);
    var day = ('0' + today.getDate()).slice(-2);
    var dateString = year + '-' + month + '-' + day;
    var hours = ('0' + today.getHours()).slice(-2);
    var minutes = ('0' + today.getMinutes()).slice(-2);
    var seconds = ('0' + today.getSeconds()).slice(-2);
    var timeString = hours + ':' + minutes + ':' + seconds;
    let moment = dateString + ' ' + timeString;
    return moment;
}
const getQuestions = (length) => {
    let result = [];
    for (var i = 0; i < length; i++) {
        result.push('?');
    }
    return result;
}
const makeHash = (pw_) => {

    return new Promise(async (resolve, reject) => {
        let pw = pw_;
        if (!(typeof pw == 'string')) {
            pw = pw.toString();
        }
        await crypto.pbkdf2(pw, salt, saltRounds, pwBytes, 'sha512', async (err, decoded) => {
            // bcrypt.hash(pw, salt, async (err, hash) => {
            let hash = decoded.toString('base64');
            if (err) {
                reject({
                    code: -200,
                    data: undefined,
                })
            } else {
                resolve({
                    code: 200,
                    data: hash,
                })
            }
        })
    })
}
const getKewordListBySchema = (schema_) => {
    let schema = schema_;
    let list = [];
    if (schema == 'user') {
        list = ['id', 'name', 'phone', 'id_number', 'office_address', 'office_zip_code', 'office_name', 'office_phone'];
    } else if (schema == 'comment') {
        list = ['user_table.id', 'user_table.nickname', 'note', 'item_title'];
    } else if (schema == 'contract') {
        list = ['pk', 'address', 'lessee_id', 'landlord_id', 'realtor_id'];
    } else if (schema == 'pay') {
        list = ['contract_pk', 'lessee_id', 'landlord_id', 'realtor_id', 'lessee_name', 'landlord_name', 'realtor_name'];
    } else if (schema == 'academy') {
        list = ['academy_table.title', 'academy_category_table.title'];
    } else if (schema == 'app') {
        list = ['name'];
    } else if (schema == 'popup') {
        list = ['link'];
    } else if (schema == 'request') {
        list = ['user_table.id', 'user_table.name', 'title'];
    } else if (schema == 'faq') {
        list = ['title'];
    } else if (schema == 'event') {
        list = ['title'];
    } else if (schema == 'notice') {
        list = ['title'];
    } else if (schema == 'review') {
        list = ['review_table.title', 'user_table.nickname'];
    } else if (schema == 'real_estate') {
        list = ['real_estate_table.name', 'real_estate_table.hash', 'real_estate_table.address', 'real_estate_table.zip_code'];
    } else if (schema == 'alarm') {
        list = [];
    } else {
        link = [];
    }
    return list;
}
const getEnLevelByNum = (num) => {
    if (num == 0)
        return 'lessee';
    else if (num == 5)
        return 'landlord';
    else if (num == 10)
        return 'realtor';
    else if (num == 40)
        return 'manager';
    else if (num == 50)
        return 'developer';
}
const getNumByEnLevel = (str) => {
    if (str == 'lessee')
        return 0;
    else if (str == 'landlord')
        return 5;
    else if (str == 'realtor')
        return 10;
    else if (str == 'manager')
        return 40;
    else if (str == 'developer')
        return 50;
}
const getKoLevelByNum = (num) => {
    if (num == 0)
        return '임차인';
    else if (num == 5)
        return '임대인';
    else if (num == 10)
        return '공인중개사';
    else if (num == 40)
        return '관리자';
    else if (num == 50)
        return '개발자';
}
const commarNumber = (num) => {
    let str = "";
    if (typeof num == "number") {
        str = num.toString();
    } else {
        str = num;
    }
    if (!str) {
        return "---";
    }
    let result = "";
    let count = 0;
    for (var i = str.length - 1; i >= 0; i--) {
        if (count % 3 == 0 && count != 0) result = "," + result;
        result = str[i] + result;
        count++;
    }
    return result;
}
const initialDownPayment = async (contract) => {//계약금 내역 추가
    if (
        contract[`${getEnLevelByNum(0)}_appr`] == 1 &&
        contract[`${getEnLevelByNum(5)}_appr`] == 1 &&
        contract[`deposit`] > 0 &&
        contract[`monthly`] > 0
    ) {
        let result = await activeQuery(`UPDATE contract_table SET is_confirm=1, confirm_date=? WHERE pk=?`, [returnMoment(), contract[`pk`]]);
        let result2 = await activeQuery(`INSERT pay_table (${getEnLevelByNum(0)}_pk, ${getEnLevelByNum(5)}_pk, ${getEnLevelByNum(10)}_pk, price, pay_category, status, contract_pk, day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                contract[`${getEnLevelByNum(0)}_pk`],
                contract[`${getEnLevelByNum(5)}_pk`],
                contract[`${getEnLevelByNum(10)}_pk`],
                parseInt(contract[`deposit`]) / 10,
                2,
                0,
                contract[`pk`],
                returnMoment().substring(0, 10)
            ])
    }
}
const initialPay = async (contract) => { // 월세 내역 추가
    let return_moment = returnMoment().substring(0, 10);
    let return_moment_list = return_moment.split('-');
    let pay_day = `${contract['pay_day'] >= 10 ? `${contract['pay_day']}` : `0${contract['pay_day']}`}`;//몇일
    let result_day = "";
    if (return_moment_list[2] <= pay_day) {
        return_moment_list[2] = pay_day;
    } else {
        if (return_moment_list[1] == '12') {
            return_moment_list[0] = parseInt(return_moment_list[0]) + 1;
            return_moment_list[1] = '01';
        } else {
            return_moment_list[1] = parseInt(return_moment_list[1]) + 1;
            return_moment_list[1] = `${return_moment_list[1] >= 10 ? `${return_moment_list[1]}` : `0${return_moment_list[1]}`}`;
            return_moment_list[2] = pay_day;
        }
    }
    result_day = `${return_moment_list[0]}-${return_moment_list[1]}-${return_moment_list[2]}`;
    let realtor = await dbQueryList(`SELECT * FROM user_table WHERE pk=${contract[`${getEnLevelByNum(10)}_pk`]}`);
    realtor = realtor?.result[0];
    if(realtor?.is_agree_brokerage_fee == 1){
        let result_brokerage_fee_1 = await activeQuery(`INSERT pay_table (${getEnLevelByNum(0)}_pk, ${getEnLevelByNum(5)}_pk, ${getEnLevelByNum(10)}_pk, price, pay_category, status, contract_pk, day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            contract[`${getEnLevelByNum(5)}_pk`],
            contract[`${getEnLevelByNum(5)}_pk`],
            contract[`${getEnLevelByNum(10)}_pk`],
            contract[`brokerage_fee`],
            3,
            0,
            contract[`pk`],
            result_day
        ]);
        let result_brokerage_fee_2 = await activeQuery(`INSERT pay_table (${getEnLevelByNum(0)}_pk, ${getEnLevelByNum(5)}_pk, ${getEnLevelByNum(10)}_pk, price, pay_category, status, contract_pk, day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            contract[`${getEnLevelByNum(0)}_pk`],
            contract[`${getEnLevelByNum(5)}_pk`],
            contract[`${getEnLevelByNum(10)}_pk`],
            contract[`brokerage_fee`],
            3,
            0,
            contract[`pk`],
            result_day
        ]);
    }
    let result_monthly = await activeQuery(`INSERT pay_table (${getEnLevelByNum(0)}_pk, ${getEnLevelByNum(5)}_pk, ${getEnLevelByNum(10)}_pk, price, pay_category, status, contract_pk, day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        contract[`${getEnLevelByNum(0)}_pk`],
        contract[`${getEnLevelByNum(5)}_pk`],
        contract[`${getEnLevelByNum(10)}_pk`],
        contract[`monthly`],
        0,
        0,
        contract[`pk`],
        result_day
    ]);
}
const brokerageFee = (deposit, monthly) => {
    let result = deposit + monthly * 70;
    if (result >= 600000000) {
        result = result / 1000 * 4;
    } else if (result >= 100000000) {
        result = result / 1000 * 3;
    } else if (result >= 50000000) {
        result = result / 1000 * 4;
    } else if (result >= 0) {
        result = result / 1000 * 5;
    }
    return result;
}
module.exports = {
    checkLevel, lowLevelException, nullRequestParamsOrBody,
    logRequestResponse, logResponse, logRequest,
    getUserPKArrStrWithNewPK, isNotNullOrUndefined,
    namingImagesPath, getSQLnParams, initialDownPayment,
    nullResponse, lowLevelResponse, response, removeItems, returnMoment, formatPhoneNumber, categoryToNumber, sendAlarm, makeMaxPage, tooMuchRequest,
    queryPromise, makeHash, commarNumber, getKewordListBySchema, getEnLevelByNum, getKoLevelByNum, getQuestions, getNumByEnLevel, initialPay, brokerageFee
}