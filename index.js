const express = require('express');
require('dotenv').config();

const saltRounds = 12;
const bcrypt = require('bcrypt');
const app = express();
const port = process.env.PORT || 3000;
const Joi = require("joi");

app.use(express.urlencoded({extended: false}));

const userCollection = database.db(mongodb_database).collection('users');
//secret info section
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;



//1
//we want a homepage with a sign up and login
//not logged in = sign up / log in option
//logged in = hello "name"
// go to members area / logout options
app.get('/', (req, res) => {
    var html = `
        <form action='/signup' method='post'>
            <button>Sign up</button>
        </form>
        <form action='/login' method='post'>
        <button>Login</button>
        </form>
    `
    res.send(html);
    ;
});
//another post for the root diretory
app.post('/', (req, res) => {
    var html = `
            <form action='/signup' method='post'>
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
app.get('/signup', (req, res) => {
    var missingName =  req.query.missingName;
    var missingEmail =  req.query.missingEmail;
    var missingPassword =  req.query.missingPassword;

    var html = `
        create user <br>
        
        <form action='/submitUser' method='post'>
        name:
            <input name='name' type='text' placeholder='Name'>
         <br> email address: 
            <input name='email' type='email' placeholder='Email'>
            <br> password:
            <input name='password' type='password' placeholder='Password'>
            <br>
            <button>Submit</button>
        </form>
    `;
    if (missingName){
        html += "<br> name is required";
    }
    if (missingEmail){
        html += "<br> email is required";
    }
    if (missingPassword){
        html += "<br> password is required";
    }

    res.send(html);
});

//the submit one
app.post('/submit', (req,res) => {
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
    Hello, Ben!
    <form action='/members' method='post'>
        <button>Go to members area!</button>
    </form>
    <form action='/' method='post'>
    <button>Logout</button>
    </form>
`
    res.send(html);
});
//other login, ignore that shit
app.get('/login', (req, res) => {
    var html = `
    Hello, Ben!
    <form action='/members' method='post'>
        <button>Go to members area!</button>
    </form>
    <form action='/' method='post'>
    <button>Logout</button>
    </form>
`
    res.send(html);
});
//add user to database
app.post('/submitUser', async (req,res) => {
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;

	const schema = Joi.object(
		{
			name: Joi.string().alphanum().max(20).required(),
            email: Joi.string().max(200).required(),
			password: Joi.string().max(20).required()
		});
	
	const validationResult = schema.validate({name,email, password});
	if (validationResult.error != null) {
	   console.log(validationResult.error);
	   res.redirect("/signup");
	   return;
   }

    var hashedPassword = await bcrypt.hash(password, saltRounds);
	
	await userCollection.insertOne({name: name, email : email, password: hashedPassword});
	console.log("Inserted user");

    var html = "successfully created user";
    res.send(html);
});
//contact
app.get('/contact', (req,res) => {
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
//members
app.post('/members', (req, res) => {
    var html = `bruh members`
    res.send(html);
});

app.listen(port, () => {
    console.log(`server is running on port ${port}`);

})


