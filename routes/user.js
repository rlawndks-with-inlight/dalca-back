const express = require('express')
//const { json } = require('body-parser')
const router = express.Router()
const cors = require('cors')
router.use(cors())
router.use(express.json())

const crypto = require('crypto')
const Base64Util = require('base64url');
const CryptoJS = require('crypto-js')
//const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const when = require('when')
const iconv = require('iconv-lite');
const { checkLevel, getSQLnParams, getUserPKArrStrWithNewPK,
    isNotNullOrUndefined, namingImagesPath, nullResponse,
    lowLevelResponse, response, removeItems, returnMoment, formatPhoneNumber,
    categoryToNumber, sendAlarm, makeMaxPage, queryPromise, makeHash, commarNumber, getKewordListBySchema,
    getEnLevelByNum, getKoLevelByNum,
    getQuestions, getNumByEnLevel, initialPay, initialDownPayment
} = require('../util')
const {
    getRowsNumWithKeyword, getRowsNum, getAllDatas,
    getDatasWithKeywordAtPage, getDatasAtPage,
    getKioskList, getItemRows, getItemList, dbQueryList, dbQueryRows, activeQuery, getTableAI
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
const { sqlJoinFormat, listFormatBySchema, myItemSqlJoinFormat, getCustomInfoReturn } = require('../format/formats')
const { param } = require('jquery')
const kakaoOpt = {
    clientId: '4a8d167fa07331905094e19aafb2dc47',
    redirectUri: 'http://172.30.1.19:8001/api/kakao/callback',
};
const PAY_ADDRESS = {
    TEST: `https://svcapi.mtouch.com`,
    SERVICE: `https://svcapi.mtouch.com`,
}
const PAY_INFO = {//빌키인증 정보
    MID: `ac5688702806`,
    API_KEY: `pk_2da7-9b8fc8-1f3-23601`,
    BILL_NO: `042105`,
    TID: 'TMN042105',
}
const MY_CARD_IDENTIFICATION_INFO = {//카드 본인확인 정보
    MID: `INICAStest`,
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
        const { deposit, down_payment, monthly, brokerage_fee, document_src, address, address_detail, zip_code, start_date, end_date, pay_day, pdf_list } = req.body;
        let result = await activeQuery('INSERT INTO contract_table ( deposit, down_payment, monthly, brokerage_fee, document_src, address, address_detail, zip_code, start_date, end_date, pay_day, pdf_list, realtor_pk, step) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [deposit, down_payment, monthly, brokerage_fee, document_src, address, address_detail, zip_code, start_date, end_date, pay_day, pdf_list, decode?.pk, 1]);
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
        const { deposit, down_payment, monthly, brokerage_fee, address, address_detail, zip_code, start_date, end_date, pay_day, pk, document_src, pdf_list } = req.body;

        let value_str = "deposit=?, down_payment=?, monthly=?, brokerage_fee=?, address=?, address_detail=?, zip_code=? , start_date=?, end_date=?, pay_day=?, pdf_list=? ";
        let value_list = [deposit, down_payment, monthly, brokerage_fee, address, address_detail, zip_code, start_date, end_date, pay_day, pdf_list];
        if (document_src) {
            if (document_src == -1) {
                value_list.push('')
            } else {
                value_list.push(document_src)
            }
            value_str += `, document_src=?`
        }
        let result = await activeQuery(`UPDATE contract_table SET ${value_str} WHERE pk=${pk}`, value_list);
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
            user_where_sql = `WHERE ${getEnLevelByNum(decode?.user_level)}_pk=${decode?.pk}  `;
        }
        let landlord_sql = `AND ((pay_category=3 AND lessee_pk=${decode?.pk}) OR pay_category < 3)`
        let sql_list = [
            { table: 'notice', sql: 'SELECT notice_table.*, user_table.nickname FROM notice_table LEFT JOIN user_table ON notice_table.user_pk=user_table.pk WHERE notice_table.status=1 ORDER BY notice_table.sort DESC LIMIT 2', type: 'list' },
            { table: 'setting', sql: 'SELECT * FROM setting_table', type: 'obj' },
            { table: 'contract', sql: `SELECT * FROM v_contract ${user_where_sql} ORDER BY pk DESC LIMIT 5`, type: 'list' },
            { table: 'point', sql: `${(await sqlJoinFormat('point', '', '', '', 'WHERE 1=1', decode))?.sql} WHERE user_pk=${decode?.pk} ORDER BY pk DESC LIMIT 5`, type: 'list' },
            { table: 'pay', sql: `SELECT * FROM v_pay ${user_where_sql} ${decode?.user_level == 5 ? landlord_sql : ''} ORDER BY pk DESC LIMIT 5`, type: 'list' },
            { table: 'commission', sql: `${(await sqlJoinFormat('commission', '', '', '', 'WHERE 1=1', decode))?.sql} WHERE user_pk=${decode?.pk} ORDER BY pk DESC LIMIT 5`, type: 'list' },
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
        result_obj['point'] = listFormatBySchema('point', result_obj['point'])
        result_obj['commission'] = listFormatBySchema('commission', result_obj['commission'])
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
            if (result.result_code == '1') {
                let result = await activeQuery(`UPDATE contract_table SET ${getEnLevelByNum(request_level)}_pk=${user_pk} WHERE pk=${contract_pk}`);
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
        let result = await activeQuery(`UPDATE contract_table SET ${getEnLevelByNum(decode?.user_level)}_appr=1 WHERE pk=${contract_pk}`);

        let now_contract = await dbQueryList(`SELECT * FROM contract_table WHERE pk=${contract_pk}`);
        now_contract = now_contract?.result[0];
        await initialDownPayment(now_contract);
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
        let result = await activeQuery(`UPDATE contract_table SET ${getEnLevelByNum(request_level)}_pk=NULL, ${getEnLevelByNum(request_level)}_appr=0 WHERE pk=${contract_pk}`);
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
        if (decode?.user_level >= 40 && user_pk) {
            user = await dbQueryList(`SELECT * FROM user_table WHERE pk=?`, [pk]);
            user = user?.result[0];
        }
        if (user?.name != card_name) {
            return response(req, res, -100, "카드 소유자명과 회원정보가 일치하지 않습니다.", []);
        }

        let create_bill_key = await createBillKey(user, req.body)
        if (create_bill_key?.result < 0) {
            return response(req, res, -100, create_bill_key?.data?.ResultMsg, [])
        }

        await db.beginTransaction();
        let bill_key = create_bill_key?.data;
        let result = await activeQuery(`UPDATE user_table SET card_number=?, card_name=?, card_expire=?, card_cvc=?, card_password=?, birth=?, bill_key=? WHERE pk=?`, [card_number, card_name, card_expire, card_cvc, card_password, birth, bill_key, pk]);

        await db.commit();
        return response(req, res, 100, "success", []);
    } catch (err) {
        console.log(err)
        await db.rollback();
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
        let data = await getCustomInfoReturn(decode, level, page);

        return response(req, res, 100, "success", {
            data: data?.user_list,
            maxPage: data?.user_count
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
        await db.beginTransaction();
        let contract = await dbQueryList(`SELECT contract_table.*, user_table.commission_percent FROM contract_table LEFT JOIN user_table ON contract_table.${getEnLevelByNum(10)}_pk=user_table.pk WHERE contract_table.pk=${pay_item?.contract_pk}`);
        contract = contract?.result[0];
        if (pay_item?.pay_category == 0) {
            let insert_point = await activeQuery(`INSERT INTO point_table (price, status, type, user_pk, pay_pk) VALUES (?, ?, ?, ?, ?)`, [
                parseInt(pay_item?.price) * (setting?.point_percent) / 100,
                1,
                pay_item?.pay_category,
                pay_item[`${getEnLevelByNum(0)}_pk`],
                item_pk
            ])
            let insert_commission = await activeQuery(`INSERT INTO commission_table (user_pk, pay_pk, percent, price, status, pay_user_pk) VALUES (?, ?, ?, ?, ?, ?)`, [
                pay_item[`${getEnLevelByNum(10)}_pk`],
                item_pk,
                contract?.commission_percent,
                parseInt(pay_item?.price) * (contract?.commission_percent) / 100,
                1,
                pay_item[`${getEnLevelByNum(0)}_pk`],
            ])
        } else if (pay_item?.pay_category == 2) {
            let insert_deposit = await activeQuery(`INSERT pay_table (${getEnLevelByNum(0)}_pk, ${getEnLevelByNum(5)}_pk, ${getEnLevelByNum(10)}_pk, price, pay_category, status, contract_pk, day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                contract[`${getEnLevelByNum(0)}_pk`],
                contract[`${getEnLevelByNum(5)}_pk`],
                contract[`${getEnLevelByNum(10)}_pk`],
                parseInt(contract?.deposit - contract?.down_payment),
                1,
                0,
                pay_item?.contract_pk,
                returnMoment().substring(0, 10)
            ])
        } else if (pay_item?.pay_category == 1) {
            let result = await activeQuery(`UPDATE contract_table SET is_deposit_com=1 WHERE pk=${pay_item?.contract_pk}`);
            let result2 = await initialPay(contract);
        }

        let resp = await onPay(user, pay_item);
        if (resp?.ResultCode == '00') {
            let trade_day = `${resp?.PayDate.substring(0, 4)}-${resp?.PayDate.substring(4, 6)}-${resp?.PayDate.substring(6, 8)}`;
            let trade_date = `${trade_day} ${resp?.PayTime.substring(0, 2)}:${resp?.PayTime.substring(2, 4)}:${resp?.PayTime.substring(4, 6)}`
            let setting = await dbQueryList(`SELECT * FROM setting_table LIMIT 1`);
            setting = setting?.result[0];
            let update_pay = await activeQuery(`UPDATE pay_table SET status=1, trade_date=?, trade_day=?, order_num=?, transaction_num=?, approval_num=?, card_percent=? WHERE pk=?`, [
                trade_date,
                trade_day,
                resp?.oid,
                resp?.tid,
                resp?.ApplNum,
                setting?.card_percent,
                item_pk
            ])
            await db.commit();
            return response(req, res, 100, "success", []);
        } else {
            await db.rollback();
            return response(req, res, -100, resp?.ResultMsg, [])
        }
    } catch (err) {
        console.log(err)
        await db.rollback();
        return response(req, res, -200, "서버 에러 발생", [])
    }
}
const onPayResult = async (req, res) => {
    try {
        let {
            tid,
            mid,
            result_cd,
            result_msg,
            EventCode,
            TotPrice,
            ord_num,
            payMethod,
            appr_num,
            trx_dttm,
            applTime,
            buyerEmail,
            buyerTel,
            buyerName,
            temp='{}',
        } = req.query;
        temp = JSON.parse(temp);
        if (result_cd == '0000') {
            let pay_pk = temp?.temp;
            let trade_date = trx_dttm;
            let trade_day = trx_dttm.substring(0, 10);
            await db.beginTransaction();
            let setting = await dbQueryList(`SELECT * FROM setting_table LIMIT 1`);
            setting = setting?.result[0];
            let update_pay = await activeQuery("UPDATE pay_table SET status=1, trade_date=?, trade_day=?, order_num=?, transaction_num=?, approval_num=?, is_auto=0, card_percent=?, mid=? WHERE pk=?", [
                trade_date,
                trade_day,
                ord_num,
                tid,
                appr_num,
                setting?.card_percent,
                mid,
                pay_pk,
            ])
            let pay = await dbQueryList(`SELECT * FROM pay_table WHERE pk=?`, [pay_pk]);
            pay = pay?.result[0];

            let contract = await dbQueryList(`SELECT contract_table.*, user_table.commission_percent FROM contract_table LEFT JOIN user_table ON contract_table.${getEnLevelByNum(10)}_pk=user_table.pk WHERE contract_table.pk=${pay?.contract_pk}`);
            contract = contract?.result[0];
            if (pay?.pay_category == 0) {
                let insert_point = await activeQuery(`INSERT INTO point_table (price, status, type, user_pk, pay_pk) VALUES (?, ?, ?, ?, ?)`, [
                    parseInt(pay?.price) * (setting?.point_percent) / 100,
                    1,
                    pay?.pay_category,
                    pay[`${getEnLevelByNum(0)}_pk`],
                    pay_pk
                ])
                let insert_commission = await activeQuery(`INSERT INTO commission_table (user_pk, pay_pk, percent, price, status, pay_user_pk) VALUES (?, ?, ?, ?, ?, ?)`, [
                    pay[`${getEnLevelByNum(10)}_pk`],
                    pay_pk,
                    contract?.commission_percent,
                    parseInt(pay?.price) * (contract?.commission_percent) / 100,
                    1,
                    pay[`${getEnLevelByNum(0)}_pk`]
                ])
            } else if (pay?.pay_category == 2) {
                let insert_deposit = await activeQuery(`INSERT pay_table (${getEnLevelByNum(0)}_pk, ${getEnLevelByNum(5)}_pk, ${getEnLevelByNum(10)}_pk, price, pay_category, status, contract_pk, day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                    contract[`${getEnLevelByNum(0)}_pk`],
                    contract[`${getEnLevelByNum(5)}_pk`],
                    contract[`${getEnLevelByNum(10)}_pk`],
                    parseInt(contract?.deposit - contract?.down_payment),
                    1,
                    0,
                    pay?.contract_pk,
                    returnMoment().substring(0, 10)
                ])
            } else if (pay?.pay_category == 1) {
                let result = await activeQuery(`UPDATE contract_table SET is_deposit_com=1 WHERE pk=${pay?.contract_pk}`);
                let result2 = await initialPay(contract);
            }
            await db.commit();
            return res.redirect(`https://dalcapay.com/payresult/1`)

        } else {
            await db.rollback();
            return res.redirect(`https://dalcapay.com/payresult/0?result_msg=${result_msg}`)
        }
    } catch (err) {
        await db.rollback();
        console.log(err)
        return res.redirect(`https://dalcapay.com/payresult/0?result_msg=서버 에러 발생`)
    }
}
const onWantPayCancel = async (req, res) => {// 취소요청
    try {
        const decode = checkLevel(req.cookies.token, 0);
        if (!decode) {
            return response(req, res, -150, "권한이 없습니다.", []);
        }
        const { pay_pk } = req.body;
        let pay = await dbQueryList(`SELECT * FROM pay_table WHERE pk=${pay_pk}`);
        pay = pay?.result[0];
        if (decode?.pk != pay[`${getEnLevelByNum(0)}_pk`]) {
            return response(req, res, -150, "권한이 없습니다.", []);
        }
        if (pay?.is_want_cancel == -1 || pay?.is_want_cancel == 1) {
            return response(req, res, -150, "이미 취소요청을 보낸 결제입니다.", []);
        }
        let result = await activeQuery(`UPDATE pay_table SET is_want_cancel=1 WHERE pk=${pay_pk}`);
        return response(req, res, 100, "success", []);
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
        let mid = pay_item?.mid || PAY_INFO.MID//PAY_INFO.MID;
        let signKey = ''

        if (mid == PAY_INFO.MID) {
            signKey = PAY_INFO.SIGN_KEY
        } else {
            signKey = PAY_INFO.CERTIFICATION_SIGN_KEY
        }
        let mkey = await Buffer.from(crypto.createHash('sha256').update(signKey).digest('hex')).toString();
        let tid = pay_item?.transaction_num;
        let price = pay_item?.price * ((100 + pay_item?.card_percent) / 100);
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

        await db.beginTransaction();

        let setting = await dbQueryList(`SELECT * FROM setting_table LIMIT 1`);
        setting = setting?.result[0];
        let point = await dbQueryList(`SELECT * FROM point_table WHERE pay_pk=? AND status=1 `, [item_pk]);
        point = point?.result[0];
        let commission = await dbQueryList(`SELECT * FROM commission_table WHERE pay_pk=? AND status=1 `, [item_pk]);
        commission = commission?.result[0];

        let delete_point = await activeQuery(`INSERT INTO point_table (price, status, type, user_pk, pay_pk) VALUES (?, ?, ?, ?, ?)`, [
            point?.price * (-1),
            -1,
            pay_item?.pay_category,
            pay_item[`${getEnLevelByNum(0)}_pk`],
            item_pk
        ])
        let delete_commission = await activeQuery(`INSERT INTO commission_table (user_pk, pay_pk, percent, price, status, pay_user_pk) VALUES (?, ?, ?, ?, ?, ?)`, [
            pay_item[`${getEnLevelByNum(10)}_pk`],
            item_pk,
            0,
            commission?.price * (-1),
            -1,
            pay_item[`${getEnLevelByNum(0)}_pk`],
        ])
        let update_pay = await activeQuery(`UPDATE pay_table SET is_want_cancel=-1 WHERE pk=?`, [item_pk]);
        const { data: resp } = await axios.post(`${PAY_ADDRESS.TEST}/cancel/cancel`, query, headers);
        let cancel_day = `${resp?.CancelDate.substring(0, 4)}-${resp?.CancelDate.substring(4, 6)}-${resp?.CancelDate.substring(6, 8)}`;
        let cancel_date = `${cancel_day} ${resp?.CancelTime.substring(0, 2)}:${resp?.CancelTime.substring(2, 4)}:${resp?.CancelTime.substring(4, 6)}`

        if (resp?.ResultCode == '00') {
            let result = await activeQuery(`INSERT INTO pay_table (landlord_pk, lessee_pk, realtor_pk, price, pay_category, status, contract_pk, day, trade_date, trade_day, transaction_num ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
            await db.commit();
            return response(req, res, 100, "success", []);
        } else {
            await db.rollback();
            if (resp?.ResultCode == '01') {
                return response(req, res, -100, '이미 취소한 거래입니다.', [])
            }
            return response(req, res, -100, resp?.ResultMsg, [])
        }
    } catch (err) {
        console.log(err)
        await db.rollback();
        return response(req, res, -200, "서버 에러 발생", [])
    }
}
const onPay = async (user, pay_item, setting) => {
    let mid = PAY_INFO.MID;
    let mkey = await Buffer.from(crypto.createHash('sha256').update(PAY_INFO.SIGN_KEY).digest('hex')).toString();
    let return_moment = returnMoment();
    return_moment = return_moment.replaceAll('-', '');
    return_moment = return_moment.replaceAll(':', '');
    return_moment = return_moment.replaceAll(' ', '');
    let oid = `${pay_item?.pk}${user?.pk}${return_moment}`;
    let price = parseInt(pay_item?.price);
    let buyerName = user?.name;

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

//빌키생성, 빌키승인(결제), 결제취소, 빌키삭제
const createBillKey = async (decode, body) => {
    try{
        let {
            card_number,
            card_name,
            card_expire,
            birth,
            card_password,
        } = body;
        
        let obj = {
            billing:{
                mchtBillNo:PAY_INFO.BILL_NO,
                userId:PAY_INFO.MID,
                buyerName: card_name,
                encData:{
                    cardNo: card_number.replaceAll(' ', ''),
                    expYear:card_expire.split('/')[1],
                    expMonth:card_expire.split('/')[0],
                    idNo:birth,
                    cardPw:card_password,
                }
            }
        }
        let query = obj; //getQueryByObject(obj);
        let headers = {
            'Content-Type': 'application/json',
            'Authorization': `${PAY_INFO.API_KEY}`
        }
        const { data: response } = await axios.post(`${PAY_ADDRESS.TEST}/api/billing/regist`, query, headers);
        console.log(response)
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
    }catch(err){
        console.log('############');
        console.log(err);
        console.log('############');
    }
    
}
const onChangePayStatus = async (req, res) => {
    try {
        const decode = checkLevel(req.cookies.token, 10);
        if (!decode) {
            return response(req, res, -150, "권한이 없습니다.", []);
        }
        const { pay_pk, status, type = 0 } = req.body;
        await db.beginTransaction();
        let result = await activeQuery(`UPDATE pay_table SET status=${status}, type=${type} WHERE pk=${pay_pk}`);
        let pay = await dbQueryList(`SELECT * FROM pay_table WHERE pk=?`, [pay_pk]);
        pay = pay?.result[0];
        let contract = await dbQueryList(`SELECT contract_table.*, user_table.commission_percent FROM contract_table LEFT JOIN user_table ON contract_table.${getEnLevelByNum(10)}_pk=user_table.pk WHERE contract_table.pk=${pay?.contract_pk}`);
        contract = contract?.result[0];
        if (pay?.status == 1) {
            if (pay?.pay_category == 2) {
                let insert_deposit = await activeQuery(`INSERT pay_table (${getEnLevelByNum(0)}_pk, ${getEnLevelByNum(5)}_pk, ${getEnLevelByNum(10)}_pk, price, pay_category, status, contract_pk, day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                    contract[`${getEnLevelByNum(0)}_pk`],
                    contract[`${getEnLevelByNum(5)}_pk`],
                    contract[`${getEnLevelByNum(10)}_pk`],
                    parseInt(contract?.deposit - contract?.down_payment),
                    1,
                    0,
                    pay?.contract_pk,
                    returnMoment().substring(0, 10)
                ])
            } else if (pay?.pay_category == 1) {
                let result = await activeQuery(`UPDATE contract_table SET is_deposit_com=1 WHERE pk=${pay?.contract_pk}`);
                let result2 = await initialPay(contract);
            }
        }

        await db.commit();
        return response(req, res, 100, "success", [])
    } catch (err) {
        console.log(err)
        await db.rollback();
        return response(req, res, -200, "서버 에러 발생", [])
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

const addFamilyCard = async (req, res) => {
    try {
        const decode = checkLevel(req.cookies.token, 0)
        if (!decode) {
            return response(req, res, -150, "권한이 없습니다.", [])
        }
        const {
            card_number,
            card_name,
            card_expire,
            card_cvc,
            card_password,
            birth,
            family_type,
            card_src,
            phone
        } = req.body;

        let create_bill_key = await createBillKey(decode, req.body)
        if (create_bill_key?.result < 0) {
            return response(req, res, -100, create_bill_key?.data?.ResultMsg, [])
        }
        let bill_key = create_bill_key?.data;
        await db.beginTransaction();
        let result = await activeQuery(`
        INSERT INTO user_card_table (card_number,card_name,card_expire,card_cvc,card_password,birth,family_type,user_pk,card_src,phone,bill_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            card_number,
            card_name,
            card_expire,
            card_cvc,
            card_password,
            birth,
            family_type,
            decode?.pk,
            card_src,
            phone,
            bill_key
        ])

        await db.commit();
        return response(req, res, 100, "success", []);
    } catch (err) {
        console.log(err)
        await db.rollback();
        return response(req, res, -200, "서버 에러 발생", [])
    }
}
const updateFamilyCard = async (req, res) => {
    try {
        const decode = checkLevel(req.cookies.token, 0)
        if (!decode) {
            return response(req, res, -150, "권한이 없습니다.", [])
        }
        const {
            card_number,
            card_name,
            card_expire,
            card_cvc,
            card_password,
            birth,
            family_type,
            card_src,
            phone,
            pk
        } = req.body;
        let create_bill_key = await createBillKey(decode, req.body)
        if (create_bill_key?.result < 0) {
            return response(req, res, -100, create_bill_key?.data?.ResultMsg, [])
        }
        await db.beginTransaction();
        let bill_key = create_bill_key?.data;
        let result = await activeQuery(`UPDATE user_card_table SET card_number=?, card_name=?, card_expire=?, card_cvc=?, card_password=?, birth=?, family_type=?, card_src=?, phone=?, bill_key=? WHERE pk=?
        `, [
            card_number,
            card_name,
            card_expire,
            card_cvc,
            card_password,
            birth,
            family_type,
            card_src,
            phone,
            bill_key,
            pk
        ])
        await db.commit();
        return response(req, res, 100, "success", []);
    } catch (err) {
        console.log(err)
        await db.rollback();
        return response(req, res, -200, "서버 에러 발생", [])
    }
}
const registerAutoCard = async (req, res) => {
    try {
        const decode = checkLevel(req.cookies.token, 0)
        if (!decode) {
            return response(req, res, -150, "권한이 없습니다.", [])
        }
        const { table, pk, user_pk } = req.body;
        let user_pk_ = decode?.pk
        if (user_pk && decode?.user_level >= 40) {
            user_pk_ = user_pk;
        }
        let card = {};
        if (table == 'user') {
            card = await dbQueryList(`SELECT * FROM user_table WHERE pk=?`, [user_pk_]);
            card = card?.result[0];
        } else if (table == 'user_card') {
            card = await dbQueryList(`SELECT * FROM user_card_table WHERE pk=?`, [pk]);
            card = card?.result[0];
        }
        if (!card?.bill_key) {
            return response(req, res, -100, "카드를 먼저 등록해 주세요.", []);
        }
        await db.beginTransaction();
        let delete_auto_card = await activeQuery(`DELETE FROM auto_card_table WHERE user_pk=?`, [user_pk_]);
        let insert_auto_card = await activeQuery(`INSERT INTO auto_card_table (user_pk, item_pk) VALUES (?, ?)`, [
            user_pk_,
            pk ?? 0
        ])
        await db.commit();
        return response(req, res, 100, "success", []);
    } catch (err) {
        console.log(err)
        await db.rollback();
        return response(req, res, -200, "서버 에러 발생", [])
    }
}
const cancelAutoCard = async (req, res) => {
    try {
        const decode = checkLevel(req.cookies.token, 0)
        if (!decode) {
            return response(req, res, -150, "권한이 없습니다.", [])
        }
        const { user_pk } = req.body;
        let user_pk_ = decode?.pk
        if (user_pk && decode?.user_level >= 40) {
            user_pk_ = user_pk;
        }
        await db.beginTransaction();
        let delete_auto_card = await activeQuery(`DELETE FROM auto_card_table WHERE user_pk=?`, [user_pk_]);

        await db.commit();
        return response(req, res, 100, "success", []);
    } catch (err) {
        console.log(err)
        await db.rollback();
        return response(req, res, -200, "서버 에러 발생", [])
    }
}
const getMyAutoCard = async (req, res) => {
    try {
        const decode = checkLevel(req.cookies.token, 0)
        if (!decode) {
            return response(req, res, -150, "권한이 없습니다.", [])
        }
        const { user_pk } = req.query;
        let user = decode;
        if (user_pk && decode?.user_level >= 40) {
            user = await dbQueryList(`SELECT * FROM user_table WHERE pk=${user_pk}`);
            user = user?.result[0];
        }
        let result = await getMyAutoCardReturn(user);
        return response(req, res, 100, "success", result);
    } catch (err) {
        console.log(err)
        await db.rollback();
        return response(req, res, -200, "서버 에러 발생", [])
    }
}
const getMyAutoCardReturn = async (decode, auto_cards, family_cards, users) => {
    let card_pk = await dbQueryList(`SELECT * FROM auto_card_table WHERE user_pk=?`, [decode?.pk]);
    card_pk = card_pk?.result[0];
    let card = {};
    let pk = 0;
    if (card_pk?.item_pk > 0) {
        card = await dbQueryList(`SELECT * FROM user_card_table WHERE pk=?`, [card_pk?.item_pk]);
        card = card?.result[0];
        pk = card?.pk;
    } else {
        card = await dbQueryList(`SELECT * FROM user_table WHERE pk=?`, [decode?.pk]);
        card = card?.result[0];
    }
    let result = {
        card_number: card?.card_number,
        card_name: card?.card_name,
        card_expire: card?.card_expire,
        card_cvc: card?.card_cvc,
        card_password: card?.card_password,
        pk: pk
    }
    return result;
}
function hmac256(secretKey, message) {
    const keyBytes = CryptoJS.enc.Utf8.parse(secretKey);
    const messageBytes = CryptoJS.enc.Utf8.parse(message);
    const hmacSha256 = CryptoJS.HmacSHA256(messageBytes, keyBytes);
    return hmacSha256.toString();
}

const makeNiceApiToken = async (req, res) => { //nice api 요청
    try {
        let { return_url, receive_data } = req.body;
        let base_url = 'https://svc.niceapi.co.kr:22001';
        let client_id = 'f8d4885b-492a-4a24-a6f1-ca5deac26090';
        let client_secret = 'b59f2a6ba445fcb52a161362c26df1bcc6b9776';
        let product_id = '2101979031'
        let base64 = Buffer.from(client_id + ':' + client_secret, "utf8").toString('base64');
        let config = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${base64}`
            }
        };
        const res_access_token = await axios.post(
            `${base_url}/digital/niceid/oauth/oauth/token`,
            'grant_type=client_credentials&scope=default',
            config,
        );
        if (res_access_token.data.dataHeader.GW_RSLT_CD != '1200') {
            return response(req, res, -100, "서버 에러 발생", [])
        }
        let access_token = res_access_token.data.dataBody.access_token;
        let current_timestamp = returnMoment().replaceAll(" ", "").replaceAll("-", "").replaceAll(":", "")
        const auth = Buffer.from(`${access_token}:${current_timestamp}:${client_id}`).toString('base64');
        config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `bearer ${auth}`,
                'ProductID': product_id,
            }
        }
        const req_dtim = current_timestamp;
        const req_no = `pc${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        const post_in = {
            req_dtim,
            req_no,
            enc_mode: '1',
        };
        const post = {
            dataHeader: { "CNTY_CD": "ko" },
            dataBody: post_in,
        };
        const post_en = JSON.stringify(post);
        const res_token = await axios.post(
            `${base_url}/digital/niceid/api/v1.0/common/crypto/token`,
            post_en,
            config,
        );

        if (res_token.data.dataHeader.GW_RSLT_CD != '1200') {
            return response(req, res, -100, "서버 에러 발생", [])
        }
        const res_data = res_token.data.dataBody;
        const value = `${req_dtim}${req_no}${res_data.token_val}`;
        const md = crypto.createHash('sha256');
        md.update(value);
        const arrHashValue = md.digest();
        const resultVal = arrHashValue.toString('base64');
        const key = resultVal.slice(0, 16);
        const iv = resultVal.slice(-16);
        const hmac_key = resultVal.slice(0, 32);
        let data = {
            requestno: req_no,
            returnurl: `${return_url}`, // Replace with your actual return URL
            sitecode: res_data.site_code,
            methodtype: 'get',
            popupyn: 'Y',
            receivedata: Buffer.from(receive_data, "utf8").toString('base64'),
        };
        data = JSON.stringify(data);
        const keyBytes = CryptoJS.enc.Utf8.parse(key);
        const ivBytes = CryptoJS.enc.Utf8.parse(iv);
        const encrypted = CryptoJS.AES.encrypt(data, keyBytes, {
            iv: ivBytes,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        const enc_data = encrypted.toString();
        let result = await activeQuery("INSERT INTO nice_api_table (key_val, iv, token_version_id) VALUES (?, ?, ?) ", [key, iv, res_data.token_version_id]);
        const hmacSha256 = hmac256(hmac_key, enc_data);
        const integrity_value = Buffer.from(hmacSha256, 'hex').toString('base64');
        const rtn = {
            token_version_id: res_data.token_version_id,
            enc_data: enc_data,
            integrity_value: integrity_value,
        };
        return response(req, res, 100, "sucess", rtn)
    } catch (err) {
        console.log(err)
        return response(req, res, -200, "서버 에러 발생", [])
    }
}

const recieveNiceApiResult = async (req, res) => { //nice api 결과값 리턴
    try {


        let = { token_version_id, enc_data, integrity_value } = req.query;


        let key_info = await dbQueryList(`SELECT * FROM nice_api_table WHERE token_version_id=?`, [token_version_id]);
        key_info = key_info?.result[0];
        const key = key_info?.key_val; // 요청 시 암호화한 key와 동일
        const iv = key_info?.iv; // 요청 시 암호화한 iv와 동일
        // Base64 decode the encrypted data
        const cipherEnc = CryptoJS.enc.Base64.parse(enc_data);

        // Convert the key and iv to WordArray using euc-kr encoding
        const keyBytes = CryptoJS.enc.Utf8.parse(key, { asBytes: true });
        const ivBytes = CryptoJS.enc.Utf8.parse(iv, { asBytes: true });

        // Decryption
        const decrypted = CryptoJS.AES.decrypt(
            {
                ciphertext: cipherEnc,
            },
            keyBytes,
            {
                iv: ivBytes,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7,
            }
        );
        // Convert the decrypted data to "euc-kr" string using iconv-lite
        let resData = iconv.decode(Buffer.from(decrypted.toString(), 'binary'), 'euc-kr');
        resData = iconv.decode(Buffer.from(resData, 'hex'), 'euc-kr');
        resData = JSON.parse(resData);
        resData['receivedata'] = JSON.parse(Buffer.from(resData?.receivedata, "base64").toString('utf8'));
        console.log(resData)

        let find_phone = await dbQueryList(`SELECT * FROM user_table WHERE phone=?`, [resData?.mobileno])
        find_phone = find_phone?.result;
        // if(find_phone.length > 0){
        //     if(resData?.receivedata?.device_type=='pc'){
        //     return response(req, res, -100, "이미 가입된 휴대폰번호 입니다.", [])
        // }else if(resData?.receivedata?.device_type=='mobile'){
        //     resData['receivedata'] = JSON.stringify(resData?.receivedata);
        //     return res.send(`
        //     <script>
        //     window.location.href = "/signup/0?${new URLSearchParams(resData)}"
        //     </script>
        //     `)
        // }
        // }
        if (resData?.receivedata?.device_type == 'pc') {
            return response(req, res, 100, "sucess", resData)
        } else if (resData?.receivedata?.device_type == 'mobile') {
            resData['receivedata'] = JSON.stringify(resData?.receivedata);
            return res.send(`
            <script>
            window.location.href = "/signup/0?${encodeURIComponent(new URLSearchParams(resData))}"
            </script>
            `)
        }
    } catch (err) {
        console.log(err)
        return response(req, res, -200, "서버 에러 발생", [])
    }
}
const returnIdentificationUrl = (req, res) => {
    try {
        let body = { ...req.body };
        if (body?.resultCode == '0000') {
            return response(req, res, 100, "success", []);
        } else {
            return response(req, res, -100, encodeURI(body?.resultMsg), []);
        }
    } catch (err) {
        console.log(err)
        return response(req, res, -200, "서버 에러 발생", [])
    }
}
const getCardIdentificationInfo = async (req, res) => {
    try {
        const decode = checkLevel(req.cookies.token, 0)
        if (!decode) {
            return response(req, res, -150, "권한이 없습니다.", [])
        }
        let { level, name, phone, birth } = req.body;
        let return_moment = returnMoment();
        let datetime = return_moment.replaceAll('-', '').replaceAll(' ', '').replaceAll(':', '');
        let Tradeid = `${decode?.pk}_${datetime}`;
        let obj = {
            mid: MY_CARD_IDENTIFICATION_INFO.MID,
            Tradeid: Tradeid
        }
        return response(req, res, 100, "success", obj);
    } catch (err) {
        console.log(err)
        return response(req, res, -200, "서버 에러 발생", [])
    }
}
module.exports = {
    addContract, getHomeContent, updateContract, requestContractAppr, confirmContractAppr, onResetContractUser,
    onChangeCard, getCustomInfo, getMyPays, onPayByDirect, onPayCancelByDirect, onPayResult, onWantPayCancel,
    addFamilyCard, updateFamilyCard, registerAutoCard, getMyAutoCard, getMyAutoCardReturn, onChangePayStatus,
    makeNiceApiToken, recieveNiceApiResult, returnIdentificationUrl, getCardIdentificationInfo, onPay, cancelAutoCard
};