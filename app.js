const express = require('express');
const path = require('path');
const app = express();
const session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('passport');
const { link } = require('fs');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();
const PORT = process.env.PORT || 4000;




app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


app.use(session({
  secret: 'yourSecretKey',       // Replace with a secure, random secret key in production
  resave: false,                 // Avoid resaving session if unmodified
  saveUninitialized: false,      // Only save sessions when a user is authenticated
  cookie: { secure: false, sameSite: 'lax' }      // Set to true if using HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());  // Make sure it's included

app.use(express.static(path.join(__dirname, 'public')));


passport.use(new GoogleStrategy({
  clientID: "624864617872-13un0uue38d4do7srnu7ccht0qv2jokk.apps.googleusercontent.com",
  clientSecret: "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",
  callbackURL: "http://portfolio.play.alldreamscometrue.store/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});


app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
      req.session.user = req.user.displayName;
      req.session.save((err) => {  // Explicitly save session
        if (err) console.error(err);
        res.redirect('/dashboard');
      });
    });
  

app.get('/login', (req, res) => {
  res.send(`
    <h2>Login</h2>
    <form method="post" action="/login">
      <input type="text" name="username" placeholder="Username" required/><br/>
      <input type="password" name="password" placeholder="Password" required/><br/>
      <button type="submit">Login</button>
      <a href="/auth/google">Login with Google</a>
      <a href="/resume">Continue as Guest</a>
    </form>
  `);
});

function isAuthenticated(req, res, next) {
  console.log(req.session.user);
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
}

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'password') {
    req.session.user = username;  // Save user info in session
    res.redirect('/resume');
  } else {
    res.send('Invalid credentials. <a href="/login">Try again</a>');
  }
});

app.get('/dashboard', isAuthenticated, (req, res) => {
  console.log(req.session.user);
  res.render('pages/dashboard', { user: req.session.user });
});



// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

let projects = [
  { name: 'Neuro Nuggets – Trivia Game', image: 'neuronuggets.png', overview: 'Neuro Nuggets is an interactive trivia game designed to challenge users.', features: {'Interactive Interface': 'Developed using HTML, CSS, and JavaScript, the game offers a user-friendly interface with intuitive navigation, ensuring an engaging experience for users of all ages.', 'Responsive Design': 'Ensures optimal gameplay experience across devices by utilizing media queries and flexible layouts, allowing users to enjoy the game on desktops, tablets, and smartphones.', 'Backend Integration': 'Employed Python Flask to connect the frontend with game logic, enabling dynamic question loading and real-time score tracking. This integration ensures a smooth and responsive gaming experience.', 'User Engagement': 'Incorporated visual feedback and interactive elements, such as animations and sound effects, to enhance user interaction and retention, making the game more immersive and enjoyable.'}, technologies: 'Frontend: HTML, CSS, JavaScript; Backend: Python Flask; Version Control: Git, GitHub.', link: 'https://github.com/ShubeeOro/Neuro-Nuggets' },
  { name: 'PocketPal – Personal Finance App Prototype.', image: 'pocketpal.png', overview: 'PocketPal is a personal finance application prototype aimed at simplifying expense and budget management. This project highlights my proficiency in UI/UX design, user research, and collaborative development processes.', features: {'High-Fidelity Prototypes': 'Designed interactive prototypes using Figma, focusing on user-friendly navigation and intuitive interfaces. The prototypes include features such as budget tracking, expense categorization, and financial goal setting.', 'Consistent Visual Design': 'Established a cohesive visual language with consistent icons, color schemes, and typography to enhance user experience. The design emphasizes clarity and ease of use, ensuring users can navigate the app effortlessly.', 'User-Centric Design': 'Conducted user research to understand target audience needs, leading to design iterations that improved usability. Feedback from potential users was incorporated to refine features and enhance overall satisfaction.', 'Collaborative Development': 'Worked closely with developers to translate design specifications into functional features, including budgeting tools and transaction logs. This collaboration ensured that the final product met both design and technical requirements.'}, technologies: 'Design Tools: Figma; Version Control: Git, GitHub.', link: 'https://www.figma.com/files/team/1462182982580367130/recents-and-sharing?fuid=1462182035383387331' }
];


app.get('/projects', (req, res) => {
  res.render('pages/projects', { projects, user: req.session.user });
});

app.post('/projects/edit/:index', isAuthenticated, (req, res) => {
  const index = req.params.index;
  const { name, image, overview, features, technologies, link } = req.body;

  // Parse features into an object
  const featuresObj = features.split('.,').reduce((acc, feature) => {
    const [key, ...valueParts] = feature.split(':');  // Split only at the first colon
    const value = valueParts.join(':').trim();  // Join the remaining parts in case there are additional colons
    acc[key.trim()] = value;
    return acc;
}, {});
  // Update the project in the array
  projects[index] = {
    name,
    image,
    overview,
    features: featuresObj,
    technologies,
    link
  };


  res.redirect('/projects'); // Redirect to the projects page after editing
});

app.post('/projects/delete/:index', isAuthenticated, (req, res) => {
  const index = req.params.index;

  // Remove the project from the array
  projects.splice(index, 1);

  res.redirect('/projects'); // Redirect to the projects page after deletion
});

app.post('/projects/new', isAuthenticated, (req, res) => {

  const { name, overview, features, technologies, link } = req.body;

  // Parse features into an object
  const featuresObject = features.split(',').reduce((acc, feature) => {
    const [key, value] = feature.split(':').map(str => str.trim());
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {});

  // Add the new project to the array
  const newProject = {
    name,
    overview,
    features: featuresObject,
    technologies,
    link
  };

  projects.push(newProject); // Add the new project to the projects array
  res.redirect('/projects'); // Redirect to the projects page after adding
});

app.get('/projects/edit/:index', isAuthenticated, (req, res) => {
  const index = req.params.index;
  const project = projects[index];
  res.render('pages/edit', { project, index, user: req.session.user });
});



app.get('/resume', (req, res) => {
  res.render('pages/resume', { user: req.session.user });
});

app.get('/logout', (req, res, next) => {
  // First logout Passport while session still exists
  req.logout(function(err) {
    if (err) { return next(err); }
    
    // Then destroy the session
    req.session.destroy(function(err) {
      if (err) { return next(err); }
      
      // Finally clear the cookie
      res.clearCookie('connect.sid');
      res.redirect('/login');
    });
  });
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
