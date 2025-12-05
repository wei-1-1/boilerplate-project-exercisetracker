const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const { connectDB, checkOrCreateCollection, checkOrCreateUser, getAllUsers, addExerciseRecord, getRecords,getRecordsWithLimits} = require("./db")

app.use(express.json())
//标准 HTML 表单提交 application/x-www-form-urlencoded，需要中间件解析才能挂载到 req.body 上
app.use(express.urlencoded({ extended: true }))

app.post("/api/users", async (req, res) => {
  try {
    if (!req.body.username || req.body.username.trim() === "") {
      res.status(400).json({ error: "Username is required" })
      return
    }
    const _id = await checkOrCreateUser(req.body.username)
    res.json({ _id: _id, username: req.body.username })
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: "Failed to create or retrieve user" })
  }
})


app.get("/api/users", async (req, res) => {
  try {
    const users = await getAllUsers()
    res.json(users)
    return
  }catch(err) {
    console.log(err)
    res.status(500).json({ error: "Failed to retrieve users" })
  }
})

app.post("/api/users/:_id/exercises", async (req, res) => {
  let _id = req.params._id
  let { description, duration, date } = req.body

  if (date === undefined || date === "") {
    date = new Date().toISOString().substring(0, 10)
  }

  try {
    const record = await addExerciseRecord(_id, description, duration, date)
    res.json(record)
    return
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: "Failed to add exercise record" })
  }
})

app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    let _id = req.params._id
    let { from, to, limit } = req.query
    //console.log(from, to, limit)
    let result
    if(from||to||limit){
      result = await getRecordsWithLimits(_id, from, to, limit)
    }else{
      result = await getRecords(_id)
    }
    res.json(result)
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: "Failed to retrieve exercise logs" })
  }
})



async function startServer() {
  try {
    await connectDB();
    await checkOrCreateCollection("users-exercises");
    app.listen(process.env.PORT || 3000, () => {
      console.log('Your app is listening on port ' + (process.env.PORT || 3000))
    });
  } catch (e) {
    console.error("Failed to start server:", e);
    process.exit(1);
  }
}
startServer();
