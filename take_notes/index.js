var crypto = require('crypto');
var uuid = require('uuid');
var express = require('express');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var multer = require('multer');
var newDate = require('date-utils');
//Connect to MySQL
var con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'gustp1107!',
    database: 'take_notes'
});

//PASSWORD ULTIL
var genRandomString = function (length) {
    return crypto.randomBytes(Math.ceil(length / 2) )
        .toString('hex') /* convert to hexa format */
        .slice(0, length); /* return required number of characters */
};

var sha512 = function (password, salt) {
    var hash = crypto.createHmac('sha512', salt); // Use SHA512
    hash.update(password);
    var value = hash.digest('hex');
    return {
        salt: salt,
        passwordHash: value
    };
};

function saltHashPassword(userPassword) {
    var salt = genRandomString(16); // Gen random string with 16 character to salt
    var passwordData = sha512(userPassword, salt);
    return passwordData;
}

function checkHashPassword(userPassword, salt) {
    var passwordData = sha512(userPassword, salt);
    return passwordData;
}


var app = express();
app.use(bodyParser.json()); // Accept JSON Params
app.use(bodyParser.urlencoded({ extended: true })); // Accept URL Encoded params

var path = require('path');
var upload = multer({ 
    storage : multer.diskStorage({
        destination : function(req,file,cb) {
            cb(null,'uploads/');
        },
        filename : function (req,file,cb) {
            cb (null , new Date().valueOf() + path.extname(file.originalname));
        }
    })
 });


 // Start Server
app.listen(3000, () => {
    console.log('서버 가동 Restful running on port 3000');
})

// IP 주소 , 현재 서버 주소 
var os = require('os');
var interfaces = os.networkInterfaces();
var port2 = 3000
var addresses = [];
for (var k in interfaces) {
    for (var k2 in interfaces[k]) {
        var address = interfaces[k][k2];
        if (address.family === 'IPv4' && !address.internal) {
            addresses.push(address.address);
        }
    }
}
console.log("Take_Notes 현재 서버주소 : " + addresses + ":" + port2);

// ----------------------------------------------------------회원가입------------------------------------------------------------------
app.post('/register/', (req, res, next) => {

    var post_data = req.body; // Get POST params
    var uid = uuid.v4(); // Get UUID v4 like '110abacsasas-af0x-90333-casasjkajksk
    var plaint_password = post_data.password; // Get password from post params
    var hash_data = saltHashPassword(plaint_password);
    var password = hash_data.passwordHash; // Get hash value
    var salt = hash_data.salt; // Get salt
    var today = new Date();
    var name = post_data.name;
    var email = post_data.email;
    var phone_number = post_data.phone_number;
    var nickname = post_data.nickname;
    var user = {
        "unique_id": uid,
        "email": email,
        "name": name,
        "nickname": nickname,
        "phone_number": phone_number,
        "encrypted_password": password,
        "salt": salt,
        "created_at": today,
        "updated_at": today
    }
    con.query('SELECT * FROM user where email=?', [email], function (err, result, fields) {

        con.on('error', function (err) {
            console.log('[MySQL ERROR]', err);
        });

        if (result && result.length)
            res.json('동일한 이메일의 유저가 존재합니다.');
        else {
            con.query('INSERT INTO user SET ?', user, function (error, result, fields) {
                if (error) {
                    console.log("error ocurred", error);
                    res.send({
                        "code": 400,
                        "failed": "error ocurred",
                        "users": user
                    })
                } else {
                    console.log('The solution is: ', result);
                    res.send({
                        "code": 200,
                        "success": "회원가입 성공하였습니다.",
                        "users": user
                    })
                }
            })
        }
    });

})
// ----------------------------------------------------------회원가입------------------------------------------------------------------
// ----------------------------------------------------------로그인------------------------------------------------------------------
app.post('/login/', (req, res, next) => {
    var post_data = req.body;

    //Extract email and password from request
    var user_password = post_data.password;
    var email = post_data.email;


    con.query('SELECT * FROM user where email=?', [email], function (err, result, fields) {

        con.on('error', function (err) {
            console.log('[MySQL ERROR]', err);
        });

        if (result && result.length) {
            var salt = result[0].salt; // Get salt of result if account exists
            var encrypted_password = result[0].encrypted_password;
            //Hash password from Login request with salt in Database
            var hashed_password = checkHashPassword(user_password, salt).passwordHash;
            if (encrypted_password == hashed_password)

                res.end("로그인 성공" + JSON.stringify(result[0])) // If password is true , return all info of user
            else
                res.end(JSON.stringify(' 잘못된 비밀번호 입니다. '));
        }
        else {
            res.json(' 유저가 존재하지 않습니다.')
        }
    });

})
// ----------------------------------------------------------로그인------------------------------------------------------------------