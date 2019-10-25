// Module load
var express      = require('express'),
    passport     = require('passport'),
    bodyParser   = require('body-parser'),
    cookieParser = require('cookie-parser'),
    jwt 	       = require('jsonwebtoken'),
    fs           = require('file-system'),
    mariadb      = require('mariadb'),
    pass_file    = require('./password.key.json'),
    cors         = require('cors'),
    expressJwt   = require('express-jwt'),
    moment       = require('moment'),
    nodemailer   = require('nodemailer'),
    {exec}       = require('child_process'),
    bunyan       = require('bunyan'),
    LdapStrategy = require('passport-ldapauth');

// LDAP strategy
var OPTS = {
  server: {
    url: 'ldap://ldap-01.sw.ehu.es:389',
    bindDN: 'cn=admin,dc=sw,dc=ehu,dc=es',
    searchBase: 'ou=users,dc=sw,dc=ehu,dc=es',
    searchFilter: '(uid={{username}})'
  }
};

// App initialization
var app = express();

// Middleware initialization
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(cors());
app.use(passport.initialize());

// Timezone
process.env.TZ = 'Europe/Madrid';

// Trust proxy, necessary to get IP address
app.enable('trust proxy');

// Set bindCredentials to our LDAP strategy
OPTS.server.bindCredentials = pass_file.ldap;

// Assign our LDAP strategy to passport
passport.use(new LdapStrategy(OPTS));

// RSA public key
const rsa_public_key = fs.readFileSync('jwtRS256.key.pub', 'utf8');

// Mariadb connection options
const db_opts = { host: 'localhost', user: 'noadmin', password: pass_file.mariadb, database: 'clocks' };

// Bunyan logger
const log = bunyan.createLogger({
  name: 'fichajes',
  streams: [
    {
      level: 'info',
      stream: process.stdout
    },
    {
      level: 'error',
      path: './error.log'
    }
  ]
});

//
// From here onwards, app functionality begins
//

function error(err, type, status, ip, res) {
  log.error(type + ' request from ' + ip +  ' error: {' + err + '}');
  res.status(status).send({ status: err }).end();
}

// Authentication middleware
app.use(expressJwt({
    secret: rsa_public_key
})); 

app.use(function(err, req, res, next) {
  if(err.name === 'UnauthorizedError' && req.path != '/login') {
    error('Invalid token', 'Invalid token', 401, '', res);
  } else{
    next();
  }
});

// Login attempt, using passport. If authentication succeeds, generate JWT token
// and send it as a cookie, which will grant authorization for future requests
app.post('/login', passport.authenticate('ldapauth', {session: false}), (req, res) => {
  var privateKey = fs.readFileSync('jwtRS256.key', 'utf8');
  mariadb.createConnection(db_opts).then(conn => {
    conn.query("INSERT IGNORE INTO users VALUES(?)", req.body.username).then((dbres) => {
      conn.query("SELECT CASE WHEN MAX(outDate) IS NULL THEN MAX(inDate) WHEN MAX(inDate) > MAX(outDate) THEN MAX(inDate) ELSE MAX(outDate) END AS date FROM clock WHERE user=?;", [req.body.username]).then((rows) => {
        if (rows[0] === undefined || rows[0].date == null) { 
          date = 'none';
        } else {
          date = new Date(rows[0].date);
        }
        var token = jwt.sign({ user: req.body.username }, privateKey, { algorithm: 'RS256', expiresIn: '1h' });
        res.send({ status: 'logged', date: date, token: token });      
        conn.end().then(() => {}).catch(err => { console.log('[', moment().format('YYYY/MM/DD HH:mm:ss a'), '] DB connection ended abruptly(/login, ', req.body.username,')'); });
      });
    });
  })
  .catch(err => {
    error(err, 'DB connection error', 500, req.ip, res);
  });      
});

// A request is attempting to clock-in/out, verify if it has logged first
app.post('/clock', function(req, res, next) {
  var type = req.body.type;
  var ip = req.ip;
  //var ip = req.connection.remoteAddress;
  if (type !== undefined && (type === 'in' || type === 'out')) {
    if (type === 'in') {
      mariadb.createConnection(db_opts).then(conn => {
        conn.query("SELECT outDate, inDate FROM clock WHERE user=? AND inDate=(SELECT MAX(inDate) FROM clock WHERE user=?)", [req.user.user, req.user.user]).then(maxIn => {
          if (maxIn[0] === undefined || ((maxIn[0].inDate == null && maxIn[0].outDate == null) || (maxIn[0].inDate != null && maxIn[0].outDate != null))) {
	    conn.query("INSERT INTO clock(user, inDate, inip) VALUES(?, NOW(), ?)", [req.user.user, ip]).then(dbres => {
              res.send({ status: 'ok' });          
              conn.end().then(() => {}).catch(err => { console.log('[', moment().format('YYYY/MM/DD HH:mm:ss a'), '] DB connection ended abruptly(/clock, ', req.user.user, ', ', type, ', ', ip, ')'); });
            })
            .catch(err => {
              error(err, 'DB connection error', 500, ip, res);
            });
          } else if (maxIn[0] !== undefined && maxIn[0].outDate == null) {
            error('Bad request: unpaired indate', 'Clock in', 400, ip, res);
          } else {
            error('Bad request: unknown error', 'Clock in', 400, ip, res);
          }
        })
      })
      .catch(err => {
        error(err, 'DB connection error', 500, ip, res);  
      });
    } else if (type === 'out') {
      mariadb.createConnection(db_opts).then(conn => {
        conn.query("SELECT outDate, inDate, id FROM clock WHERE user=? AND inDate=(SELECT MAX(inDate) FROM clock WHERE user=?)", [req.user.user, req.user.user]).then(maxIn => {
          if (maxIn[0] !== undefined && maxIn[0].inDate != null && maxIn[0].outDate == null) {
	    conn.query("UPDATE clock SET outDate=NOW(), outip=? WHERE id=?", [ip, maxIn[0].id]).then(dbres => {
              res.send({ status: 'ok' });          
              conn.end().then(() => {}).catch(err => { console.log('[', moment().format('YYYY/MM/DD HH:mm:ss a'), '] DB connection ended abruptly(/clock, ', req.user.user, ', ', type, ', ', ip, ')'); }); 
            })
            .catch(err => {
              error(err, 'DB connection error', 500, ip, res);
            });
          } else if (maxIn[0] !== undefined && (maxIn[0].inDate == null || maxIn[0].outDate != null)) {
            error('Bad request: unpaired outdate', 'Clock out', 400, ip, res);
          } else {
            error('Bad request: unknown error', 'Clock out', 400, ip, res);
          } 
        })
      })
      .catch(err => {
        error(err, 'DB connection error', 500, ip, res);
      });
    }
  } else {
    error('Bad request: not a valid type', 'Clock', 400, ip, res);    
  }  
});

// A request is asking for information about last clock
app.post('/lastclock', function(req, res, next) {
  var type = req.body.type
  if (type !== undefined && (type === 'in' || type === 'out')) {
    if (type === 'in') {
      mariadb.createConnection(db_opts).then(conn => {
        conn.query("SELECT id, inDate, outDate FROM clock WHERE user=? AND inDate=(SELECT MAX(inDate) FROM clock WHERE user=?)", [req.user.user, req.user.user]).then(maxIn => {
          if (maxIn[0] !== undefined && maxIn[0].inDate != null && maxIn[0].outDate == null) {
	    res.send({ id: maxIn[0].id, in: maxIn[0].inDate });
          } else {
            error('Bad request: Last clock-in is right', 'LastClock', 400, req.ip, res);
          }
        })
      })
      .catch(err => {
        error(err, 'DB connection error', 500, req.ip, res);
      });
    } else {
      mariadb.createConnection(db_opts).then(conn => {
        conn.query("SELECT id, inDate, outDate FROM clock WHERE user=? AND outDate=(SELECT MAX(outDate) FROM clock WHERE user=?)", [req.user.user, req.user.user]).then(maxOut => {
          if (maxOut[0] !== undefined && maxOut[0].outDate != null && maxOut[0].inDate != null) {
	          res.send({ id: maxOut[0].id, out: maxOut[0].outDate });
          } else if (maxOut[0] !== undefined && maxOut[0].outDate != null && maxOut[0].inDate == null) {
            error('DB error: Last clock is corrupted', 'LastClock', 500, req.ip, res);
          } else {
            error('Bad request: Last clock-out is right', 'LastClock', 400, req.ip, res);
          }
        })
      })
      .catch(err => {
        error(err, 'DB connection error', 500, req.ip, res);
      });
    }
  } else {
    error('Bad request: not a valid type', 'LastClock', 400, req.ip, res);
  }
});

// A request is attempting to write an issue
app.post('/issue', function(req, res, next) {
  var issue = req.body.issue;
  if (issue !== undefined && issue.text !== undefined && issue.text.length < 2550) {
    mariadb.createConnection(db_opts).then(conn => {
      if (id !== undefined) {
        conn.query("INSERT INTO issue(clock_id, user, date, text, noted) VALUES(?,NOW(),?,0)", [id, req.user.user, issue]).then((dbres) => {
          if (req.body.inDate != undefined) {
            conn.query("UPDATE clock SET inDate=?, inConfirmed=0 WHERE id=?", [req.body.inDate, id]).then(upres => {
              res.send({ status: 'ok' });
              conn.end().then(() => {}).catch(err => { console.log('[', Date.now(), '] DB connection ended abruptly(/issue, ', req.user.user, ')'); });
            })
            .catch(err => {
              error(err, 'DB update error', 500, req.ip, res);
            });
          }
          if (req.body.outDate != undefined) {
            conn.query("UPDATE clock SET outDate=?, outConfirmed=0 WHERE id=?", [req.body.outDate, id]).then(upres => {
              res.send({ status: 'ok' });
              conn.end().then(() => {}).catch(err => { console.log('[', Date.now(), '] DB connection ended abruptly(/issue, ', req.user.user, ')'); });
            })
            .catch(err => {
              error(err, 'DB update error', 500, req.ip, res);
            });
          }
        })
        .catch(err => {
          error(err, 'DB insert error', 500, req.ip, res);
        });
      } else {
        conn.query("INSERT INTO issue(user, date, text, noted) VALUES(?,NOW(),?,0)", [req.user.user, issue]).then((dbres) => {
          res.send({ status: 'ok' });
          conn.end().then(() => {}).catch(err => { console.log('[', Date.now(), '] DB connection ended abruptly(/issue, ', req.user.user, ')'); });
        })
        .catch(err => {
          error(err, 'DB insert error', 500, req.ip, res);
        });
      }
    })
    .catch(err => {
      error(err, 'DB connection error', 500, req.ip, res);      
    });
  } else {
    error('Bad request: text must be between 0 and 2550 characters long', 'Issue', 400, req.ip, res);    
  }
});

app.post('/issueform', function(req, res, next) {
  var issue = req.body.issue;
  var date = moment(req.body.date, 'DD/MM/YYYY', true);
  console.log(req.body.date, ' ', date.isValid());
  if (issue !== undefined && issue.length < 2550 && date.isValid()) {
    var ldapsearch = 'ldapsearch -LLL -H \'' + OPTS.server.url + '\' -x -D \'' + OPTS.server.bindDN + '\' -w \'' + pass_file.ldap + '\' -b \'' + OPTS.server.searchBase + '\' "(uid=' + req.user.user + ')" | grep displayName: | cut -d\':\' -f2';
    exec(ldapsearch, (err, stdout, stderr) => {
      if (err) {
        error(err, 'Exec command error', 500, req.ip, res);
      }
      var fullname = stdout;
      let transporter = nodemailer.createTransport({
        host: 'smtp.serviciodecorreo.es',
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: 'incidencias@dipc.org',
            pass: pass_file.mail
        }
      });
      
      transporter.sendMail({
        from: '"Incidencias DIPC" <incidencias@dipc.org>', // sender address
        to: 'incidencias@dipc.org', // list of receivers
        subject: 'Incidencia' + fullname, // Subject line
        html: '<h1>Incidencia de' + fullname + '</h1>' +
              '<p>Fecha: ' + date.format('DD/MM/YYYY') + '</p>' +
              '<p>Razón: ' + issue + '</p>'
      }, (err, info) => {
        if (err) {
          error(err, 'Email sending error', 500, req.ip, res);
        }
        res.send({ status: 'ok' });
      });
    });     
  } else {
    error('Bad request: text must be between 0 and 2550 characters long', 'Issue', 400, req.ip, res);    
  } 
});

// At this point, no other route has been matched so we assume 404
app.use(function(req, res, next){
  res.status(404).send({ status: 'not found' });
});

// Port to listen on
app.listen(8080);
