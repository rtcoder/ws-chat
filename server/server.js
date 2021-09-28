const express = require('express');
const {MongoClient, ObjectId} = require('mongodb');
const app = express();
const cors = require('cors');

const mongoUrl = "mongodb://localhost:27017/";
const DB_NAME = 'local';
app.use(cors());
app.use(express.urlencoded({extended: false}));
app.use(express.json());

const messagesCollection = (fn) => {
    MongoClient.connect(mongoUrl, (err, db) => {
        if (err) throw err;
        const dbo = db.db(DB_NAME);
        const collection = dbo.collection("messages");
        fn(db, collection);
    });
}

app.get('/messages/:id', (request, respond) => {
    const {id} = request.params
    messagesCollection((db, collection) => {
        collection.findOne({_id: new ObjectId(id)}, (err, result) => {
            if (err) throw err;
            db.close();
            respond.send(result)
        });
    });
});
app.get('/messages', (request, respond) => {
    const queryParams = {};
    Object.keys(request.query).forEach(key => {
        const value = request.query[key];
        if (!isNaN(Number(value))) {
            queryParams[key] = +value;
        } else if (['true', 'false'].includes(value)) {
            queryParams[key] = value === 'true';
        } else {
            queryParams[key] = value;
        }
    })
    messagesCollection((db, collection) => {
        collection.find({...queryParams})
            .sort({_id: -1})
            .toArray((err, result) => {
                if (err) throw err;
                db.close();
                respond.send(result)
            });
    });
});
app.post('/messages', (request, respond) => {
    const {name, deleted, completed} = request.body;
    messagesCollection((db, collection) => {
        collection.insertOne({name, deleted, completed}, (err, result) => {
            if (err) throw err;
            db.close();
            respond.send(result)
        });
    });
});
// app.get('*', (request, respond) => {
//     respond.status(404).send(null)
// });
app.get('*', (request, respond) => {
    respond.send('d')
});

app.listen(8000, () => {
    console.log('Server started and is listening on port 8000')
});
