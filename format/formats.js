const { dbQueryList } = require("../query-util");
const { commarNumber, getEnLevelByNum, makeMaxPage } = require("../util");


const listFormatBySchema = (schema, data_, body_) => {

    let data = [...data_];

    let option_list = {};
    if(schema == 'point'){
        for(var i=0;i<data.length;i++){
           
            if(data[i]?.type==0){//월세
                if(data[i]?.status==1){
                    data[i]['manager_note'] = `${commarNumber(data[i]?.contract_pk)}번 계약 ${data[i]?.pay_day.substring(0, 7)} 월세 결제에 의해 발생`;
                    data[i]['user_note'] = `${data[i]?.pay_day.substring(0, 7)} 월세 결제에 의해 발생`;
                }else{
                    data[i]['manager_note'] = `포인트 취소`;
                    data[i]['user_note'] = `포인트 취소`;
                }
            }else if(data[i]?.type==1){//보증금
                if(data[i]?.status==1){
                    data[i]['manager_note'] = `${commarNumber(data[i]?.contract_pk)}번 계약 보증금 결제에 의해 발생`;
                    data[i]['user_note'] = `보증금 결제에 의해 발생`;
                }else{
                    data[i]['manager_note'] = `포인트 취소`;
                    data[i]['user_note'] = `포인트 취소`;
                }
            }else if(data[i]?.type==2){//계약금
                if(data[i]?.status==1){
                    data[i]['manager_note'] = `${commarNumber(data[i]?.contract_pk)}번 계약금 결제에 의해 발생`;
                    data[i]['user_note'] = `계약금 결제에 의해 발생`;
                }else{
                    data[i]['manager_note'] = `포인트 취소`;
                    data[i]['user_note'] = `포인트 취소`;
                }
            }else if(data[i]?.type==10){//취소
                if(data[i]?.status==1){
                    data[i]['manager_note'] = ``;
                    data[i]['user_note'] = ``;
                }else{
                    data[i]['manager_note'] = ``;
                    data[i]['user_note'] = ``;
                }
            }else if(data[i]?.type==15){//관리자수정
                if(data[i]?.status==1){
                    data[i]['manager_note'] = `관리자에 의해 추가`;
                    data[i]['user_note'] = `${commarNumber(data[i]?.price)} 포인트 추가`;
                }else{
                    data[i]['manager_note'] = `관리자에 의해 차감`;
                    data[i]['user_note'] = `${commarNumber(data[i]?.price)} 포인트 차감`;
                }
            }
        }
    }else if(schema == 'user'){
        for(var i=0;i<data.length;i++){
            if(data[i]?.user_level==10){
                data[i]['address'] = data[i]['office_address'];
                data[i]['zip_code'] = data[i]['office_zip_code'];
                data[i]['address_detail'] = data[i]['office_address_detail'];
            }
        }
    }
    if(schema)
        return data;
}
const sqlJoinFormat = async (schema, sql_, order_, page_sql_, where_str_, decode) => {
    let sql = sql_;
    let page_sql = page_sql_;
    let order = order_;
    let where_str = where_str_;
   
    if(schema=='notice'){
        sql = ` SELECT notice_table.*, user_table.nickname AS nickname FROM notice_table`;
        page_sql += ` LEFT JOIN user_table ON notice_table.user_pk=user_table.pk `;
        sql += ` LEFT JOIN user_table ON notice_table.user_pk=user_table.pk `;
        order = 'notice_table.sort'
    }else if(schema=='request'){
        sql = ` SELECT request_table.*, user_table.nickname AS nickname, user_table.name AS name, user_table.id_number AS id_number, user_table.id AS id FROM request_table`;
        page_sql += ` LEFT JOIN user_table ON request_table.user_pk=user_table.pk `;
        sql += ` LEFT JOIN user_table ON request_table.user_pk=user_table.pk `;
        order = 'pk'
        if(decode?.user_level==0 ||decode?.user_level==5 ||decode?.user_level==10 ){
            where_str += ` AND user_pk=${decode?.pk} `
        }
    }else if(schema=='comment'){
        sql = ` SELECT comment_table.*, user_table.nickname AS nickname, user_table.id AS id FROM comment_table`;
        page_sql += ` LEFT JOIN user_table ON comment_table.user_pk=user_table.pk `;
        sql += ` LEFT JOIN user_table ON comment_table.user_pk=user_table.pk `;
        order = 'pk'
    }else if(schema=='contract'){
        sql = ` SELECT * FROM v_contract `;
        page_sql = ` SELECT COUNT(*) FROM v_contract `
        if(decode?.user_level==0 ||decode?.user_level==5 ||decode?.user_level==10 ){
            where_str += ` AND ${getEnLevelByNum(decode?.user_level)}_pk=${decode?.pk} `
        }
        order = 'pk'
    }else if(schema=='pay'){
        sql = ` SELECT * FROM v_pay `;
        page_sql = ` SELECT COUNT(*) FROM v_pay `
        if(decode?.user_level==0 ||decode?.user_level==5 ||decode?.user_level==10 ){
            where_str += ` AND ${getEnLevelByNum(decode?.user_level)}_pk=${decode?.pk} `
        }
        order = 'pk'
    }else if(schema=='user'){
        sql = ` SELECT *, (SELECT SUM(price) FROM point_table WHERE user_pk=user_table.pk) AS point_sum FROM user_table `;
    }
    else if(schema=='point'){
        let columns = [
            'point_table.*',
            'user_table.id AS user_id',
            'user_table.name AS user_name',
            'user_table.user_level AS user_level',
            'pay_table.contract_pk AS contract_pk',
            'pay_table.day AS pay_day',
            'pay_table.type AS pay_type',
            'pay_table.price AS pay_price',
        ]
        sql = ` SELECT ${columns.join()} FROM point_table `;
        page_sql += ` LEFT JOIN user_table ON point_table.user_pk=user_table.pk `;
        page_sql += ` LEFT JOIN pay_table ON point_table.pay_pk=pay_table.pk `;
        sql += ` LEFT JOIN user_table ON point_table.user_pk=user_table.pk `;
        sql += ` LEFT JOIN pay_table ON point_table.pay_pk=pay_table.pk `;
        if(decode?.user_level==0 ||decode?.user_level==5 ){
            where_str += ` AND user_pk=${decode?.pk} `
        } else if(decode?.user_level==10){
            let data = await getCustomInfoReturn(decode, decode?.user_level, )
            let user_pk_list = data.user_list.map(item=>{
                return item?.pk
            });
            user_pk_list.push(decode?.pk);
            console.log(user_pk_list)
            where_str += ` AND user_pk IN (${user_pk_list.join()}) `
        }
        order = 'pk'
    }
    return {
        page_sql:page_sql,
        sql:sql,
        order:order,
        where_str:where_str
    }
}
const myItemSqlJoinFormat = (schema, sql_, order_, page_sql_) => {
    let sql = sql_;
    let page_sql = page_sql_;
    let order = order_;
    if(schema=='subscribe'){
        sql = ` SELECT ${schema}_table.*, user_table.nickname AS master_name, academy_category_table.title AS title, academy_category_table.start_date AS start_date, academy_category_table.end_date AS end_date FROM ${schema}_table`;
        sql += ` LEFT JOIN user_table ON ${schema}_table.master_pk=user_table.pk `;
        sql += ` LEFT JOIN academy_category_table ON ${schema}_table.academy_category_pk=academy_category_table.pk `;
    }
    return {
        page_sql:page_sql,
        sql:sql,
        order:order
    }
}
const getCustomInfoReturn = async (decode, level, page) => {
    let my_contracts = await dbQueryList(`SELECT * FROM contract_table WHERE ${getEnLevelByNum(decode?.user_level)}_pk=${decode?.pk} ORDER by pk DESC`);
    my_contracts = my_contracts?.result;
    let user_pk_list = my_contracts.map((item) => {
        return item[`${getEnLevelByNum(level)}_pk`]
    })
    user_pk_list = new Set(user_pk_list);
    user_pk_list = [...user_pk_list];
    user_pk_list = user_pk_list.filter(
        (element, i) => element
    );

    let user_count = 0;
    if (user_pk_list.length > 0) {
        user_count = await dbQueryList(`SELECT COUNT(*) FROM user_table WHERE pk IN (${user_pk_list.join()}) `);
        user_count = user_count?.result[0];
        user_count = user_count['COUNT(*)'];
        user_count = makeMaxPage(user_count, 10);
    }
    let user_list = [];
    if (user_pk_list.length > 0) {
        let api_str = `SELECT * FROM user_table WHERE pk IN (${user_pk_list.join()}) `;
        if(page){
            api_str += `LIMIT ${(page - 1) * 10}, 10`
        }   
        user_list = await dbQueryList(api_str);
        user_list = user_list?.result;
    }
    return {
        user_list,
        user_count
    }
}
module.exports = {
    listFormatBySchema, sqlJoinFormat, myItemSqlJoinFormat,
    getCustomInfoReturn
};
// const sqlJoinFormat = (schema, sql_, page_sql_) => {
//     let sql = sql_;
//     let page_sql = page_sql_;
//     let need_join_obj = {
//         academy_category: {
//             join_table_list: [
//                 'user_table',
//             ],
//             join_columns: [
//                 { column: 'pk', as: 'master_pk', join_table: join_table_list[0] },
//                 { column: 'nickname', as: 'master_nickname', join_table: join_table_list[0] },
//             ],
//             join_: []
//         },
//     }
//     if(need_join_obj[schema]){
//         let sql = `SELECT * `
//         let join_columns = "";
//         let join_sql = "";
//         for(var i = 0;i<need_join_obj[schema].join_table_list.length;i++){
//             let join_table = need_join_obj[schema].join_table_list[i];
//             let join_columns = need_join_obj[schema].join_columns;
//             for(var j =0;j<join_columns.length;j++){
//                 if(join_table==join_columns[j].join_table){
//                     join_columns += `, ${join_table}.${join_columns[j].column} AS ${join_columns[j].as}`
//                 }
//             }
            
//         }
//     }
//     return {
//         page_sql:page_sql,
//         sql:sql
//     }
// }