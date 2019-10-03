// Module load
var express      = require('express'),
    passport     = require('passport'),
    bodyParser   = require('body-parser'),
    cookieParser = require('cookie-parser'),
    jwt 	 = require('jsonwebtoken'),
    fs           = require('file-system'),
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

//
/*
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});
*/
// Middleware initialization
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(passport.initialize());

// Set bindCredentials to our LDAP strategy
app.locals.ldap_pass = 'Tga!Fh7_';
OPTS.server.bindCredentials = app.locals.ldap_pass;

// Assign our LDAP strategy to passport
passport.use(new LdapStrategy(OPTS));

//
// From here onwards, app functionality begins
//

// Function to call when the request is a clock-in attempt.
// It will register the event in the database and answer
// with a successful status
function clockIn(req, res, next) {
  res.send({ token: req.cookies.token  })
}

// Login attempt, using passport. If authentication succeeds, generate JWT token
// and send it as a cookie, which will grant authorization for future requests
app.post('/login', passport.authenticate('ldapauth', {session: false}), (req, res) => {
  var privateKey = fs.readFileSync('jwtRS256.key');
  res.cookie('token', jwt.sign({ user: 'user' }, privateKey, { algorithm: 'RS256', expiresIn: '1h' })).send({ status: 'logged' });
});

// A request is attempting to clock-in/out, verify if it has logged first
// and redirect to corresponding function
app.post('/clock', function(req, res, next) {
  var publicKey = fs.readFileSync('jwtRS256.key.pub');
  try {
    var decoded = jwt.verify(req.cookies.token, publicKey, { algorithms: ['RS256'] });
    // TODO: check last clock type and store new clock, return success?    
    clockIn(req, res, next);
  } catch(err) {
    res.status(403).end(); 
  }
});

// At this point, no other route has been matched so we assume 404
app.use(function(req, res, next){
  res.status(404).send({ status: 'not found' });
});

// Port to listen on
app.listen(8080);
