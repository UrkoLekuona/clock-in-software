// Module load
var express      = require('express'),
    passport     = require('passport'),
    bodyParser   = require('body-parser'),
    cookieParser = require('cookie-parser'),
    jwt 	 = require('jsonwebtoken'),
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
const rsa_public_key = fs.readFileSync('./jwtRS256.key.pub', 'utf8');

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
  } else {
    next();
  }
});

function isAdmin(req, res, next) {
  if (req.user.admin) {
    //error(req.user.user + ' is trying to access ' + req.path + ' without being admin.', 'Not admin', 401, req.ip, res);
    next();
  } else {
    error(req.user.user + ' is trying to access ' + req.path + ' without being admin.', 'Not admin', 401, req.ip, res);
  }
}

// Login attempt, using passport. If authentication succeeds, generate JWT token
// and send it as body, which will grant authorization for future requests
app.post('/login', passport.authenticate('ldapauth', {session: false}), (req, res) => {
  var privateKey = fs.readFileSync('jwtRS256.key', 'utf8');
  var ldapsearch = 'ldapsearch -LLL -H \'' + OPTS.server.url + '\' -x -D \'' + OPTS.server.bindDN + '\' -w \'' + pass_file.ldap + '\' -b \'' + OPTS.server.searchBase + '\' "(uid=' + req.body.username + ')" | grep displayName: | cut -d\':\' -f2 | awk \'{$1=$1};1\'';
  exec(ldapsearch, (err, stdout, stderr) => {
    if (err) {
      error(err, 'Exec command error', 500, req.ip, res);
    }
    var fullname = stdout;
    mariadb.createConnection(db_opts).then(conn => {
      conn.query("INSERT IGNORE INTO users VALUES(?,?)", [req.body.username, fullname]).then((dbres) => {
        conn.query("SELECT inDate, outDate FROM clock WHERE user=? and inDate=(SELECT MAX(inDate) FROM clock WHERE user=?)", [req.body.username, req.body.username]).then(rows => {
          if (rows[0] === undefined || rows[0].inDate == null) {
            date = 'none';
	    type = 'none';
          } else if (rows[0].outDate == null) {
	    date = new Date(rows[0].inDate);
	    type = 'in';
	  } else {
	    date = new Date(rows[0].outDate);
	    type = 'out';
	  }
	  let admin = false;
	  if (req.user.employeeType && req.user.employeeType === 'fichajeAdmin') {
            admin = true;
	  }
	  var token = jwt.sign({ user: req.body.username, admin: admin }, privateKey, { algorithm: 'RS256', expiresIn: '1h' });
          res.send({ status: 'logged', date: date, type: type, token: token });      
          conn.end();
        });
      });
    })
    .catch(err => {
      error(err, 'DB connection error', 500, req.ip, res);
    });
  });      
});

// A request is attempting to clock-in/out
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
              conn.end();
            })
            .catch(err => {
              error(err, 'DB connection error', 500, ip, res);
            });
          } else if (maxIn[0] !== undefined && maxIn[0].outDate == null) {
            error('Bad request: unpaired indate for user ' + req.user.user, 'Clock in', 400, ip, res);
          } else {
            error('Bad request: unknown error', 'Clock in', 400, ip, res);
          }
        })
	.catch(err => {
	  error(err, 'DB connection error', 500, ip, res);
        });
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
              conn.end(); 
            })
            .catch(err => {
              error(err, 'DB connection error', 500, ip, res);
            });
          } else if (maxIn[0] !== undefined && (maxIn[0].inDate == null || maxIn[0].outDate != null)) {
            error('Bad request: unpaired outdate for user ' + req.user.user, 'Clock out', 400, ip, res);
          } else {
            error('Bad request: unknown error', 'Clock out', 400, ip, res);
          } 
        })
	.catch(err => {
	  error(err, 'DB connection error', 500, ip, res);
        });
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
            error('Bad request: Last clock-in is right for user ' + req.user.user, 'LastClock', 400, req.ip, res);
          }
        })
      })
      .catch(err => {
        error(err, 'DB connection error', 500, req.ip, res);
      });
    } else {
      mariadb.createConnection(db_opts).then(conn => {
        conn.query("SELECT id, inDate, outDate FROM clock WHERE user=? AND outDate=(SELECT MAX(outDate) FROM clock WHERE user=?)", [req.user.user, req.user.user]).then(maxOut => {
          conn.end();
	  if (maxOut[0] !== undefined && maxOut[0].outDate != null && maxOut[0].inDate != null) {
	    res.send({ id: maxOut[0].id, out: maxOut[0].outDate });
          } else if (maxOut[0] !== undefined && maxOut[0].outDate != null && maxOut[0].inDate == null) {
            error('DB error: Last clock is corrupted', 'LastClock', 500, req.ip, res);
          } else {
            error('Bad request: Last clock-out is right for user ' + req.user.user, 'LastClock', 400, req.ip, res);
          }
        })
      })
      .catch(err => {
        error(err, 'DB connection error', 500, req.ip, res);
      });
    }
  } else {
    error('Bad request: not a valid type from user ' + req.user.user, 'LastClock', 400, req.ip, res);
  }
});

// A request is attempting to write an issue
app.post('/issue', function(req, res, next) {
  var date = moment(req.body.date, 'DD/MM/YYYY', true);
  var nInDate = moment(req.body.nInDate, 'DD/MM/YYYY HH:mm', true);
  var nOutDate = moment(req.body.nOutDate, 'DD/MM/YYYY HH:mm', true);
  if (req.body.id !== undefined && req.body.text !== undefined && req.body.text.length < 2550 && date.isValid() && nInDate.isValid() && nOutDate.isValid()) {
    mariadb.createConnection(db_opts).then(conn => {
      var formatIn = nInDate.format('YYYY-MM-DD HH:mm');
      var formatOut = nOutDate.format('YYYY-MM-DD HH:mm');
      conn.query("INSERT INTO issue(clock_id, user, date, text, rInDate, nInDate, diffInDate, rOutDate, nOutDate, diffOutDate) SELECT c.id, c.user, ?, ?, c.inDate, ?, TIMESTAMPDIFF(minute, ?, c.inDate), c.outDate, ?, TIMESTAMPDIFF(minute, c.outDate, ?) from clock as c where id=?;", [date.format('YYYY-MM-DD'), req.body.text, formatIn, formatIn, formatOut, formatOut, req.body.id]).then((dbres) => {
        conn.end();
        res.send({ status: 'ok' });
      })
      .catch(err => {
        error(err, 'Error inserting issue', 500, req.ip, res);      
      });
    })
    .catch(err => {
      error(err, 'DB connection error', 500, req.ip, res);
    });
  } else {
    error('Bad request: Invalid issue', 'Issue', 400, req.ip, res);    
  }
});

// A request wants to inform about an issue
app.post('/issueform', function(req, res, next) {
  var issue = req.body.issue;
  var date = moment(req.body.date, 'DD/MM/YYYY', true);
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
              '<p>Fecha de la incidencia: ' + date.format('DD/MM/YYYY') + '</p>' +
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

app.get('/allusers', isAdmin, function(req, res, next) {
  mariadb.createConnection(db_opts).then(conn => {
    conn.query("SELECT username, displayName FROM users").then((dbres) => {
      if (dbres != undefined) {
        res.send({  status: 'ok', users: dbres });
        conn.end();
      } else {
	error('Error getting all users', 'AllUsers', 500, req.ip, res);
      }
    })
    .catch(err => {
      error(err, 'DB connection error', 500, req.ip, res);      
    });
  });
}); 

app.post('/clocksBetweenDates', isAdmin, function(req, res, next) {
  let minDate = moment(req.body.minDate, 'DD/MM/YYYY', true);
  let maxDate = moment(req.body.maxDate, 'DD/MM/YYYY', true);
  if (req.body.user && minDate.isValid() && maxDate.isValid() && minDate.isSameOrBefore(maxDate)) {
    mariadb.createConnection(db_opts).then(conn => {
      conn.query("SELECT id, inDate, inIp, outDate, outIp FROM clock WHERE user=? AND inDate>=? AND outDate<=?", [req.body.user, minDate.format('YYYY-MM-DD'), maxDate.add(1, 'd').format('YYYY-MM-DD')]).then((clockres) => {
        if (clockres != undefined) {
          clockres.forEach(row => {
            row['inDate'] = moment(row.inDate).format('DD/MM/YYYY HH:mm:ss');
            row['outDate'] = moment(row.outDate).format('DD/MM/YYYY HH:mm:ss');
	  });
          conn.query("SELECT id, date, text, rInDate, nInDate, diffInDate, rOutDate, nOutDate, diffOutDate FROM issue WHERE user=? AND rInDate>=? AND rOutDate<=?", [req.body.user, minDate.format('YYYY-MM-DD'), maxDate.add(1, 'd').format('YYYY-MM-DD')]).then((issueres) => {
            if (issueres != undefined) {
              issueres.forEach(row => {
                row['date'] = moment(row.date).format('DD/MM/YYYY');
                row['rInDate'] = moment(row.rInDate).format('DD/MM/YYYY HH:mm:ss');
                row['nInDate'] = moment(row.nInDate).format('DD/MM/YYYY HH:mm:ss');
                row['rOutDate'] = moment(row.rOutDate).format('DD/MM/YYYY HH:mm:ss');
                row['nOutDate'] = moment(row.nOutDate).format('DD/MM/YYYY HH:mm:ss');
              });
              res.send({ status: 'ok', clocks: clockres, issues: issueres });
              conn.end();
            } else {
              error('Error getting all issues', 'ClocksBetweenDates', 500, req.ip, res);
            }
          })
          .catch(err2 => {
            error(err2, 'DB connection error', 500, req.ip, res);
          });
        } else {
          error('Error getting all clocks', 'ClocksBetweenDates', 500, req.ip, res);
        }
      })
      .catch(err => {
        error(err, 'DB connection error', 500, req.ip, res);
      });
    });
    //res.send({ status: 'ok', clocks: []});
  } else {
    error('Bad request: Invalid dates', 'ClocksBetweenDates', 400, req.ip, res);
  }
});

// At this point, no other route has been matched so we assume 404
app.use(function(req, res, next){
  res.status(404).send({ status: 'not found' });
});

// Port to listen on
app.listen(8080);
