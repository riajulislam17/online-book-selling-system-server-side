const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const admin = require("firebase-admin");
const ObjectId = require('mongodb').ObjectId;

const app = express();
const port = process.env.PORT || 7000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
// const serviceAccount = require('./online-book-selling-system-firebase-adminsdk.json')
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lkuqr.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken (req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch { }
    }
    next();
}

async function run () {
    try {
        await client.connect();
        const database = client.db('onlineBookSellingSystem');
        const usersCollection = database.collection('users');
        const reviewCollection = database.collection('review');
        const booksCollection = database.collection('books');
        const orderCollection = database.collection('orders');

        // create users collection
        app.post('/users', async (req, res) => {
            const newUser = req.body;
            console.log(req.headers)
            const result = await usersCollection.insertOne(newUser);
            console.log(result)
            res.json(result);
        });

        // update user
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        // make admin
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    console.log(result)
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make admin' })
            }

        });

        // check admin
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })



        // create books collection
        app.post('/books', async (req, res) => {
            const newBook = req.body;
            const result = await booksCollection.insertOne(newBook);
            res.json(result);
        });


        // read books collection
        app.get('/books', async (req, res) => {
            const cursor = booksCollection.find({});
            const allBooks = await cursor.toArray();
            res.send(allBooks);
        });

        // read single book
        app.get('/books/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const query = { _id: ObjectId(id) };
            const result = await booksCollection.findOne(query);
            res.send(result);
        });

        // delete book
        app.delete('/books/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await booksCollection.deleteOne(query);
            res.json(result);
        });

        // update book
        app.put('/books/:id', async (req, res) => {
            const id = req.params.id;
            const updatedBook = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    title: updatedBook.title,
                    author: updatedBook.author,
                    publisher: updatedBook.publisher,
                    price: updatedBook.price,
                    description: updatedBook.description
                },
            };
            const result = await bookCollection.updateOne(filter, updateDoc, options);
            res.json(result)
        });

        // create order
        app.post('/order', async (req, res) => {
            const newOrder = req.body;
            const result = await orderCollection.insertOne(newOrder);
            console.log(result)
            res.json(result);
        });

        // read user order
        app.get('/user/order', async (req, res) => {
            const userEmail = req.query.userEmail;
            const query = { userEmail: userEmail };
            console.log(query)
            const cursor = orderCollection.find(query);
            const userOrder = await cursor.toArray();
            res.json(userOrder);
        });

        // read all order
        app.get('/order', async (req, res) => {
            const cursor = orderCollection.find({});
            const allOrder = await cursor.toArray();
            res.json(allOrder);
        });

        // delete user order
        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.json(result);
        });


        // create review
        app.post('/review', async (req, res) => {
            const newReview = req.body;
            const result = await reviewCollection.insertOne(newReview);
            console.log(result)
            res.json(result);
        });

        // read user review
        app.get('/user/review', async (req, res) => {
            const userEmail = req.query.userEmail;
            const query = { userEmail: userEmail };
            const cursor = reviewCollection.find(query);
            const userReview = await cursor.toArray();
            res.send(userReview);
        });

        // read all review
        app.get('/review', async (req, res) => {
            const cursor = reviewCollection.find({});
            const allReview = await cursor.toArray();
            res.json(allReview);
        });
    }

    finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Server Running');
});

app.listen(port, () => {
    console.log('Server is Running on Port:', port);
});