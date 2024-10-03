const express = require('express');
const oracledb = require('oracledb');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const session = require('express-session');

const app = express();
const port = 3000;

// Middleware to parse JSON and form-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Session management middleware
app.use(session({
    secret: 'my-secret-key', // Replace with a secure key
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Oracle DB connection details
const dbConfig = {
    user: 'SYSTEM',
    password: 'JANMEJAYA7326', // Replace with environment variable for better security
    connectString: 'localhost:1521/XE'
};

// Route for handling signup
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).send('All fields are required');
    }

    try {
        let connection = await oracledb.getConnection(dbConfig);

        // Check if email already exists
        const emailCheckQuery = `SELECT COUNT(*) FROM users WHERE email = :email`;
        const emailCheckResult = await connection.execute(emailCheckQuery, [email]);

        if (emailCheckResult.rows[0][0] > 0) {
            res.status(400).send('Email already exists');
        } else {
            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user
            const query = `INSERT INTO users (ID, NAME, EMAIL, PASSWORD) 
                           VALUES (users_seq.NEXTVAL, :name, :email, :password)`;
            await connection.execute(query, [name, email, hashedPassword], { autoCommit: true });

            res.send('Success');
        }

        await connection.close();
    } catch (err) {
        console.error('Error during signup: ', err);
        res.status(500).send('Error during signup');
    }
});

// Route for handling login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('Email and password are required');
    }

    try {
       
        let connection = await oracledb.getConnection(dbConfig);

        
        const query = `SELECT PASSWORD FROM users WHERE email = :email`;
        const result = await connection.execute(query, [email]);

       
        if (result.rows.length > 0) {
            const hashedPassword = result.rows[0][0];
            
            const passwordMatch = await bcrypt.compare(password, hashedPassword);
            

            if (passwordMatch) {
                req.session.loggedIn = true; // Set login status
                req.session.userEmail = email; // Optionally store user email in session
                console.log("Login successful, session loggedIn:", req.session.loggedIn);
                res.send('Success');
            } else {
                console.log('Invalid password');
                res.status(401).send('Invalid email or password');
            }
        } else {
            console.log('Email not found in database');
            res.status(401).send('Invalid email or password');
        }

        await connection.close();
    } catch (err) {
        console.error('Error during login: ', err);
        res.status(500).send('Error during login');
    }
});


// Route for handling event creation
app.post('/create-event', async (req, res) => {
    const { title, organization_name, event_date, event_time, location, ticket_price } = req.body;

    // Check if all fields are provided
    if (!title || !organization_name || !event_date || !event_time || !location || !ticket_price) {
        return res.status(400).send('All fields are required');
    }

    try {
        let connection = await oracledb.getConnection(dbConfig);

        const query = `INSERT INTO events (ID, TITLE, ORGANIZATION_NAME, EVENT_DATE, EVENT_TIME, LOCATION, TICKET_PRICE) 
                       VALUES (events_seq.NEXTVAL, :title, :organization_name, TO_DATE(:event_date, 'YYYY-MM-DD'), 
                       :event_time, :location, :ticket_price)`;
        await connection.execute(query, [title, organization_name, event_date, event_time, location, ticket_price], { autoCommit: true });

        res.send('Event created successfully');

        await connection.close();
    } catch (err) {
        console.error('Error creating event: ', err);
        res.status(500).send('Error creating event');
    }
});


app.get('/events', async (req, res) => {
    try {

        const connection = await oracledb.getConnection({
            user: 'SYSTEM',
            password: 'JANMEJAYA7326', // Replace with environment variable for better security
            connectString: 'localhost:1521/XE'
        });

        const result = await connection.execute(`
            SELECT 
                ID,
                TITLE, 
                ORGANIZATION_NAME, 
                TO_CHAR(EVENT_DATE, 'YYYY-MM-DD') AS EVENT_DATE,
                LOCATION
            FROM events
        `);

        // No special handling needed for VARCHAR2
        const events = result.rows.map(row => ({
            id:row[0],
            title: row[1],
            organization_name: row[2],  // Directly read as string
            event_date: row[3],
            location: row[4]
        }));

        res.json(events);  // Send as JSON

        await connection.close();
    } catch (error) {
        console.error("Error fetching events: ", error);
        res.status(500).send("Error fetching events");
    }
});

// Route for handling event bookings
app.post('/book-event', async (req, res) => {
    const { name, mobile, transactionId, eventId } = req.body;

    // Validate input
    if (!name || !mobile || !transactionId || !eventId) {
        return res.status(400).send('All fields are required');
    }

    // Optional: Validate mobile number pattern
    const mobilePattern = /^[0-9]{10}$/;
    if (!mobilePattern.test(mobile)) {
        return res.status(400).send('Invalid mobile number format');
    }

    try {
        // Establish a connection to the Oracle DB
        let connection = await oracledb.getConnection(dbConfig);

        // Insert the booking into the bookings table
        const insertQuery = `
            INSERT INTO bookings (name, mobile, transaction_id, event_id)
            VALUES (:name, :mobile, :transactionId, :eventId)
        `;

        await connection.execute(insertQuery, {
            name,
            mobile,
            transactionId,
            eventId: parseInt(eventId, 10) // Ensure eventId is a number
        }, { autoCommit: true });

        // Close the connection
        await connection.close();

        res.status(201).send('Booking successful');
    } catch (err) {
        console.error('Error during booking:', err);

        // Handle unique constraint violation for transaction_id
        if (err.errorNum === 1) { // ORA-00001: unique constraint violated
            return res.status(400).send('Transaction ID already exists');
        }

        res.status(500).send('Error booking the event');
    }
});


// Search events endpoint
app.get('/search-events', async (req, res) => {
    const query = req.query.query;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        const connection = await oracledb.getConnection(dbConfig);

        // Case-insensitive search for TITLE
        const sql = `
            SELECT TITLE, ORGANIZATION_NAME, LOCATION,TO_CHAR(EVENT_DATE, 'YYYY-MM-DD') AS EVENT_DATE, TICKET_PRICE
            FROM EVENTS
            WHERE LOWER(TITLE) LIKE LOWER(:query)
        `;

        // Using parameter binding to safely pass the query with wildcards
        const result = await connection.execute(sql, { query: `%${query}%` });

        await connection.close();

        // Send the results back to the client
        res.json(result.rows.map(row => ({
            title: row[0], // TITLE is the first column
            organization_name: row[1], // ORGANIZATION_NAME is the second column
            location: row[2], // LOCATION is the third column
            event_date: row[3],
            ticket_price: row[4] // TICKET_PRICE is the fourth column
        })));
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route for handling contact form submission
app.post('/submit-contact-form', async (req, res) => {
    const { name, surname, email, message } = req.body;

    if (!name || !surname || !email || !message) {
        return res.status(400).send('All fields are required');
    }

    try {
        let connection = await oracledb.getConnection(dbConfig);

        // Insert form data into the database
        const query = `INSERT INTO contact_messages (ID, NAME, SURNAME, EMAIL, MESSAGE) 
                       VALUES (contact_messages_seq.NEXTVAL, :name, :surname, :email, :message)`;

        await connection.execute(query, [name, surname, email, message], { autoCommit: true });

        res.send('Success');
        await connection.close();
    } catch (err) {
        console.error('Error submitting contact form: ', err);
        res.status(500).send('Error submitting contact form');
    }
});


// Route to get event and booking details with a join on events and bookings tables
app.get('/event-booking-details', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);

        // SQL query to join events and bookings tables, including event_date
        const result = await connection.execute(`
            SELECT 
                e.ID, 
                e.TITLE, 
                e.ORGANIZATION_NAME, 
                e.LOCATION, 
                TO_CHAR(e.EVENT_DATE, 'YYYY-MM-DD') AS EVENT_DATE, -- Format the event date
                b.NAME, 
                b.MOBILE
            FROM 
                events e
            JOIN 
                bookings b 
            ON 
                e.ID = b.EVENT_ID
        `);

        // Map the results into an object format, including event_date
        const eventBookingDetails = result.rows.map(row => ({
            eventId: row[0],
            title: row[1],
            organizationName: row[2],
            location: row[3],
            eventDate: row[4],  // Add event date
            bookingName: row[5],
            mobile: row[6]
        }));

        // Send the data as JSON response
        res.json(eventBookingDetails);

        // Close the connection
        await connection.close();
    } catch (error) {
        console.error('Error fetching event booking details:', error);
        res.status(500).send('Error fetching event booking details');
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
