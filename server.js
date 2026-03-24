const express = require('express');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(express.static('.'));

const DATA_FILE = './data.json';

// --- INITIAL DATA (Your Original "Fake" Data) ---
const getInitialData = () => ({
    users: [
        { id: 1, name: 'Harsh Gupta', email: 'student@demo.com', password: 'password123', college: 'Priyadarshini College of Engineering', year: '4th Year', branch: 'Information Technology', bio: 'A passionate programmer skilled in full-stack development.', skills: ['JavaScript', 'React', 'Node.js', 'Python'] },
        { id: 2, name: 'Priya S.', email: 'priya@demo.com', college: 'MIT World Peace University', year: 'Final Year', branch: 'Design', bio: 'Creative designer.', skills: ['Figma', 'UI/UX Design'] },
        { id: 3, name: 'Amit G.', email: 'amit@demo.com', college: 'COEP Technological University', year: 'Second Year', branch: 'Information Technology', bio: 'Competitive programmer.', skills: ['C++', 'DSA'] },
        { id: 4, name: 'Admin', email: 'admin@camp-link.com', password: 'adminpass', isAdmin: true },
    ],
    projects: [
        { id: 1, title: 'Logo Design for Tech Fest', postedBy: 2, category: 'Graphic Design', description: 'Looking for a creative designer for "Innovatech".', budget: 250, status: 'Open', skills: ['Logo Design', 'Illustrator'] },
        { id: 2, title: 'Proofread Final Year Thesis', postedBy: 3, category: 'Writing', description: '50-page thesis needs proofreading.', budget: 300, status: 'Open', skills: ['Proofreading'] },
        { id: 3, title: 'Build a Portfolio Website', postedBy: 2, category: 'Web Development', description: 'Simple responsive portfolio.', budget: 600, status: 'Hired', skills: ['HTML', 'CSS', 'JavaScript'] },
    ],
    services: [
        { id: 1, title: 'I will be your virtual C++ tutor', category: 'Tutoring', description: 'DSA tutoring 1-on-1.', budget: 800, postedBy: 3, skills: ['C++', 'DSA'] },
        { id: 2, title: 'I will create custom social media graphics', category: 'Graphic Design', description: 'Canva and Figma designs.', budget: 500, postedBy: 2, skills: ['Canva', 'Figma'] },
    ],
    proposals: [
        { id: 1, projectId: 3, proposerId: 1, bid: 5500, coverLetter: 'I can build this quickly.', status: 'Hired' }
    ]
});

// --- HELPER FUNCTIONS ---
const readData = () => {
    if (!fs.existsSync(DATA_FILE) || fs.readFileSync(DATA_FILE).length === 0) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(getInitialData(), null, 2));
    }
    return JSON.parse(fs.readFileSync(DATA_FILE));
};

const saveData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

// --- API ROUTES ---

// 1. Generic Getters
app.get('/api/projects', (req, res) => res.json(readData().projects));
app.get('/api/services', (req, res) => res.json(readData().services));
app.get('/api/users/:id', (req, res) => {
    const user = readData().users.find(u => u.id == req.params.id);
    res.json(user);
});
app.get('/api/proposals', (req, res) => res.json(readData().proposals));

// 2. Auth (Login)
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const users = readData().users;
    const user = users.find(u => u.email === email && (u.password === password || u.password === undefined)); // Simple check
    if (user) res.json(user);
    else res.status(401).json({ error: "Invalid credentials" });
});

// 3. Post New Items
app.post('/api/projects', (req, res) => {
    const data = readData();
    const newItem = { id: Date.now(), ...req.body, status: 'Open' };
    data.projects.unshift(newItem);
    saveData(data);
    res.json(newItem);
});

app.post('/api/services', (req, res) => {
    const data = readData();
    const newItem = { id: Date.now(), ...req.body };
    data.services.unshift(newItem);
    saveData(data);
    res.json(newItem);
});

app.post('/api/proposals', (req, res) => {
    const data = readData();
    const newProposal = { id: Date.now(), ...req.body, status: 'Submitted' };
    data.proposals.push(newProposal);
    saveData(data);
    res.json(newProposal);
});

// 4. Update/Edit (For Status change and Profile Edit)
app.put('/api/users/:id', (req, res) => {
    const data = readData();
    const index = data.users.findIndex(u => u.id == req.params.id);
    if (index !== -1) {
        data.users[index] = { ...data.users[index], ...req.body };
        saveData(data);
        res.json(data.users[index]);
    }
});

app.put('/api/hire', (req, res) => {
    const { proposalId, projectId } = req.body;
    const data = readData();
    
    // Update Proposal Status
    const propIndex = data.proposals.findIndex(p => p.id == proposalId);
    if (propIndex !== -1) data.proposals[propIndex].status = 'Hired';

    // Update Project Status
    const projIndex = data.projects.findIndex(p => p.id == projectId);
    if (projIndex !== -1) data.projects[projIndex].status = 'Hired';

    saveData(data);
    res.json({ success: true });
});

// 5. Admin Delete
app.delete('/api/:type/:id', (req, res) => {
    const { type, id } = req.params; // type is 'projects' or 'services'
    const data = readData();
    data[type] = data[type].filter(item => item.id != id);
    saveData(data);
    res.json({ success: true });
});

app.listen(3000, () => console.log('✅ Backend Ready at http://localhost:3000'));