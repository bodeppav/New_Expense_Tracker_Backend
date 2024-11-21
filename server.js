const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const port = 5000;

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/expense-tracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log('Error connecting to MongoDB:', err));

// Define User Schema and Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);  // User collection

// User Registration Endpoint
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ username });
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create a new user
  const newUser = new User({
    username,
    password: hashedPassword,
  });

  try {
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error });
  }
});

// User Login Endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Find the user by username
  const user = await User.findOne({ username });
  if (!user) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  // Generate JWT token
  const token = jwt.sign({ userId: user._id, username: user.username }, 'secretKey', { expiresIn: '1h' });

  res.status(200).json({ message: 'Login successful', token });
});

// Expenses Schema and Model
const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  category: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // Link to the User
});

const Expense = mongoose.model('Expense', expenseSchema);

// Get all expenses
app.get('/expenses', (req, res) => {
  const userId = req.query.userId; // Get userId from query parameters
  console.log(userId);
  Expense.find({ userId }) // Fetch expenses for this user
    .then(expenses => res.status(200).json(expenses)) // Send expenses to frontend
    .catch(err => res.status(500).json({ error: 'Failed to fetch expenses' }));
});

// Add a new expense
app.post('/expenses', (req, res) => {
  const { title, amount, date, category } = req.body;
  const userId = req.body.userId;  // UserId from the request body

  const newExpense = new Expense({
    title,
    amount,
    date,
    category,
    userId  // Associate expense with the user
  });

  newExpense.save()
    .then((expense) => res.status(201).json(expense))
    .catch((error) => res.status(400).json({ message: 'Error adding expense', error }));
});

app.delete('/expenses/:id', (req, res) => {
  const expenseId = req.params.id; // Get the expense ID from URL parameters

  Expense.findByIdAndDelete(expenseId)  // Find and delete the expense by its ID
    .then((deletedExpense) => {
      if (!deletedExpense) {
        return res.status(404).json({ message: 'Expense not found' });  // Expense not found
      }
      res.status(200).json({ message: 'Expense deleted successfully', deletedExpense });  // Return success message and deleted expense
    })
    .catch((error) => {
      res.status(500).json({ message: 'Error deleting expense', error });
    });
});

app.put('/expenses/:id', (req, res) => {
  const expenseId = req.params.id; // Get the expense ID from URL parameters
  const { title, amount, date, category } = req.body; // Get the updated data from the request body

  // Find the expense by ID and update it with the new data
  Expense.findByIdAndUpdate(
    expenseId,  // The ID of the expense to be updated
    { title, amount, date, category },  // The new data for the expense
    { new: true }  // The `new` option ensures the updated document is returned
  )
  .then((updatedExpense) => {
    if (!updatedExpense) {
      return res.status(404).json({ message: 'Expense not found' });  // If the expense was not found
    }
    res.status(200).json({ message: 'Expense updated successfully', updatedExpense });  // Return the updated expense
  })
  .catch((error) => {
    res.status(500).json({ message: 'Error updating expense', error });
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
