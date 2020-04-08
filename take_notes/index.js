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
    user: '@@@@@@@@@@@',
    password: '@@@@@@@@@@@',
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
    var name = post_data.name;     // 사용자 이름
    var email = post_data.email;   // 사용자 Email
    var phone_number = post_data.phone_number;  // 사용자 휴대전화 번호
    var nickname = post_data.nickname;  // 사용자 별명
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

                res.end(JSON.stringify(result[0])) // If password is true , return all info of user
            else
                res.end(JSON.stringify(' 잘못된 비밀번호 입니다. '));
        }
        else {
            res.json(' 유저가 존재하지 않습니다.')
        }
    });

})
// ----------------------------------------------------------로그인------------------------------------------------------------------
// ----------------------------------------------------------메모 작성------------------------------------------------------------------
app.post('/writeMemo/',(req,res,next) => {

    var post_data = req.body; // Get POST params
    let email = post_data.email; // 메모 작성자 Email
    let title = post_data.title; // 메모 제목
    let content = post_data.content; // 메모 내용
    let newDate = new Date();
    var week = new Array('일','월','화','수','목','금','토');
    let time = newDate.toFormat('YYYY년 MM월 DD일 ')+ week[newDate.getDay()] + '요일 '+ newDate.toFormat('HH:MI:SS');
    
    
    var sql = 'INSERT INTO memolist (email, title, content, created_at, updated_at) VALUES(?, ?, ?, ?, ?)';
    con.query(sql,[email,title,content,time,time], function (error, result, fields) {
        if (error) {
            console.log("error ocurred", error);
            res.send({
                "code": 400,
                "failed": "error ocurred"
            })
        } else {
            console.log('The solution is: ', result);
            res.send({
                "code": 200,
                "success": "메모를 작성하였습니다.",
            })
            
        }
    })
});
// ----------------------------------------------------------메모 작성------------------------------------------------------------------
// ----------------------------------------------------------작성한 메모 리스트------------------------------------------------------------------
app.get("/MemoList/:email",(req,res,next)=>{
    var email = req.params.email;
    con.query('SELECT * FROM memolist where email=?',[email],function(error,result,fields){
        con.on('error',function(err){
            console.log('[MY SQL ERROR]',err);
        });

        if(result && result.length){
            
                res.end(JSON.stringify(result));
                console.log(result);
            
        } else {
        }
    })
});
// ----------------------------------------------------------작성한 메모 리스트------------------------------------------------------------------
// ----------------------------------------------------------메모 수정------------------------------------------------------------------
app.post('/ChangeMemo/',(req,res,next) => {

    var post_data = req.body; // Get POST params
    let num = post_data.num; // DB에 저장된 게시글 번호.
    let email = post_data.email; // 메모 작성자 Email
    let title = post_data.title; // 메모 제목
    let content = post_data.content; // 메모 내용
    let created_at = post_data.created_at; // 메모 작성일
    let newDate = new Date();
    var week = new Array('일','월','화','수','목','금','토');
    let Updated_time = newDate.toFormat('YYYY년 MM월 DD일 ')+ week[newDate.getDay()] + '요일 '+ newDate.toFormat('HH:MI:SS');
    
   
    var sql = 'UPDATE memolist SET email=?,title=?,content=?,created_at=?,updated_at=? WHERE num=?';
    con.query(sql,[email,title,content,created_at,Updated_time,num], function (error, result, fields) {
        if (error) {
            console.log("error ocurred", error);
            res.send({
                "code": 400,
                "failed": "error ocurred"
            })
        } else {
            console.log('The solution is: ', result);
            res.send({
                "code": 200,
                "success": "메모를 수정하였습니다.",
            })
            
        }
    })
});
// ----------------------------------------------------------메모 작성------------------------------------------------------------------
// ----------------------------------------------------------메모 삭제------------------------------------------------------------------
app.post('/DeleteMemo/',(req,res,next) => {

    var num = req.body.num;
   
     
     var sql = 'DELETE FROM memolist where num=?';
     con.query(sql,[num], function (error, result, fields) {
         if (error) {
             console.log("error ocurred", error);
             res.send({
                 "code": 400,
                 "failed": "error ocurred"
             })
         } else {
             console.log('The solution is: ', result);
             res.send({
                 "code": 200,
                 "success": "메모를 삭제하였습니다.",
             })
             
         }
     })
 });
 // ----------------------------------------------------------메모 삭제------------------------------------------------------------------

  // --------------------------------------------------------- 사진 업로드 ---------------------------------------------------------------

app.post('/ImageUpload/',upload.array('files'),(req,res,next) => {
    console.log(req.files);
    console.log(req.body);
    let file = "empty";
    let file1 = "empty";
    let file2 = "empty";
    let file3 = "empty";
    let file4 = "empty";
    let file5 = "empty";
    let file6 = "empty";
    let file7 = "empty";
    let file8 = "empty";
    let file9 = "empty";
    for(var i = 0; i<req.files.length; i++){
        switch(i){
            case 0:
                file = req.files[0].filename;
                break;
            case 1:
                file1 = req.files[1].filename;
                break;
            case 2:
                file2 = req.files[2].filename;
                break;
            case 3:
                file3 = req.files[3].filename;
                break;
            case 4:
                file4 = req.files[4].filename;
                break;
            case 5:
                file5 = req.files[5].filename;
                break;
            case 6:
                file6 = req.files[6].filename;
                break;
            case 7:
                file7 = req.files[7].filename;
                break;
            case 8:
                file8 = req.files[8].filename;
                break;
            case 9:
                file9 = req.files[9].filename;
                break;
        }
    }
    
    let email = req.body.email;
    let title = req.body.title; 
    let content = req.body.content; 
    let newDate = new Date();
    var week = new Array('일','월','화','수','목','금','토');
    let created_time = newDate.toFormat('YYYY년 MM월 DD일 ')+ week[newDate.getDay()] + '요일 '+ newDate.toFormat('HH:MI:SS');
    
   
    var sql = 'INSERT INTO images (email, title, content, file, file1, file2, file3, file4, file5, file6, file7, file8, file9, created_at, updated_at) VALUES( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    con.query(sql,[email, title, content, file,file1,file2,file3,file4,file5,file6,file7,file8,file9,created_time,created_time], function (error, result, fields) {
        if (error) {
            console.log("error ocurred", error);
            res.send({
                "code": 400,
                "failed": "error ocurred"
            })
        } else {
            console.log('The solution is: ', result);
            res.send({
                "code": 200,
                "success": "사진을 업로드하였습니다.",
            })
            
        }
    });
});
  // --------------------------------------------------------- 사진 업로드 ---------------------------------------------------------------
  // ---------------------------------------------------------- 업로드한 사진 리스트------------------------------------------------------------------
app.get("/ImageList/:email",(req,res,next)=>{
    var email = req.params.email;
    con.query('SELECT * FROM images where email=?',[email],function(error,result,fields){
        con.on('error',function(err){
            console.log('[MY SQL ERROR]',err);
        });

        if(result && result.length){
            
                res.end(JSON.stringify(result));
                console.log(result);
            
        } else {
        }
    })
});
// ---------------------------------------------------------- 업로드한 사진 리스트------------------------------------------------------------------
// ---------------------------------------------------------- 사진 삭제------------------------------------------------------------------
app.post('/DeletePicture/',(req,res,next) => {

    var num = req.body.num;
   
     
     var sql = 'DELETE FROM images where num=?';
     con.query(sql,[num], function (error, result, fields) {
         if (error) {
             console.log("error ocurred", error);
             res.send({
                 "code": 400,
                 "failed": "error ocurred"
             })
         } else {
             console.log('The solution is: ', result);
             res.send({
                 "code": 200,
                 "success": "업로드한 사진을 삭제하였습니다.",
             })
             
         }
     })
 });
 // ---------------------------------------------------------- 사진 삭제------------------------------------------------------------------
// --------------------------------------------------------- 동영상 업로드 ---------------------------------------------------------------

app.post('/VideoUpload/',upload.single('video'),(req,res,next) => {
    console.log(req.file);
    console.log(req.body);
    let video = req.file.filename;
    let email = req.body.email;
    let title = req.body.title; 
    let content = req.body.content; 
    let newDate = new Date();
    var week = new Array('일','월','화','수','목','금','토');
    let created_time = newDate.toFormat('YYYY년 MM월 DD일 ')+ week[newDate.getDay()] + '요일 '+ newDate.toFormat('HH:MI:SS');
    
   
    var sql = 'INSERT INTO video (email, title, content, video, created_at, updated_at) VALUES( ?, ?, ?, ?, ?, ?)';
    con.query(sql,[email, title, content, video, created_time, created_time], function (error, result, fields) {
        if (error) {
            console.log("error ocurred", error);
            res.send({
                "code": 400,
                "failed": "error ocurred"
            })
        } else {
            console.log('The solution is: ', result);
            res.send({
                "code": 200,
                "success": "동영상을 업로드하였습니다.",
            })
            
        }
    });
});
// --------------------------------------------------------- 동영상 업로드 ---------------------------------------------------------------
  // ---------------------------------------------------------- 업로드한 동영상 리스트------------------------------------------------------------------
  app.get("/VideoList/:email",(req,res,next)=>{
    var email = req.params.email;
    con.query('SELECT * FROM video where email=?',[email],function(error,result,fields){
        con.on('error',function(err){
            console.log('[MY SQL ERROR]',err);
        });

        if(result && result.length){
            
                res.end(JSON.stringify(result));
                console.log(result);
            
        } else {
        }
    })
});
// ---------------------------------------------------------- 업로드한 동영상 리스트------------------------------------------------------------------
