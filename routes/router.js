const express = require('express');
const router = express.Router();
const { upload } = require('../config/multerConfig')
const {
    onLoginById, getUserToken, onLogout, checkExistId, checkPassword, checkExistIdByManager, checkExistNickname, sendSms, kakaoCallBack, editMyInfo, uploadProfile, onLoginBySns, getMyInfo,//auth
    getUsers, getItems, getSetting, getVideo, onSearchAllItem, findIdByPhone, findAuthByIdAndPhone, getComments, getCommentsManager, getCountNotReadNoti, getNoticeAndAlarmLastPk, getAllPosts, getUserStatistics, addImageItems,//select
    onSignUp, addItem, addItemByUser, addNoteImage, addSetting, addComment, addAlarm, addPopup, insertUserMoneyByExcel,//insert 
    updateUser, updateItem, updateSetting, updateStatus, onTheTopItem, changeItemSequence, changePassword, updateComment, updateAlarm, updatePopup,//update
    deleteItem, deleteItemByUser, onResign, getMyItems, getMyItem, onSubscribe, updateSubscribe, getHeaderContent, onKeyrecieve, editContract, editPay, getAddressByText, getBellContent
} = require('./common');
const {
    addContract, getHomeContent, updateContract, requestContractAppr, confirmContractAppr, onResetContractUser,
    onChangeCard, getCustomInfo, getMyPays, onPayByDirect, onPayCancelByDirect, onPayResult, onWantPayCancel,
    addFamilyCard, updateFamilyCard, registerAutoCard, getMyAutoCard, getMyAutoCardReturn, onChangePayStatus,
    makeNiceApiToken, recieveNiceApiResult, returnIdentificationUrl, getCardIdentificationInfo, onPay, cancelAutoCard
} = require('./user');
const image_list = [
    { name: 'master' },
    { name: 'master2' },
    { name: 'content' },
    { name: 'content1' },
    { name: 'content2' },
    { name: 'content3' },
    { name: 'content4' },
    { name: 'content5' },
    { name: 'popup' },
    { name: 'profile' },
    { name: 'ad' },
    { name: 'note' },
    { name: 'document_src' },
    { name: 'pdf' },
    { name: 'card' },
]
router.post('/addimageitems', upload.fields(image_list), addImageItems);
router.post('/insertusermoneybyexcel', insertUserMoneyByExcel);
router.post('/addalarm', addAlarm);
router.post('/updatealarm', updateAlarm);
router.post('/editmyinfo', editMyInfo);
router.post('/uploadprofile', upload.single('profile'), uploadProfile)
router.post('/kakao/callback', kakaoCallBack);
router.post('/sendsms', sendSms);
router.post('/findidbyphone', findIdByPhone);
router.post('/findauthbyidandphone', findAuthByIdAndPhone);
router.post('/checkexistid', checkExistId);
router.post('/checkpassword', checkPassword);
router.post('/checkexistidbymanager', checkExistIdByManager);
router.post('/checkexistnickname', checkExistNickname);
router.post('/changepassword', changePassword);
router.post('/adduser', onSignUp);
router.post('/loginbyid', onLoginById);
router.post('/loginbysns', onLoginBySns);
router.post('/logout', onLogout);
router.get('/auth', getUserToken);
router.get('/users', getUsers);
router.post('/additem', upload.fields([{ name: 'content' }, { name: 'content2' }]), addItem);
router.post('/additembyuser', upload.fields([{ name: 'content' }, { name: 'content2' }]), addItemByUser);
router.post('/updateitem', upload.fields([{ name: 'content' }, { name: 'content2' }]), updateItem);
router.post('/addimage', upload.single('note'), addNoteImage);
router.post('/deleteitem', deleteItem);
router.post('/deleteitembyuser', deleteItemByUser);
router.post('/resign', onResign);
router.post('/updateuser', updateUser);
router.get('/onsearchallitem', onSearchAllItem);
router.get('/items', getItems);
router.post('/items', getItems);
router.post('/myitems', getMyItems);
router.post('/myitem', getMyItem);
router.get('/getallposts', getAllPosts);
router.get('/getuserstatistics', getUserStatistics);
router.get('/gethomecontent', getHomeContent);
router.get('/getbellcontent', getBellContent);
router.get('/getheadercontent', getHeaderContent);
router.get('/getmyinfo', getMyInfo);
router.get('/customer-info', getCustomInfo);
router.post('/change-card', onChangeCard);
router.post('/getaddressbytext', getAddressByText);
router.post('/keyrecieve/:pk/:device', onKeyrecieve);
router.get('/keyrecieve/:pk/:device', onKeyrecieve);

router.post('/addcontract', addContract);
router.post('/updatecontract', updateContract);
router.post('/requestcontractappr', requestContractAppr);
router.post('/confirmcontractappr', confirmContractAppr);
router.post('/onresetcontractuser', onResetContractUser);


router.post('/updatesetting', upload.fields([{ name: 'content' }, { name: 'content2' }]), updateSetting);
router.post('/addsetting', upload.single('master'), addSetting);
router.get('/setting', getSetting);
router.post('/updatestatus', updateStatus);
//router.get('/getvideocontent', getVideoContent);
router.get('/video/:pk', getVideo);
router.post('/onthetopitem', onTheTopItem);
router.post('/changeitemsequence', changeItemSequence);
router.get('/getcommnets', getComments);
router.post('/addcomment', addComment);
router.post('/updatecomment', updateComment);
router.get('/getcommentsmanager', getCommentsManager);
router.post('/getcountnotreadnoti', getCountNotReadNoti);
router.get('/getnoticeandalarmlastpk', getNoticeAndAlarmLastPk);
router.post('/addpopup', upload.single('content'), addPopup);
router.post('/updatepopup', upload.single('content'), updatePopup);
router.post('/onsubscribe', onSubscribe);
router.post('/updatesubscribe', updateSubscribe);
router.get('/mypays', getMyPays);
router.post('/contract/:edit_category', editContract);
router.post('/pay/:edit_category', editPay);
router.post('/paydirect', onPayByDirect);
router.post('/paycanceldirect', onPayCancelByDirect);
router.get('/payresult', onPayResult);
router.post('/addfamilycard', addFamilyCard);
router.post('/updatefamilycard', updateFamilyCard);
router.post('/wantpaycancel', onWantPayCancel);
router.post('/registerautocard', registerAutoCard);
router.post('/cancelautocard', cancelAutoCard);
router.get('/myautocard', getMyAutoCard);
router.post('/changepaystatus', onChangePayStatus);
router.post('/nice-token', makeNiceApiToken);
router.get('/nice-result', recieveNiceApiResult);
router.post('/returnidurl', returnIdentificationUrl);
router.post('/gcii', getCardIdentificationInfo);

module.exports = router;