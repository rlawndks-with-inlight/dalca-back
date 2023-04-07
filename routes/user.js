const express = require('express')
//const { json } = require('body-parser')
const router = express.Router()
const cors = require('cors')
router.use(cors())
router.use(express.json())

const crypto = require('crypto')
//const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const when = require('when')
let iconv = require('iconv-lite');
const { checkLevel, getSQLnParams, getUserPKArrStrWithNewPK,
    isNotNullOrUndefined, namingImagesPath, nullResponse,
    lowLevelResponse, response, removeItems, returnMoment, formatPhoneNumber,
    categoryToNumber, sendAlarm, makeMaxPage, queryPromise, makeHash, commarNumber, getKewordListBySchema,
    getEnLevelByNum, getKoLevelByNum,
    getQuestions, getNumByEnLevel, initialPay
} = require('../util')
const {
    getRowsNumWithKeyword, getRowsNum, getAllDatas,
    getDatasWithKeywordAtPage, getDatasAtPage,
    getKioskList, getItemRows, getItemList, dbQueryList, dbQueryRows, insertQuery, getTableAI
} = require('../query-util')

const { sendAligoSms } = require('./common')
const macaddress = require('node-macaddress');

const db = require('../config/db')
const { upload } = require('../config/multerConfig')
const { Console, table } = require('console')
const { abort } = require('process')
const axios = require('axios')
//const { pbkdf2 } = require('crypto')
const salt = "435f5ef2ffb83a632c843926b35ae7855bc2520021a73a043db41670bfaeb722"
const saltRounds = 10
const pwBytes = 64
const jwtSecret = "djfudnsqlalfKeyFmfRkwu"
const { format, formatDistance, formatRelative, subDays } = require('date-fns')
const geolocation = require('geolocation')
const { sqlJoinFormat, listFormatBySchema, myItemSqlJoinFormat } = require('../format/formats')
const { param } = require('jquery')
const kakaoOpt = {
    clientId: '4a8d167fa07331905094e19aafb2dc47',
    redirectUri: 'http://172.30.1.19:8001/api/kakao/callback',
};
const PAY_ADDRESS = {
    TEST: `https://tpayapi.paywelcome.co.kr`,
    SERVICE: `https://payapi.paywelcome.co.kr`,
}
const PAY_INFO = {
    SIGN_KEY: `b3VGY2R5ZzI5M2xCZzhrT0paQ1oxQT09`,
    MID: `wpaybill01`,
    API_IV: `1111111111111111`,
    API_KEY: `11111111111111111111111111111111`
}
const addContract = async (req, res) => {
    try {
        const decode = checkLevel(req.cookies.token, 10)
        if (!decode) {
            return response(req, res, -150, "권한이 없습니다.", [])
        }
        const is_user = req.body.is_user;
        if (is_user && decode?.user_level != 10) {
            return response(req, res, -150, "공인중개사 권한만 접근 가능합니다.", [])
        }
        const { deposit, monthly, document_src, address, address_detail, zip_code, start_date, end_date, pay_day } = req.body;
        let result = await insertQuery('INSERT INTO contract_table ( deposit, monthly, document_src, address, address_detail, zip_code, start_date, end_date, pay_day, realtor_pk, step) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [deposit, monthly, document_src, address, address_detail, zip_code, start_date, end_date, pay_day, decode?.pk, 1]);
        return response(req, res, 100, "success", {
            result_pk: result?.result?.insertId
        });
    }
    catch (err) {
        console.log(err)
        return response(req, res, -200, "서버 에러 발생", []);
    }

}
const updateContract = async (req, res) => {
    try {
        const decode = checkLevel(req.cookies.token, 10)
        if (!decode) {
            return response(req, res, -150, "권한이 없습니다.", [])
        }
        const { deposit, monthly, address, address_detail, zip_code, start_date, pay_day, pk, document_src } = req.body;
        console.log(req.body)

        let value_str = "deposit=?, monthly=?, address=?, address_detail=?, zip_code=? , start_date=?, pay_day=? ";
        let value_list = [deposit, monthly, address, address_detail, zip_code, start_date, pay_day];
        if (document_src) {
            if (document_src == -1) {
                value_list.push('')
            } else {
                value_list.push(document_src)
            }
            value_str += `, document_src=?`
        }
        let result = await insertQuery(`UPDATE contract_table SET ${value_str} WHERE pk=${pk}`, value_list);
        return response(req, res, 100, "success", []);
    }
    catch (err) {
        console.log(err)
        return response(req, res, -200, "서버 에러 발생", []);
    }

}
const getHomeContent = async (req, res) => {
    try {
        const decode = checkLevel(req.cookies.token, 0);
        if (!decode) {
            return response(req, res, -150, "권한이 없f습니다.", [])
        }
        let result_list = [];
        let user_level_list = [0, 5, 10];
        let user_where_sql = "";
        if (user_level_list.includes(decode?.user_level)) {
            user_where_sql = `WHERE ${getEnLevelByNum(decode?.user_level)}_pk=${decode?.pk}`;
        }
        let sql_list = [
            { table: 'notice', sql: 'SELECT notice_table.*, user_table.nickname FROM notice_table LEFT JOIN user_table ON notice_table.user_pk=user_table.pk WHERE notice_table.status=1 ORDER BY notice_table.sort DESC LIMIT 2', type: 'list' },
            { table: 'setting', sql: 'SELECT * FROM setting_table', type: 'obj' },
            { table: 'contract', sql: `SELECT * FROM v_contract ${user_where_sql} ORDER BY pk DESC LIMIT 5`, type: 'list' },
            { table: 'pay', sql: `SELECT * FROM v_pay ${user_where_sql} ORDER BY pk DESC LIMIT 5`, type: 'list' },
        ];

        for (var i = 0; i < sql_list.length; i++) {
            result_list.push(queryPromise(sql_list[i]?.table, sql_list[i]?.sql));
        }
        for (var i = 0; i < result_list.length; i++) {
            await result_list[i];
        }
        let result_obj = {};
        for (var i = 0; i < sql_list.length; i++) {
            result_list.push(queryPromise(sql_list[i].table, sql_list[i].sql, sql_list[i].type));
        }
        for (var i = 0; i < result_list.length; i++) {
            await result_list[i];
        }
        let result = (await when(result_list));
        for (var i = 0; i < (await result).length; i++) {
            result_obj[(await result[i])?.table] = (await result[i])?.data;
        }
        return response(req, res, 100, "success", result_obj)

    } catch (err) {
        console.log(err)
        return response(req, res, -200, "서버 에러 발생", [])
    }
}
const requestContractAppr = async (req, res) => {
    try {
        const decode = checkLevel(req.cookies.token, 10);
        if (!decode) {
            return response(req, res, -150, "권한이 없습니다.", []);
        }
        const { user_pk, contract_pk, request_level } = req.body;
        let user = await dbQueryList(`SELECT * FROM user_table WHERE pk=${user_pk}`);
        user = user?.result[0];
        let contract = await dbQueryList(`SELECT * FROM contract_table WHERE pk=${contract_pk}`);
        contract = contract?.result[0];
        if (contract?.realtor_pk != decode?.pk) {
            return response(req, res, -150, "권한이 없습니다.", []);
        }
        if (request_level == 0 || request_level == 5) {

        } else {
            return response(req, res, -100, "잘못된 레벨입니다.", []);
        }
        if (request_level != user?.user_level) {
            return response(req, res, -100, "선택한 유저의 레벨이 잘못되었습니다.", []);
        }
        let receiver = [user?.phone, formatPhoneNumber(user?.phone)];
        let content = `\n${request_level == 5 ? '임대인' : '임차인'}동의가 필요합니다.\n 링크: https://dalcapay.com/contract/${contract_pk}\n\n-달카페이-`;
        await sendAligoSms({ receivers: receiver, message: content }).then(async (result) => {
            console.log(result)
            if (result.result_code == '1') {
                let result = await insertQuery(`UPDATE contract_table SET ${getEnLevelByNum(request_level)}_pk=${user_pk} WHERE pk=${contract_pk}`);
                return response(req, res, 100, "success", []);
            } else {
                return response(req, res, -100, "fail", [])
            }
        });

    } catch (err) {
        console.log(err)
        return response(req, res, -200, "서버 에러 발생", [])
    }
}
const confirmContractAppr = async (req, res) => {
    try {
        const { contract_pk } = req.body;
        const decode = checkLevel(req.cookies.token, 0);
        if (!decode) {
            return response(req, res, -150, "권한이 없습니다.", []);
        }
        if (decode?.user_level != 0 && decode?.user_level != 5) {
            return response(req, res, -150, "권한이 없습니다.", []);
        }
        let contract = await dbQueryList(`SELECT * FROM contract_table WHERE pk=${contract_pk}`);
        contract = contract?.result[0];
        if (contract[`${getEnLevelByNum(decode?.user_level)}_appr`] == 1) {
            return response(req, res, -100, "이미 수락한 계약입니다.", []);
        }
        await db.beginTransaction();
        let result = await insertQuery(`UPDATE contract_table SET ${getEnLevelByNum(decode?.user_level)}_appr=1 WHERE pk=${contract_pk}`);

        let now_contract = await dbQueryList(`SELECT * FROM contract_table WHERE pk=${contract_pk}`);
        now_contract = now_contract?.result[0];
        await initialPay(now_contract);
        await db.commit();
        return response(req, res, 100, "success", []);
    } catch (err) {
        console.log(err)
        await db.rollback();
        return response(req, res, -200, "서버 에러 발생", [])
    }
}
const onResetContractUser = async (req, res) => {
    try {
        const decode = checkLevel(req.cookies.token, 10);
        if (!decode) {
            return response(req, res, -150, "권한이 없습니다.", []);
        }
        const { contract_pk, request_level } = req.body;
        let contract = await dbQueryList(`SELECT * FROM contract_table WHERE pk=${contract_pk}`);
        contract = contract?.result[0];
        if (contract?.realtor_pk != decode?.pk) {
            return response(req, res, -150, "권한이 없습니다.", []);
        }
        let result = await insertQuery(`UPDATE contract_table SET ${getEnLevelByNum(request_level)}_pk=NULL, ${getEnLevelByNum(request_level)}_appr=0 WHERE pk=${contract_pk}`);
        return response(req, res, 100, "success", []);
    } catch (err) {
        console.log(err)
        return response(req, res, -200, "서버 에러 발생", [])
    }
}
const onChangeCard = async (req, res) => {
    try {
        const decode = checkLevel(req.cookies.token, 0);
        if (!decode) {
            return response(req, res, -150, "권한이 없습니다.", []);
        }

        const { card_number, card_name, card_expire, card_cvc, card_password, birth, user_pk } = req.body;
        
        let pk = (decode?.user_level >= 40 && user_pk) ? user_pk : decode?.pk;
        
        let user = decode;
        if(decode?.user_level >= 40 && user_pk){
            user = await dbQueryList(`SELECT * FROM user_table WHERE pk=?`,[pk]);
            user = user?.result[0];
        }
        if (user?.name != card_name) {
            return response(req, res, -100, "카드 소유자명과 회원정보가 일치하지 않습니다.", []);
        }

        let create_bill_key = await createBillKey(user, req.body)
        if (create_bill_key?.result < 0) {
            return response(req, res, -100, create_bill_key?.data?.ResultMsg, [])
        }
        let bill_key = create_bill_key?.data;
        let result = await insertQuery(`UPDATE user_table SET card_number=?, card_name=?, card_expire=?, card_cvc=?, card_password=?, birth=?, bill_key=? WHERE pk=?`, [card_number, card_name, card_expire, card_cvc, card_password, birth, bill_key, pk]);

        return response(req, res, 100, "success", []);
    } catch (err) {
        console.log(err)
        return response(req, res, -200, "서버 에러 발생", [])
    }
}
const getCustomInfo = async (req, res) => {
    try {
        const decode = checkLevel(req.cookies.token, 0);
        if (!decode) {
            return response(req, res, -150, "권한이 없습니다.", []);
        }
        const { level, page } = req.query;
        let my_contracts = await dbQueryList(`SELECT * FROM contract_table WHERE ${getEnLevelByNum(decode?.user_level)}_pk=${decode?.pk} ORDER by pk DESC`);
        my_contracts = my_contracts?.result;
        let user_pk_list = my_contracts.map((item) => {
            return item[`${getEnLevelByNum(level)}_pk`]
        })
        let user_count = 0;
        if (user_pk_list.length > 0) {
            user_count = await dbQueryList(`SELECT COUNT(*) FROM user_table WHERE pk IN (${user_pk_list.join()}) `);
            user_count = user_count?.result[0];
            user_count = user_count['COUNT(*)'];
            user_count = makeMaxPage(user_count, 10);
        }
        let user_list = [];
        if (user_pk_list.length > 0) {
            user_list = await dbQueryList(`SELECT * FROM user_table WHERE pk IN (${user_pk_list.join()}) LIMIT ${(page - 1) * 10}, 10`);
            user_list = user_list?.result;
        }
        return response(req, res, 100, "success", {
            data: user_list,
            maxPage: user_count
        });
    } catch (err) {
        console.log(err)
        return response(req, res, -200, "서버 에러 발생", [])
    }
}
const getMyPays = async (req, res) => {
    try {
        const decode = checkLevel(req.cookies.token, 0);
        if (!decode) {
            return response(req, res, -150, "권한이 없습니다.", []);
        }
        const { page, status, page_cut } = req.query;
        let pay_sql = `SELECT * FROM v_pay `;
        let page_sql = ` SELECT COUNT(*) FROM v_pay `
        let result_obj = {};
        if (status) {
            pay_sql += ` WHERE status=${status} `;
            page_sql += ` WHERE status=${status} `;
        }
        pay_sql += ` ORDER BY pk DESC `
        if (page) {
            pay_sql += ` LIMIT ${(page - 1) * page_cut}, ${page_cut} `;
        }
        let page_result = await dbQueryList(page_sql);
        page_result = page_result?.result[0]['COUNT(*)'];
        page_result = makeMaxPage(page_result, page_cut ?? 10);
        let data_result = await dbQueryList(pay_sql);
        data_result = data_result?.result;
        return response(req, res, 100, "success", {
            data: data_result,
            maxPage: page_result
        });
    } catch (err) {
        console.log(err)
        return response(req, res, -200, "서버 에러 발생", [])
    }
}
const onPayByDirect = async (req, res) => {
    try {
        const decode = checkLevel(req.cookies.token, 0);
        if (!decode || decode?.user_level != 0) {
            return response(req, res, -150, "권한이 없습니다.", []);
        }
        let user = await dbQueryList(`SELECT * FROM user_table WHERE pk=${decode?.pk}`);
        user = user?.result[0];
        if (!user) {
            return response(req, res, -150, "유저정보 에러 발생.", []);
        }
        const { item_pk } = req.body;
        let pay_item = await dbQueryList(`SELECT * FROM pay_table WHERE pk=${item_pk}`);
        pay_item = pay_item?.result[0];
        if (pay_item[`${getEnLevelByNum(0)}_pk`] != decode?.pk || pay_item?.status == -1) {
            return response(req, res, -150, "권한이 없습니다.", []);
        }
        if (pay_item?.status == 1) {
            return response(req, res, -150, "이미 결제 하였습니다.", []);
        }
        let resp = await onPay(user, pay_item);
        if (resp?.ResultCode == '00') {
            let trade_day = `${resp?.PayDate.substring(0, 4)}-${resp?.PayDate.substring(4, 6)}-${resp?.PayDate.substring(6, 8)}`;
            let trade_date = `${trade_day} ${resp?.PayTime.substring(0, 2)}:${resp?.PayTime.substring(2, 4)}:${resp?.PayTime.substring(4, 6)}`
            let update_pay = await insertQuery(`UPDATE pay_table SET status=1, trade_date=?, trade_day=?, order_num=?, transaction_num=?, approval_num=? WHERE pk=?`, [
                trade_date,
                trade_day,
                resp?.oid,
                resp?.tid,
                resp?.ApplNum,
                item_pk
            ])
            return response(req, res, 100, "success", []);
        } else {
            return response(req, res, -100, resp?.ResultMsg, [])
        }
    } catch (err) {
        console.log(err)
        return response(req, res, -200, "서버 에러 발생", [])
    }
}
const onPayCancelByDirect = async (req, res) => {
    try {
        let { item_pk, password } = req.body;
        const decode = checkLevel(req.cookies.token, 40);
        if (!decode) {
            return response(req, res, -150, "권한이 없습니다.", []);
        }

        let pay_item = await dbQueryList(`SELECT * FROM pay_table WHERE pk=${item_pk}`);
        pay_item = pay_item?.result[0];

        let payType = 'card';
        let mid = PAY_INFO.MID;
        let mkey = await Buffer.from(crypto.createHash('sha256').update(PAY_INFO.SIGN_KEY).digest('hex')).toString();
        let tid = pay_item?.transaction_num;
        let price = pay_item?.price;
        let currency = 'WON';
        let return_moment = returnMoment();
        return_moment = return_moment.replaceAll('-', '');
        return_moment = return_moment.replaceAll(':', '');
        return_moment = return_moment.replaceAll(' ', '');
        let timestamp = return_moment;
        let signature = {
            mid: mid,
            mkey: mkey,
            timestamp: return_moment,
        }
        signature = new URLSearchParams(signature).toString(); //getQueryByObject(signature);
        signature = await Buffer.from(crypto.createHash('sha256').update(signature).digest('hex')).toString();
        let obj = {
            payType: payType,
            mid: mid,
            tid: tid,
            price: price,
            currency: currency,
            timestamp: timestamp,
            signature: signature,
        }
        let query = new URLSearchParams(obj).toString(); //getQueryByObject(obj);
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
        const { data: resp } = await axios.post(`${PAY_ADDRESS.TEST}/cancel/cancel`, query, headers);
        if (resp?.ResultCode == '00') {
            let cancel_day = `${resp?.CancelDate.substring(0, 4)}-${resp?.CancelDate.substring(4, 6)}-${resp?.CancelDate.substring(6, 8)}`;
            let cancel_date = `${cancel_day} ${resp?.CancelTime.substring(0, 2)}:${resp?.CancelTime.substring(2, 4)}:${resp?.CancelTime.substring(4, 6)}`
            let result = await insertQuery(`INSERT INTO pay_table (landlord_pk, lessee_pk, realtor_pk, price, pay_category, status, contract_pk, day, trade_date, trade_day, transaction_num ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                pay_item?.landlord_pk,
                pay_item?.lessee_pk,
                pay_item?.realtor_pk,
                (pay_item?.price) * (-1),
                pay_item?.pay_category,
                -1,
                pay_item?.contract_pk,
                pay_item?.day,
                cancel_date,
                cancel_day,
                pay_item?.transaction_num
            ])
            return response(req, res, 100, "success", []);
        } else {
            if (resp?.ResultCode == '01') {
                return response(req, res, -100, '이미 취소한 거래입니다.', [])
            }
            return response(req, res, -100, resp?.ResultMsg, [])
        }
    } catch (err) {
        console.log(err)
        return response(req, res, -200, "서버 에러 발생", [])
    }
}
const onPay = async (user, pay_item) => {
    let mid = PAY_INFO.MID;
    let mkey = await Buffer.from(crypto.createHash('sha256').update(PAY_INFO.SIGN_KEY).digest('hex')).toString();
    let return_moment = returnMoment();
    return_moment = return_moment.replaceAll('-', '');
    return_moment = return_moment.replaceAll(':', '');
    return_moment = return_moment.replaceAll(' ', '');
    let oid = `${pay_item?.pk}${user?.pk}${return_moment}`;
    let price = parseInt(pay_item?.price);
    let buyerName = user?.name;
    if (user?.name != user?.card_name) {
        // return response(req, res, -100, "카드 소유자명과 회원정보가 일치하지 않습니다.", []);
    }
    let billkey = user?.bill_key;
    let timestamp = return_moment;
    let signature = {
        mid: mid,
        mkey: mkey,
        oid: oid,
        price: price,
        timestamp: return_moment,
    }
    signature = new URLSearchParams(signature).toString(); //getQueryByObject(signature);
    signature = await Buffer.from(crypto.createHash('sha256').update(signature).digest('hex')).toString();
    let obj = {
        mid: mid,
        oid: oid,
        price: price,
        buyerName: buyerName,
        billkey: billkey,
        timestamp: timestamp,
        signature: signature,
    }
    let query = new URLSearchParams(obj).toString(); //getQueryByObject(obj);
    let headers = {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }
    const { data: resp } = await axios.post(`${PAY_ADDRESS.TEST}/billing/billpay`, query, headers);
    return { ...resp, oid: oid };
}
const onPayCancel = () => {

}
//빌키생성, 빌키승인(결제), 결제취소, 빌키삭제
const createBillKey = async (decode, body) => {
    let mid = PAY_INFO.MID;
    let mkey = await Buffer.from(crypto.createHash('sha256').update(PAY_INFO.SIGN_KEY).digest('hex')).toString();
    let return_moment = returnMoment();
    return_moment = return_moment.replaceAll('-', '');
    return_moment = return_moment.replaceAll(':', '');
    return_moment = return_moment.replaceAll(' ', '');
    let signature = {
        mid: mid,
        mkey: mkey,
        cardNumber: body?.card_number.replaceAll(' ', ''),
        timestamp: return_moment,
    }

    signature = new URLSearchParams(signature).toString(); //getQueryByObject(signature);
    signature = await Buffer.from(crypto.createHash('sha256').update(signature).digest('hex')).toString();
    let obj = {
        mid: mid,
        buyerName: body?.card_name,
        cardNumber: getASE256Encrypt(body?.card_number.replaceAll(' ', '')),
        cardExpireYY: body?.card_expire.split('/')[1],
        cardExpireMM: body?.card_expire.split('/')[0],
        registNo: getASE256Encrypt(body?.birth),
        passwd: getASE256Encrypt(body?.card_password),
        timestamp: return_moment,
        signature: signature,
    }
    let query = new URLSearchParams(obj).toString(); //getQueryByObject(obj);
    let headers = {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }
    const { data: response } = await axios.post(`${PAY_ADDRESS.TEST}/billing/billkey/card`, query, headers);
    if (response?.ResultCode == '00') {
        return {
            result: 100,
            data: response?.Billkey
        }
    } else {
        return {
            result: -100,
            data: {
                ResultMsg: response?.ResultMsg
            }
        }
    }
}

const getQueryByObject = (obj) => {
    let query = "";
    let keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
        query += `${keys[i]}=${obj[keys[i]]}&`;
    }
    query = query.substring(0, query.length - 1);
    return query;
}
var getASE256Encrypt = ((val) => {
    let cipher = crypto.createCipheriv('aes-256-cbc', PAY_INFO.API_KEY, PAY_INFO.API_IV);
    let encrypted = cipher.update(val, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
});

const apprBillKey = () => {

}
module.exports = {
    addContract, getHomeContent, updateContract, requestContractAppr, confirmContractAppr, onResetContractUser, onChangeCard, getCustomInfo, getMyPays, onPayByDirect, onPayCancelByDirect
};