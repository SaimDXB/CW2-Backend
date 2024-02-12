const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = 'mongodb+srv://saimdxb:saimthelegend2121921@cluster0.y7a4trv.mongodb.net/AfterSchoolActivities'; // Update with your MongoDB Atlas connection string
const AWS_URL = 'http://ed21test-env.eba-f3k3idms.eu-west-2.elasticbeanstalk.com'; // AWS Elastic Beanstalk URL
const client = new MongoClient(MONGODB_URI);

app.use(cors());
app.use(express.json());

// Serve static files based on environment
if (process.env.NODE_ENV === 'production') {
    // Serve static files from the public directory on AWS
    app.use(express.static(path.join(__dirname, 'public')));
} else {
    // Serve static files from the VueApp110 directory on localhost:3000
    app.use(express.static(path.join(__dirname, '..', 'VueApp110')));
}

// Serve index.html for the root URL and all other routes
app.get('/', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        // Serve index.html from the public directory on AWS
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        // Serve index.html from the VueApp110 directory on localhost:3000
        res.sendFile(path.join(__dirname, '..', 'VueApp110', 'index.html'));
    }
});

// Serve lessons.js file
app.get('/lessons.js', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        // Serve lessons.js from the public directory on AWS
        res.sendFile(path.join(__dirname, 'public', 'lessons.js'));
    } else {
        // Serve lessons.js from the VueApp110 directory on localhost:3000
        res.sendFile(path.join(__dirname, '..', 'VueApp110', 'lessons.js'));
    }
});

async function main() {
    try {
        await client.connect();
        console.log('Connected to MongoDB Atlas');
        const database = client.db('AfterSchoolActivities');

        // Define a route to get all lessons with search functionality
        app.get('/api/lessons', async (req, res) => {
            try {
                let query = {}; // Initialize an empty query
                if (req.query.q) {
                    query = {
                        $or: [
                            { subject: { $regex: req.query.q, $options: 'i' } },
                            { location: { $regex: req.query.q, $options: 'i' } }
                        ]
                    };
                }
                // Use the constructed query to find lessons
                const lessons = await database.collection('lessons').find(query).toArray();
                res.json(lessons);
            } catch (error) {
                console.error('Error retrieving lessons:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        // Define a route to get a lesson by ID
        app.get('/api/lessons/:lessonId', async (req, res) => {
            try {
                const lessonId = req.params.lessonId;
                const lesson = await database.collection('lessons').findOne({ _id: new ObjectId(lessonId) });
                if (!lesson) {
                    res.status(404).json({ error: 'Lesson not found' });
                    return;
                }
                res.json(lesson);
            } catch (error) {
                console.error('Error retrieving lesson:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        // Define a route to update lesson spaces when adding to cart
        app.post('/api/orders/place', async (req, res) => {
            try {
                const { name, phone, lessonIds } = req.body;

                const lessons = await database.collection('lessons').find({ _id: { $in: lessonIds.map(id => new ObjectId(id)) } }).toArray();

                const enoughSpaces = lessons.every(lesson => lesson.spaces > 0);
                if (!enoughSpaces) {
                    res.status(400).json({ error: 'Not enough spaces available for one or more lessons' });
                    return;
                }

                await Promise.all(lessonIds.map(async lessonId => {
                    await database.collection('lessons').updateOne(
                        { _id: new ObjectId(lessonId), spaces: { $gt: 0 } },
                        { $inc: { spaces: -1 } }
                    );
                }));

                const result = await database.collection('orders').insertOne({
                    name,
                    phone,
                    lessonIds,
                    spaces: lessonIds.length,
                    subjects: lessons.map(lesson => lesson.subject)
                });

                res.status(201).json({ message: 'Order placed successfully', orderId: result.insertedId });
            } catch (error) {
                console.error('Error placing order:', error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });

        // Define a route to update lesson spaces
        app.put('/api/lessons/:lessonId', async (req, res) => {
            try {
                const lessonId = req.params.lessonId;
                const { spaces } = req.body;

                if (!spaces || typeof spaces !== 'number') {
                    res.status(400).json({ error: 'Invalid spaces value' });
                    return;
                }

                await database.collection('lessons').updateOne(
                    { _id: new ObjectId(lessonId) },
                    { $set: { spaces: spaces } }
                );

                res.status(200).json({ message: 'Lesson spaces updated successfully' });
            } catch (error) {
                console.error('Error updating lesson spaces:', error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });

        // Define a route to get all orders
        app.get('/api/orders', async (req, res) => {
            try {
                const orders = await database.collection('orders').find({}).toArray();
                res.json(orders);
            } catch (error) {
                console.error('Error retrieving orders:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Error connecting to MongoDB Atlas:', error);
    }
}

main();
