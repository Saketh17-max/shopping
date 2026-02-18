require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const session = require("express-session");

const db = require("./firebase");

const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
    secret: "supersecret",
    resave: false,
    saveUninitialized: false
}));

// Middleware
function isAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect("/login");
    }
}

// Home
app.get("/", (req, res) => {
    res.redirect("/login");
});

// Signup Page
app.get("/signup", (req, res) => {
    res.render("signup");
});

// Signup Logic
app.post("/signup", async (req, res) => {
    const { email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.collection("users").add({
        email: email,
        password: hashedPassword
    });

    res.redirect("/login");
});

// Login Page
app.get("/login", (req, res) => {
    res.render("login");
});

// Login Logic
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const snapshot = await db.collection("users")
        .where("email", "==", email)
        .get();

    if (snapshot.empty) {
        return res.send("User not found");
    }

    let userData;
    snapshot.forEach(doc => {
        userData = doc.data();
    });

    const isMatch = await bcrypt.compare(password, userData.password);

    if (!isMatch) {
        return res.send("Wrong Password");
    }

    req.session.user = email;
    res.redirect("/dashboard");
});

// Dashboard
app.get("/dashboard", isAuth, async (req, res) => {

    const snapshot = await db.collection("tasks")
        .where("user", "==", req.session.user)
        .get();

    let tasks = [];

    snapshot.forEach(doc => {
        tasks.push(doc.data());
    });

    res.render("dashboard", {
        user: req.session.user,
        tasks
    });
});

// Add Task
app.post("/add-task", isAuth, async (req, res) => {
    const { task, expense } = req.body;

    await db.collection("tasks").add({
        user: req.session.user,
        task: task,
        expense: Number(expense),
        date: new Date()
    });

    res.redirect("/dashboard");
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
