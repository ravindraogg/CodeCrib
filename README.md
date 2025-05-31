<p align="center">
  <img src="./codecrib/src/assets/logo.png" alt="CodeCrib Logo" width="200"/>
</p>

# ✨ CodeCrib

**CodeCrib** is a real-time collaborative coding platform that bridges the gap between theoretical learning and practical coding. Designed for interview preparation, it offers structured problem sets, secure code sharing, and a smooth UI — all in one place!

---

## 📜 Table of Contents
- [About](#-about)
- [Problem Statement](#-problem-statement)
- [Objectives](#-objectives)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Modules](#-modules)
- [Setup Instructions](#-setup-instructions)
- [Folder Structure](#-folder-structure)
- [Results & Performance](#-results--performance)
- [Applications](#-applications)
- [Future Enhancements](#-future-enhancements)
- [License](#-license)

---

## 🔥 About

**CodeCrib** is a full-stack platform that allows:
- Categorized coding problem practice with progress tracking.
- Real-time collaborative editing for interviews or pair programming.
- Upload of code files for sharing and solving with peers.
- Seamless integration of UI/UX for improved learning flow.

Ideal for:
- Interview prep
- Coding bootcamps
- Live peer reviews
- DSA practice

---

## ❗ Problem Statement

Aspiring developers often lack access to a beginner-friendly and structured platform that supports real-time practice, progress tracking, and interview-level coding problems — all in one place. Existing platforms are either paywalled, cluttered, or lack collaboration.

---

## 🎯 Objectives

- ✅ Structured coding problem sets categorized by difficulty.
- ✅ Real-time code collaboration using WebSockets.
- ✅ Secure authentication & user sessions.
- ✅ Admin-level problem management and uploads.
- ✅ Intuitive UI for smooth coding workflows.
- ✅ Beginner-focused, free-to-use experience.

---

## 🛠️ Tech Stack

| Frontend         | Backend             | Realtime           | Storage / Database      |
|------------------|----------------------|--------------------|--------------------------|
| React.js + TypeScript | Node.js + Express.js | Socket.IO          | MongoDB (NoSQL)          |
| Vite + CSS | Multer (file uploads) | WebSocket Protocol | Local Disk for files     |
| CodeMirror / Monaco | CORS Middleware | Room Events | Memory & DB Storage       |

---

## 🧠 System Architecture

- **Frontend**: Built with React + Vite + TypeScript. Handles the UI, problem display, authentication, and WebSocket sync.
- **Backend**: Node.js + Express with REST APIs for problems, users, and submissions. Handles Multer uploads and room sync.
- **Database**: MongoDB to store user data, problem sets, and submissions.
- **Real-Time Engine**: Socket.IO enables collaborative editing via WebSocket connections.
![diagram-export-5-15-2025-9_28_33-PM](https://github.com/user-attachments/assets/446d9823-c5ee-484e-aba8-b10f7fde0efc)

---

## 🧩 Modules

### 1. **User Interface**
- Responsive interface for problems, dashboard, login/signup.
- Dynamic rendering of problems and editors.

### 2. **Authentication**
- Secure login/signup.
- JWT or session-based auth.
- CORS-protected routes.

### 3. **Problem Management**
- Admin APIs for creating/editing problems.
- Metadata includes title, description, sample I/O, difficulty.

### 4. **Solution & Evaluation**
- Submit solutions with metadata.
- Track submission history and status.

### 5. **Collaboration**
- Live typing and sync across multiple users in a room.
- WebSocket-driven updates.

### 6. **File Upload**
- Accepts only `.js`, `.py`, `.cpp`, `.txt`, etc.
- Validates max 20MB size, rejects folders/ZIPs.

### 7. **Progress Tracking**
- Monitor attempted/solved problems.
- Display analytics, streaks, and category stats.

---

## 🚀 Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ravindraogg/codecrib.git
   cd codecrib

2. **Frontend Installation:**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Backend Installation:**

   ```bash
   cd backend
   npm install
   npm run start
   ```

4. **Environment Variables:**
   Create a `.env` in `backend/`:

   ```bash
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   ```

5. **Run the app locally:**
   Visit `http://localhost:5173`

---

## 📁 Folder Structure

```
/frontend
    /src
        /components
        /pages
    index.html
    vite.config.js

/backend
    /file
    /uploads
    server.js
```

---

## 📊 Results & Performance

* ⚡ UI loads under 1.5s due to Vite optimization.
* 🚀 API latency: \~150ms avg response time.
* 🔄 Real-time sync: latency < 100ms.
* 📁 Upload handling & DB queries show minimal lag.

---

## 💡 Applications

* 👨‍🎓 Students: Learn and practice for placements.
* 🧑‍🏫 Trainers: Conduct collaborative sessions.
* 🧪 Bootcamps: Teach DSA live and track progress.
* 👥 Peer Coding: Improve logic with real-time feedback.
* 🧩 Practice Arena: Sharpen DSA skills with others.

---

## 🧭 Future Enhancements

* 💬 Live code execution and output testing.
* 🌐 Multilingual coding support (Python, Java, etc.).
* 📈 Analytics dashboard for user growth.
* 🏆 Leaderboards, streaks, gamification.
* 📱 Mobile App for Android/iOS.
* 📹 Voice & Video Chat, session recordings.
* ☁️ Cloud-based deployment with scalability.

---
## 👨‍💻 Contributors

| Name          | GitHub Profile                      | Image |
|---------------|--------------------------------------|--------|
| **Ravindra S** | [ravindraog](https://github.com/ravindraog) | <img src="https://avatars.githubusercontent.com/u/149950829?s=400&u=1988b4718b3d5d96d2bde79fe24333508a10d0c9&v=4" width="80" height="80" style="border-radius:50%"/> |
| **Nitesh**     | [PanatiNitesh](https://github.com/PanatiNitesh) | <img src="https://avatars.githubusercontent.com/u/134051960?v=4" width="80" height="80" style="border-radius:50%"/> |
| **Masood**     | _Masood_ | <img src="https://instagram.fblr1-8.fna.fbcdn.net/v/t51.2885-19/499131789_17908172475149185_751939665111374926_n.jpg?stp=dst-jpg_s150x150_tt6&_nc_ht=instagram.fblr1-8.fna.fbcdn.net&_nc_cat=101&_nc_oc=Q6cZ2QHXvXha2IXWQHEfxBPkp0eFZZE3vDVmtworw13_v5BKErnC27cGov1NFdOTfACrQEQ5NsNAI3LoCdUsU0jm-Xbp&_nc_ohc=9rqBfTlwA_EQ7kNvwEHbcwZ&_nc_gid=TymtnahDiFDo-UPBItTYZQ&edm=ALGbJPMBAAAA&ccb=7-5&oh=00_AfIMz_IYL8pfvUgVfmYkZDmqcfJFUFtNO4nlySWbiXUwCg&oe=68407AAF&_nc_sid=7d3ac5" width="80" height="80" style="border-radius:50%"/> |
| **Vedanth**    | _Vedanth_ | <img src="https://avatars.githubusercontent.com/u/424443?v=4" width="80" height="80" style="border-radius:50%"/> |

## 📄 License

This project is licensed under the **MIT License**.

---

## 🔖 Badges

![GitHub Repo stars](https://img.shields.io/github/stars/ravindraogg/codecrib?style=social)
![GitHub forks](https://img.shields.io/github/forks/ravindraogg/codecrib?style=social)
![GitHub issues](https://img.shields.io/github/issues/ravindraogg/codecrib)
![GitHub license](https://img.shields.io/github/license/ravindraogg/codecrib)

---
