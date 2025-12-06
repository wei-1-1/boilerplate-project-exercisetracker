
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://<your_mongodb_name>:<your_db_password>@learn.ikedqag.mongodb.net/?appName=Learn";
const { ObjectId } = require('mongodb');


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


let db

async function connectDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
        db = client.db("Learn")
    } catch (e) {
        console.error(e);
    }
}

async function checkOrCreateCollection(collectionName) {
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const collectionNames = collections.map(col => col.name);

    if (!collectionNames.includes(collectionName)) {
        await db.createCollection(collectionName);
        console.log(`Collection '${collectionName}' created.`);
    } else {
        console.log(`Collection '${collectionName}' already exists.`);
    }
}

async function checkOrCreateUser(username) {
    const usersCollection = db.collection("users-exercises");

    /* 
    //这个操作是读取、修改、写入三步走，理论上不是原子操作，可能会有并发问题
    let user = await usersCollection.findOne({username:username});
    let insertedId = user._id;
    if(!user){
        const result = await usersCollection.insertOne({username:username});
        console.log(`User '${username}' created with _id: ${result.insertedId}`);
        insertedId =  result.insertedId;
    }else {}
    return insertedId;
    */
    const result = await usersCollection.findOneAndUpdate(
        { username: username },
        { $setOnInsert: { log: [], count: 0 } },
        { upsert: true, returnDocument: 'after' }
    )

    // 很奇怪，直接以 result.value._id 访问会报错
    const userDocument = result.value || result;
    if (!userDocument) {
        throw new Error("Failed to create or retrieve user");
    }
    return userDocument._id;
}

async function addExerciseRecord(_id, description, duration, date) {
    const usersCollection = db.collection("users-exercises")

    // 问题前面注释掉的代码
    //另外，查询应该使用 ObjectId，因为我们传入的 _id 是字符串类型，并非 MongoDB 的 ObjectId 对象
    /*
    const user = await usersCollection.findOne({_id: _id});
    if(!user){
        throw new Error("User not found");
    }
    const exerciseRecord = {
        description: description,
        duration: parseInt(duration),
        date: new Date(date)
    };
    if(!user.log){
        user.log = [];
    }
    user.log.push(exerciseRecord);
    if(!user.count){
        user.count = 0;
    }
    user.count += 1;
    await usersCollection.updateOne(
        {_id: _id},
        {$set: {log: user.log, count: user.count}}
    );
    */

    let objectId;
    try {
        objectId = new ObjectId(_id);
    } catch (e) {
        throw new Error("Invalid user ID format");
    }

    const exerciseRecord = {
        description: description,
        duration: parseInt(duration),
        date: new Date(date)
    }
    const result = await usersCollection.findOneAndUpdate(
        { _id: objectId },
        {
            $push: { log: exerciseRecord },
            $inc: { count: 1 }
        },
        { returnDocument: 'after' }
    )

    const updateUser = result.value || result;
    if (!updateUser) {
        throw new Error("User not found");
    }
    return {
        _id: _id,
        username: updateUser.username,
        date: exerciseRecord.date.toDateString(),
        duration: exerciseRecord.duration,
        description: exerciseRecord.description
    };
}

async function getRecords(_id) {
    let objectId;
    try {
        objectId = new ObjectId(_id);
    } catch (e) {
        throw new Error("Invalid user ID format");
    }

    const usersCollection = db.collection("users-exercises");
    const result = await usersCollection.findOne({ _id: objectId });
    const queryedUser = result.value || result;
    if (!queryedUser) {
        throw new Error("User not found");
    }
    return {
        _id: _id,
        username: queryedUser.username,
        count: queryedUser.count,
        log: queryedUser.log.map(record => {
            return {
                description: record.description,
                duration: record.duration,
                date: record.date.toDateString()
            }
        })
    }
}

async function getRecordsWithLimits(_id, from, to, limit) {
    const allRecords = await getRecords(_id);
    let filteredLog = allRecords.log;
    //console.log("allRecords.log from query function:", allRecords.log);

    if (from) {
        const fromDate = new Date(from).getTime();
        //在保留了花括号的情况下没有 return 关键字，让我调试了好几次，🧠 离线了……
        filteredLog = filteredLog.filter(record => new Date(record.date).getTime() >= fromDate);
        //console.log("filteredLog after from filter:", filteredLog);
    }
    if (to) {
        const toDate = new Date(to).getTime();
        filteredLog = filteredLog.filter(record => new Date(record.date).getTime() <= toDate);
    }
    if (limit) {
        filteredLog = filteredLog.slice(0, parseInt(limit));
    }
    return {
        _id: allRecords._id,
        username: allRecords.username,
        count: filteredLog.length,
        log: filteredLog
    };
}

async function getAllUsers() {
    const usersCollection = db.collection("users-exercises");
    const users = await usersCollection.find({}, { projection: { _id: 1, username: 1 } }).toArray();
    return users;
}

module.exports = {
    connectDB,
    checkOrCreateCollection,
    checkOrCreateUser,
    getAllUsers,
    addExerciseRecord,
    getRecords,
    getRecordsWithLimits,
    getDB: () => db
};
