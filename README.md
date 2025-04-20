<p align="center">
  <img src="./codecrib/src/assets/logo.png" alt="CodeCrib Logo" width="200"/>
</p>

# ✨ CodeCrib

Welcome to **CodeCrib** — A real-time collaborative coding platform where developers can create private rooms, share code files (≤ 20MB), and collaborate seamlessly!

---

## 📜 Table of Contents
- [About](#-about)
- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Setup Instructions](#-setup-instructions)
- [Folder Structure](#-folder-structure)
- [Future Enhancements](#-future-enhancements)
- [License](#-license)

---

## 🔥 About

**CodeCrib** allows developers to:
- Create **private rooms**.
- **Upload individual code files** (only supported file types; no zips/folders).
- **Edit code** collaboratively with **real-time synchronization** across multiple users.

Ideal for **pair programming**, **interviews**, and **team projects**.

---

## 🛠️ Tech Stack

| Frontend         | Backend             | Realtime           | Storage / Database      |
|------------------|----------------------|--------------------|--------------------------|
| React.js + Tailwind CSS | Node.js + Express.js | Socket.IO          | MongoDB (for metadata)   |
| Vite (optional for fast dev) | Multer (for file uploads) | WebSocket Protocol | Local Disk / AWS S3 (future) |
| Monaco Editor / CodeMirror | CORS Middleware | Room Events | Firebase Auth (optional) |

---

## ✨ Features

- 🔒 **Private Room Creation** with unique IDs.
- 📂 **File Upload** (only valid code files ≤ 20MB).
- 🚫 **No ZIPs or Folders** upload.
- 🔄 **Real-Time Code Editing** with live synchronization.
- 🎨 **Syntax Highlighted Code Editor**.
- 🛡️ **File Type and Size Validation**.

---

## 🛠️ Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/codecrib.git
   cd codecrib
   ```

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
   - Create a `.env` file in the backend folder.
   ```bash
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   ```

5. **Run the app locally:**
   - Visit `http://localhost:5173` to start using CodeCrib.

---

## 📁 Folder Structure

```
/frontend
    /src
        /components
        /pages
        /utils
    index.html
    tailwind.config.js

/backend
    /controllers
    /routes
    /sockets
    /uploads
    server.js
```

---

## 🚀 Future Enhancements

- 🌐 Public Rooms Directory
- 📹 Voice/Video Chat (WebRTC Integration)
- 🧹 Authentication and Protected Routes
- 📜 Code Version History
- 🌎 Multilingual Support

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 🔖 Badges

![GitHub Repo stars](https://img.shields.io/github/stars/your-username/codecrib?style=social)
![GitHub forks](https://img.shields.io/github/forks/your-username/codecrib?style=social)
![GitHub issues](https://img.shields.io/github/issues/your-username/codecrib)
![GitHub license](https://img.shields.io/github/license/your-username/codecrib)

---

> Crafted with ❤️ by **Ravindra boss** 🫡
