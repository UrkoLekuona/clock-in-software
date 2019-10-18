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

// Mariadb pool
const pool = mariadb.createPool({ host: 'localhost', user: 'noadmin', password: pass_file.mariadb, database: 'clocks' });

//
// From here onwards, app functionality begins
//

// Authentication middleware
app.use(expressJwt({
    secret: rsa_public_key
})); 

app.use(function(err, req, res, next) {
  console.log(req.path);
  if(err.name === 'UnauthorizedError' && req.path != '/login') {
    console.log('No token');
    res.status(401).send('invalid token...');
  }
  next();
});

// Function to call when the request is a clock-in attempt.
// It will register the event in the database and answer
// with a successful status
function clock(decoded, req, res, next) {
}

// Function to call when the request is an issue attempt.
// It will register the issue in the database and answer
// with a successful status
function issue(decoded, req, res, next) {
  var issue = req.body.issue;
  if (issue !== undefined && issue.length < 2550) {
    pool.getConnection().then(conn => {
      return conn.query("INSERT INTO issue(user, date, text, noted) VALUES(?,NOW(),?,0)", [decoded.user, issue]).then((dbres) => {
        res.send({ status: 'ok' });
      });
    })
    .catch(err => {
      res.status(500).send({ error: err }).end();
    });
  } else {
    res.status(400).send({ status: 'Bad request: text must be between 0 and 2550 characters long' }).end();
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
          date = new Date(rows[0].date);
        }
        var token = jwt.sign({ user: req.body.username }, privateKey, { algorithm: 'RS256', expiresIn: '1h' });
        res.send({ status: 'logged', type: type, date: date, token: token });      
        console.log('Sending token: ', token);
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
  var type = req.body.type;
  console.log(type);
  console.log(req.user);
  var ip = req.ip;
  //var ip = req.connection.remoteAddress;
  if (type !== undefined && (type === 'in' || type === 'out')) {
    pool.getConnection().then(conn => {
      return conn.query("INSERT INTO clock(user, type, date, ip) VALUES(?,?,NOW(),?)", [req.user.user, type, ip]).then((dbres) => {
        res.send({ status: 'ok' });
      });  
      conn.end();
    }) 
    .catch(err => {
      console.log('Clock request from ', ip, ' error: Database error ', err);
      res.status(500).send({ error: err }).end();
    });
  } else {
    console.log('Clock request from ', ip, ' error: ', type, ' is not a valid type');
    res.status(400).send({ status: 'Bad request: not a valid type' }).end();
  }  
});

// A request is attempting to write an issue
app.post('/issue', function(req, res, next) {
  // JWT verification
  var publicKey = fs.readFileSync('jwtRS256.key.pub', 'utf8');
  try {
    console.log('Verifying clock request token: ', req.cookies.token);
    var decoded = jwt.verify(req.cookies.token, publicKey, { algorithms: ['RS256'] });
    console.log('Verification successful, token: ', decoded);
    issue(decoded, req, res, next);
  } catch(err) {
    console.log('Verification error: ', err);
    res.status(403).send({ error: err }).end();
  }
});

// At this point, no other route has been matched so we assume 404
app.use(function(req, res, next){
  res.status(404).send({ status: 'not found' });
});

// Port to listen on
app.listen(8080);
