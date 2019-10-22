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

//
// From here onwards, app functionality begins
//

function error(err, type, status, ip, res) {
  console.log('[', moment().format('YYYY/MM/DD h:mm:ss a'), '] ', type, ' request from ', ip, ' error: ', err);
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
      conn.query("SELECT CASE WHEN MAX(inDate) > MAX(outDate) THEN MAX(inDate) ELSE MAX(outDate) END AS date FROM clock WHERE user=?;", [req.body.username]).then((rows) => {
        if (rows[0] === undefined || rows[0].date == null) { 
          date = 'none';
        } else {
          date = new Date(rows[0].date);
        }
        var token = jwt.sign({ user: req.body.username }, privateKey, { algorithm: 'RS256', expiresIn: '1h' });
        res.send({ status: 'logged', date: date, token: token });      
        conn.end().then(() => {}).catch(err => { console.log('[', moment.format('YYYY/MM/DD h:mm:ss a'), '] DB connection ended abruptly(/login, ', req.body.username,')'); });
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
              conn.end().then(() => {}).catch(err => { console.log('[', moment.format('YYYY/MM/DD h:mm:ss a'), '] DB connection ended abruptly(/clock, ', req.user.user, ', ', type, ', ', ip, ')'); });
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
              conn.end().then(() => {}).catch(err => { console.log('[', moment.format('YYYY/MM/DD h:mm:ss a'), '] DB connection ended abruptly(/clock, ', req.user.user, ', ', type, ', ', ip, ')'); }); 
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

// A request is attempting to write an issue
app.post('/issue', function(req, res, next) {
  var issue = req.body.issue;
  if (issue !== undefined && issue.length < 2550) {
    mariadb.createConnection(db_opts).then(conn => {
      return conn.query("INSERT INTO issue(user, date, text, noted) VALUES(?,NOW(),?,0)", [req.user.user, issue]).then((dbres) => {
        res.send({ status: 'ok' });
      });
      conn.end().then(() => {}).catch(err => { console.log('[', Date.now(), '] DB connection ended abruptly(/issue, ', req.user.user, ')'); });
    })
    .catch(err => {
      res.status(500).send({ error: err }).end();
    });
  } else {
    res.status(400).send({ status: 'Bad request: text must be between 0 and 2550 characters long' }).end();
  }
});

// At this point, no other route has been matched so we assume 404
app.use(function(req, res, next){
  res.status(404).send({ status: 'not found' });
});

// Port to listen on
app.listen(8080);
