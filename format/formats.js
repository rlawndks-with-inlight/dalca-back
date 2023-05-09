const { commarNumber, getEnLevelByNum } = require("../util");


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
                    data[i]['user_note'] = `관리자에 의해 추가`;
                }else{
                    data[i]['manager_note'] = `관리자에 의해 차감`;
                    data[i]['user_note'] = `관리자에 의해 취소`;
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
const sqlJoinFormat = (schema, sql_, order_, page_sql_, where_str_, decode) => {
    let sql = sql_;
    let page_sql = page_sql_;
    let order = order_;
    let where_str = where_str_;
    if(schema=='academy_category'){
        sql = ` SELECT academy_category_table.*, user_table.nickname AS master_nickname FROM academy_category_table`;
        page_sql += ` LEFT JOIN user_table ON academy_category_table.master_pk=user_table.pk `;
        sql += ` LEFT JOIN user_table ON academy_category_table.master_pk=user_table.pk `;
        order = 'academy_category_table.sort'
    }else if(schema=='academy'){
        page_sql += ` LEFT JOIN academy_category_table ON academy_table.category_pk=academy_category_table.pk `;
        sql = ` SELECT academy_table.*, academy_category_table.title AS class_title FROM academy_table`;
        sql += ` LEFT JOIN academy_category_table ON academy_table.category_pk=academy_category_table.pk `;
    }else if(schema=='notice'){
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
    }else if(schema=='subscribe'){
        sql = ` SELECT subscribe_table.*, u_t.nickname AS nickname, u_t.id AS id, u_t.name AS user_name, u_t.phone AS phone,u_t.bank_name AS bank_name,u_t.account_number AS account_number,u_t.account_holder AS account_holder, academy_category_table.title AS title, academy_category_table.start_date AS start_date,academy_category_table.end_date AS end_date, m_t.nickname AS master_nickname FROM subscribe_table`;
        page_sql += ` LEFT JOIN user_table AS u_t ON subscribe_table.user_pk=u_t.pk `;
        page_sql += ` LEFT JOIN academy_category_table ON subscribe_table.academy_category_pk=academy_category_table.pk `;
        page_sql += ` LEFT JOIN user_table AS m_t ON subscribe_table.master_pk=m_t.pk `;
        sql += ` LEFT JOIN user_table AS u_t ON subscribe_table.user_pk=u_t.pk `;
        sql += ` LEFT JOIN academy_category_table ON subscribe_table.academy_category_pk=academy_category_table.pk `;
        sql += ` LEFT JOIN user_table AS m_t ON subscribe_table.master_pk=m_t.pk `;
        order = 'pk'
    }else if(schema=='review'){
        sql = ` SELECT review_table.*, user_table.nickname AS nickname, user_table.id AS id, academy_category_table.title AS item_title FROM review_table`;
        page_sql += ` LEFT JOIN user_table ON review_table.user_pk=user_table.pk `;
        page_sql += ` LEFT JOIN academy_category_table ON review_table.academy_category_pk=academy_category_table.pk `;
        sql += ` LEFT JOIN user_table ON review_table.user_pk=user_table.pk `;
        sql += ` LEFT JOIN academy_category_table ON review_table.academy_category_pk=academy_category_table.pk `;
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
    }
    else if(schema=='point'){
        let columns = [
            'point_table.*',
            'user_table.id AS user_id',
            'user_table.name AS user_name',
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
        if(decode?.user_level==0 ||decode?.user_level==5 ||decode?.user_level==10 ){
            where_str += ` AND user_pk=${decode?.pk} `
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
module.exports = {
    listFormatBySchema, sqlJoinFormat, myItemSqlJoinFormat
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