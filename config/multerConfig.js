const multer = require('multer');
const sharp = require('sharp');
const { checkLevel } = require('../util');
const storage = multer.diskStorage({
        destination: function (req, file, cb) {
                console.log(file)
                cb(null, __dirname + `/../image/${file.fieldname}/`);
        },
        filename: function (req, file, cb) {
                const decode = checkLevel(req.cookies.token, 0);
                let user_pk = "";
                if (decode) {
                        user_pk = `${decode?.pk}`;
                }
                console.log(file);
                let file_type = "";
                if(file.mimetype.includes('pdf')){
                        file_type = 'pdf';
                }else{
                        file_type = file.mimetype.split('/')[1];
                }
                cb(null, Date.now() + user_pk + `-${file.fieldname}.` + file_type)
        }
})
const fileFilter = (req, file, cb) => {
        let typeArray = file.mimetype.split('/')
        let filetype = typeArray[1]
        if (
                filetype == 'jpg' ||
                filetype == 'png' ||
                filetype == 'gif' ||
                filetype == 'jpeg' ||
                filetype == 'bmp' ||
                filetype == 'mp4' ||
                filetype == 'avi' ||
                filetype == 'webp' ||
                filetype == 'ico' ||
                filetype == 'pdf' ||
                filetype == 'haansoftpdf'
        )
                return cb(null, true)

        console.log('확장자 제한: ', filetype)
        req.fileValidationError = "파일 형식이 올바르지 않습니다(.jpg, .png, .gif 만 가능)"
        cb(null, false, new Error("파일 형식이 올바르지 않습니다(.jpg, .png, .gif 만 가능)"))
}
const upload = multer({
        storage: storage,
        fileFilter: fileFilter,
        limit: {
                fileSize: 100 * 1024 * 1024,
                fieldSize: 100 * 1024 * 1024
        }
});

module.exports = { upload }