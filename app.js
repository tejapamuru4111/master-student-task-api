const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require('cors');
const { json } = require("express");

const databasePath = path.join(__dirname, "sampleRegister.db");

const app = express();

let database = null;

app.use(cors({
  origin: "*",
}))

app.use(json())

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    // await database.run(`INSERT INTO calculation VALUES ('four(plus(nine()))', 13);`)
    app.listen(3011, () =>
      console.log("Server Running at http://localhost:3011/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();


function authenticateToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
}



app.post("/register/", async (request, response) => {
  const {id, firstname,lastname, username, password,  role } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE user_name = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);
  if (databaseUser !== undefined) {
    response.status(400);
    response.send("username already exist");
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertUserQuery = `INSERT INTO user VALUES('${id}','${firstname}','${lastname}','${username}', '${hashedPassword}', '${role}');`;
    await database.run(insertUserQuery);
    response.status(200);
    response.send("created user successfully");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  
  const selectUserQuery = `SELECT * FROM user WHERE user_name = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);
  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      const payload = {
        username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      const selectUserRoleQuery = `SELECT role FROM user WHERE user_name = '${username}';`;
      const databaseUserRole = await database.get(selectUserRoleQuery);
      response.status(200);
      response.send({ jwtToken,databaseUserRole });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.get("/", authenticateToken, async (request, response) => {
  let { username } = request;
  //console.log(username)
  const selectUserQuery = `SELECT * FROM user WHERE user_name = '${username}'`;
  const getCalculationsQuery = "SELECT * FROM calculation;"
  const userDetails = await database.get(selectUserQuery);
  const calculations = await database.all(getCalculationsQuery)
  //console.log(userDetails)
  response.send({userDetails, calculations});
});

app.post("/post/calculation/", async (request, response) => {
  const { exp, ans } = request.body;
  const postCalculationQuery = `INSERT INTO calculation VALUES ('${exp}', ${ans});`
  await database.run(postCalculationQuery)
  response.status(200)
  response.send("Success")
});

app.get("/get/calculation/", async (request, response) => {
  const getCalculationsQuery = "SELECT * FROM calculation;"
  const calculations = await database.all(getCalculationsQuery)
  //console.log(userDetails)
  response.send({calculations});
});



module.exports = app;
