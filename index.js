require('dotenv').config();

const saltRounds = 12;
const bcrypt = require('bcrypt');
const session = require('express-session');
const express = require('express');
const port = process.env.PORT || 3000;
const Joi = require("joi");


var { database } = require('./databaseConnection.js');

const app = express();
app.use(express.urlencoded({ extended: false }));
const MongoStore = require('connect-mongo');

const expireTime = 24 * 60 * 60 * 1000; //expires after 1 day  (hours * minutes * seconds * millis)


//secret info section
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;

const userCollection = database.db(mongodb_database).collection('users');

var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
    crypto: {
        secret: mongodb_session_secret
    }
})

//i be needing to create sessions n shit
// allows us to create sessions with cookies
app.use(session({
    secret: node_session_secret,
    store: mongoStore, //default is memory store 
    saveUninitialized: false,
    resave: true
}
));

//1
//we want a homepage with a sign up and login
//not logged in = sign up / log in option
//logged in = hello "name"
// go to members area / logout options
app.get('/', (req, res) => {
    var html = `
        <h1>Hello friend</h1>

        <button onclick="window.location.href='/signup'">Sign up</button>
        <form action='/login' method='post'>
        <button>Login</button>
        </form>
    `
    res.send(html);
    ;
});
//loggin get
app.get('/loggedin', (req, res) => {
    if (!req.session.authenticated) {
        res.redirect('/login');
    }
    var html = `
    You are logged in!
    </form>
    <form action='/members' method='get'>
    <button>Go to members page</button>
    </form>
    `;
    res.send(html);
});

//login post
app.post('/loggingin', async (req, res) => {
    var name = req.body.name;
    var password = req.body.password;

    //validate name
    const schema = Joi.string().max(20).required();
    const validationResult = schema.validate(name);
    if (validationResult.error != null) {
        console.log(validationResult.error);
        res.redirect("/login");
        return;
    }

    const result = await userCollection.find({ name: name }).project({ name: 1, password: 1, _id: 1 }).toArray();

    console.log(result);
    if (result.length != 1) {
        console.log("user not found");
        res.redirect("/login");
        return;
    }
    if (await bcrypt.compare(password, result[0].password)) {
        console.log("correct password");
        req.session.authenticated = true;
        req.session.name = name;
        req.session.email = email;
        req.session.cookie.maxAge = expireTime;

        res.redirect('/loggedIn');
        return;
    }
    else {
        console.log("incorrect password");
        res.redirect("/tryagain");
        return;
    }
});
//try again
app.get('/tryagain', (req, res) => {
    var html = `
    Incorrect password. <br>
    </form>
    <form action='/login' method='post'>
    <button>Try again</button>
    </form>
    `;
    res.send(html);
});
//another post for the root diretory
app.post('/', (req, res) => {
    var html = `
            <form action='/signup' method='get'>
                <button>Sign up</button>
            </form>
            <form action='/login' method='post'>
            <button>Login</button>
            </form>
        `
    res.send(html);
    ;
});

// sign up
// we now have to setup the post using method: get // yeah
// there will be a form with name, email and password // done
// the signup form will POST the form fields. // yeah
// must validate that all are filled, and are not empty // yeah
// if 3 fields are filled, add the user to your MongoDB, name email and bcrypted password //12:16 start 
// then create a session and send the user to /members page
// sign up
// pre much my create user  
app.get('/signup', (req,res) => {
    var html = `
        Signup 
        <form action='/submitUser' method='post'>
            <input name='name' type='text' placeholder='Name'>
            <br><input name='email' type='text' placeholder='Email'>
            <br><input name='password' type='password' placeholder='Password'>
            <br><button type='submit'>Sign up</button>
        </form>
    `;
    res.send(html);
});



//step 2 to validate the fields
app.post('/submitUser', async (req, res) => {
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;

    // Check if name, email, or password fields are empty
    if (!name) {
        var errorMessage = "Name is required.<br>";
        errorMessage += '<a href="/signup">Try again</a>'; 
        return res.send(errorMessage);
    }
    
    if (!email) {
        var errorMessage = "Email is required. <br>";
        errorMessage += '<a href="/signup">Try again</a>';
        return res.send(errorMessage);
    }

    if (!password) {
        var errorMessage = "Password is required. <br>";
        errorMessage += '<a href="/signup">Try again</a>'; 
        return res.send(errorMessage);
    }
    
    // Define validation schema with relaxed rules
    const schema = Joi.object({
        name: Joi.string().max(30).required(), 
        email: Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } }).required(), 
        password: Joi.string().min(3).max(50).required() 
    });

    const validationResult = schema.validate({ name: name, email: email, password: password });

// Handle validation errors
if (validationResult.error) {
    console.log(validationResult.error);
    var errorMessage = "Invalid input. Try again.";
    errorMessage += '<a href="/signup">Try again</a>';
    return res.send(errorMessage);
} else {
    // Encrpyt the mf
    var hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the user into the database
    await userCollection.insertOne({ name: name, email: email, password: hashedPassword });
    console.log("Inserted user");
    
    // Redirect to the "/members" page after successful signup
    req.session.authenticated = true;
    req.session.email = email;
    req.session.name = name;
    req.session.cookie.maxAge = expireTime;

    return res.redirect('/members');
}
});

//the submit one
app.post('/submit', (req, res) => {
    var email = req.body.email;
    var name = req.body.name;
    var password = req.body.password;

    if (!email) {
        res.redirect('/signup?missingEmail=1');
    }
    else if (!name) {
        res.redirect('/signup?missingName=1');
    }
    else if (!password) {
        res.redirect('/signup?missingPassword=1');
    } else {

        res.send("Thanks for signing up!");
    }
});

//log in
app.post('/login', (req, res) => {
    var html = `
    log in
    <form action='/loggingin' method='post'>
    <input name='name' type='text' placeholder='name'>
    <input name='password' type='password' placeholder='password'>
    <button>Submit</button>
    </form>
    `;
    res.send(html);
});
//add user to database
app.post('/submitUser', async (req, res) => {
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;

    const schema = Joi.object(
        {
            name: Joi.string().alphanum().max(20).required(),
            email: Joi.string().max(200).required(),
            password: Joi.string().max(20).required()
        });

    const validationResult = schema.validate({ name, email, password });
    if (validationResult.error != null) {
        console.log(validationResult.error);
        res.redirect("/signup");
        return;
    }

    var hashedPassword = await bcrypt.hash(password, saltRounds);

    await userCollection.insertOne({ name: name, email: email, password: hashedPassword });
    console.log("User added to database");

    // Redirect to the "/members" page after successful signup
    req.session.authenticated = true;
    req.session.email = email;
    req.session.name = name; // Store user's name in the session
    req.session.cookie.maxAge = expireTime;

    //return res.redirect('/members');


    var html = `successfully created user! <br>
    <button onclick="window.location.href='/members'">Go to members page</button>
    
    
    `;
    res.send(html);
});
//contact
app.get('/contact', (req, res) => {
    var missingEmail = req.query.missing;
    var html = `
        email address:
        <form action='/submitEmail' method='post'>
            <input name='email' type='text' placeholder='email'>
            <button>Submit</button>
        </form>
    `;
    if (missingEmail) {
        html += "<br> email is required";
    }
    res.send(html);
});
//logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    var html = `
    You are logged out. <br>
    <button onclick="window.location.href='/'">Back to Home</button>

    `;
    res.send(html);
});
//members
app.get('/members', (req, res) => {
    if (req.session.authenticated === false || req.session.authenticated === null || req.session.authenticated === undefined) {
        return res.redirect("/login");
    } else {
        const name = req.session.name;
        const randId = Math.floor(Math.random() * 2) + 1;

        const img = ['minion.png', 'minion2.png'];
        const randomImg = img[randId - 1];

        const html = `
            <h1>Hello, ${name}</h1>
            <img src="${randomImg}" style="width:250px;">
            <br>
            <button onclick="window.location.href='/logout'">Sign out</button>
        `;
        res.send(html);
    }
});

//imageees?
app.get('/members/:id', (req, res) => {

    var img = req.params.id;

    if (img == 1) {
        res.send("minion: <img src='/minion.png' style='width:250px;'>");
    }
    else if (img == 2) {
        res.send("minion: <img src='/minion2.png' style='width:250px;'>");
    }
    else {
        res.send("Invalid img id: " + img);
    }
});
app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
    res.status(404);
    res.send("Page not found - 404");
})


app.listen(port, () => {
    console.log(`server is running on port ${port}`);

})


