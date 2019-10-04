// Module load
var express      = require('express'),
    passport     = require('passport'),
    bodyParser   = require('body-parser'),
    cookieParser = require('cookie-parser'),
    jwt 	 = require('jsonwebtoken'),
    fs           = require('file-system'),
    mariadb      = require('mariadb'),
    pass_file    = require('./password.key.json'),
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
app.use(passport.initialize());

// Timezone
process.env.TZ = 'Europe/Madrid';

// Set bindCredentials to our LDAP strategy
OPTS.server.bindCredentials = pass_file.ldap;

// Assign our LDAP strategy to passport
passport.use(new LdapStrategy(OPTS));

// Mariadb pool
const pool = mariadb.createPool({ host: 'localhost', user: 'noadmin', password: pass_file.mariadb, database: 'clocks' });

//
// From here onwards, app functionality begins
//

// Function to call when the request is a clock-in attempt.
// It will register the event in the database and answer
// with a successful status
function clock(decoded, req, res, next) {
  var type = req.body.type;
  if (type !== null && (type === 'in' || type === 'out')){
    pool.getConnection().then(conn => {
      conn.query("SELECT type, date FROM clock WHERE user=? AND date=(SELECT MAX(date) FROM clock WHERE user=?)", [decoded.user, decoded.user]).then((rows) => {
        if (rows[0] === undefined || rows[0].type !== type) {
          return conn.query("INSERT INTO clock(user, type, date) VALUES(?,?,NOW())", [decoded.user, type]).then((dbres) => {
            res.send({ status: 'ok' });
          });
        } else {
          res.status(400).send({ status: 'Bad request: same clock type as last time' }).end();
        }
        conn.end();
      }); 
    })
    .catch(err => {
      res.status(500).send({ error: err }).end();
    });
  } else {
    res.status(400).send({ status: 'Bad request: Not a valid type' }).end();
  }  
}

// Login attempt, using passport. If authentication succeeds, generate JWT token
// and send it as a cookie, which will grant authorization for future requests
app.post('/login', passport.authenticate('ldapauth', {session: false}), (req, res) => {
  var privateKey = fs.readFileSync('jwtRS256.key', 'utf8');
  pool.getConnection().then(conn => {
    conn.query("INSERT IGNORE INTO users VALUES(?)", req.body.username).then((dbres) => {
      conn.query("SELECT type, date FROM clock WHERE user=? AND date=(SELECT MAX(date) FROM clock WHERE user=?)", [req.body.username, req.body.username]).then((rows) => {
        if (rows[0] === undefined) { 
          type = 'none';
          date = 'none';
        } else {
          type = rows[0].type;
          date = rows[0].date;
        }
        res.cookie('token', jwt.sign({ user: req.body.username }, privateKey, { algorithm: 'RS256', expiresIn: '1h' })).send({ status: 'logged', type: type, date: date });      
        conn.end();
      });
    });
  })
  .catch(err => {
    res.status(500).send({ error: err }).end();
  });      
});

// A request is attempting to clock-in/out, verify if it has logged first
app.post('/clock', function(req, res, next) {
  // JWT verification
  var publicKey = fs.readFileSync('jwtRS256.key.pub', 'utf8');
  try {
    var decoded = jwt.verify(req.cookies.token, publicKey, { algorithms: ['RS256'] });
  } catch(err) {
    res.status(403).send({ error: err });
    res.end(); 
  }
  clock(decoded, req, res, next);
});

// At this point, no other route has been matched so we assume 404
app.use(function(req, res, next){
  res.status(404).send({ status: 'not found' });
});

// Port to listen on
app.listen(8080);
