# 🎬 Movie Sync

> **Watch together. Stay in sync. Anywhere.**

Movie Sync is a real-time watch-party platform built with the **MERN Stack** that allows people in different locations to watch videos together in perfect synchronization. Whether friends are in different cities or family members are across the world, everyone watches the same video at the same time.

Unlike many existing watch-party applications that only support streaming services like Netflix or YouTube, Movie Sync allows users to upload their own videos or share a direct video URL, then create a room where everyone experiences synchronized playback.

---

# 🚀 Vision

Watching movies together shouldn't require being in the same place.

Movie Sync creates a shared viewing experience where every participant stays synchronized. Any playback action performed by an authorized participant—such as Play, Pause, Seek, or changing the video—is reflected instantly for everyone in the room.

Our goal is to make online movie nights feel as close as possible to watching together in the same room.

---

# 💡 Problem Statement

Most watch-party platforms have limitations:

* Only support Netflix, Disney+, YouTube, etc.
* Require browser extensions.
* Don't allow users to upload their own videos.
* Limited support for custom video links.
* No universal watch room.
* Some platforms require everyone to own the same streaming subscription.

Movie Sync solves these problems by providing a universal synchronized video room.

---

# ✨ Features

## 🎥 Video Sources

* Upload your own video
* Play videos using direct URLs
* Change videos anytime
* Support multiple video formats
* Resume playback after reconnecting

---

## 👥 Watch Rooms

* Create public rooms
* Create private rooms
* Password-protected rooms
* Invite friends using Room ID or shareable link
* Join from anywhere in the world
* Unlimited room members (depending on server capacity)

---

## ⚡ Real-Time Synchronization

Every playback action is synchronized instantly.

Supported synchronization events:

* Play
* Pause
* Seek
* Skip
* Restart
* Playback Speed
* Video Change
* Fullscreen status (optional)
* Subtitle selection

If one user performs an action, every participant sees the exact same result.

Example:

User A presses **Pause**

↓

Server receives pause event

↓

Broadcast to everyone

↓

Every connected user's video pauses instantly

---

## 💬 Chat

Built-in room chat

Features include:

* Live messaging
* Emoji reactions
* Typing indicator
* Join/Leave notifications
* Message history

---

## 👑 Host Controls

Room creator becomes the Host.

Host permissions:

* Change movie
* Remove users
* Lock room
* Transfer host
* Enable Host-only playback controls
* End session

---

## 🔄 Smart Auto Sync

Movie Sync continuously checks synchronization.

If someone experiences:

* Slow internet
* Buffering
* Temporary disconnect
* Late room join

The application automatically synchronizes their playback to the current room timestamp.

---

## 🔐 Authentication

* User Registration
* Login
* JWT Authentication
* Secure Password Hashing
* User Profiles

---

## 📜 Watch History

Users can view

* Previously watched movies
* Recent rooms
* Continue watching
* Favorite movies

---

## 🌎 Cross Platform

Accessible from:

* Desktop
* Laptop
* Tablet
* Mobile Browser

No browser extensions required.

---

# 🛠 Tech Stack

## Frontend

* React.js
* Vite
* Tailwind CSS
* React Router
* Socket.IO Client
* HTML5 Video Player
* React Player (for supported URLs)

## Backend

* Node.js
* Express.js
* Socket.IO
* MongoDB
* Mongoose
* JWT Authentication
* Multer

## Storage

Supports

* Local Storage (Development)
* AWS S3
* Cloudinary
* Backblaze B2

---

# ⚙ System Architecture

```text
                   React Frontend
                         │
                  Socket.IO Client
                         │
                  WebSocket Connection
                         │
                Node.js + Express Server
                         │
               Socket.IO Room Management
                         │
          ┌──────────────┴──────────────┐
          │                             │
      MongoDB                     File Storage
          │                             │
      Room Data                  Uploaded Videos
          │
   Users │ Messages │ Playback State
```

---

# 📂 Project Structure

```text
movie-sync/

client/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── context/
│   ├── services/
│   ├── utils/
│   └── App.jsx
│
server/
│
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── socket/
├── uploads/
├── utils/
└── server.js
```

---

# 📦 Database Design

## User

```javascript
{
    username,
    email,
    password,
    avatar,
    createdAt
}
```

## Room

```javascript
{
    roomId,
    roomName,
    host,
    members,
    movieUrl,
    currentTime,
    isPlaying,
    playbackSpeed,
    isLocked,
    password,
    createdAt
}
```

## Chat

```javascript
{
    roomId,
    sender,
    message,
    timestamp
}
```

---

# 🔌 Socket Events

## Client → Server

* create-room
* join-room
* leave-room
* play
* pause
* seek
* change-movie
* playback-speed
* send-message
* typing
* disconnect

## Server → Client

* room-created
* user-joined
* user-left
* sync-state
* movie-updated
* receive-message
* room-ended
* error

---

# 🎬 User Flow

## Create Room

```
Login

↓

Upload Movie / Enter Movie URL

↓

Create Room

↓

Receive Room ID

↓

Share Room ID

↓

Friends Join

↓

Everyone Watches Together
```

---

## Join Room

```
Open Invite Link

↓

Join Room

↓

Server Sends Current Playback State

↓

Video Seeks to Current Timestamp

↓

Playback Starts Automatically

↓

Fully Synced
```

---

# 🔄 Playback Synchronization Example

```
Host presses Pause

↓

Socket Event

↓

Server

↓

Broadcast Pause Event

↓

Every Connected User Pauses
```

---

# 🚀 Future Features

* Voice Chat
* Video Calling
* Screen Sharing
* Live Reactions
* Polls
* Movie Queue
* Playlist Support
* AI Movie Recommendations
* Subtitle Upload
* Multiple Subtitle Languages
* Chromecast Support
* Smart TV Support
* Progressive Web App (PWA)
* Offline Download (for authorized content)
* Dark Mode
* Notifications
* Friend System
* User Presence
* Activity Status

---

# 📈 Development Roadmap

## Phase 1 (MVP)

* User Authentication
* Create Room
* Join Room
* Upload Movie
* Video URL Support
* HTML5 Video Player
* Play/Pause Sync
* Seek Sync
* Chat
* Responsive UI

---

## Phase 2

* Host Controls
* Invite Links
* Password Protected Rooms
* Watch History
* Public Rooms
* Playback Speed Sync
* Auto Reconnect

---

## Phase 3

* Cloud Storage
* Voice Chat
* Video Calling
* Screen Sharing
* Subtitle Support
* Playlist Support
* Mobile Optimization
* PWA
* Advanced Analytics

---

# ⚖ Copyright & Content Policy

Movie Sync is designed for synchronizing video playback between users.

Users are responsible for ensuring they have the necessary rights or permissions to upload, stream, or share any video content. The platform is intended for personal videos, openly licensed content, or media that users are legally authorized to distribute.

---

# 🤝 Contributing

Contributions are welcome!

If you'd like to improve Movie Sync, feel free to:

* Fork the repository
* Create a new feature branch
* Commit your changes
* Open a Pull Request

---

# 📄 License

This project will be released under the MIT License.

---

# ❤️ Why Movie Sync?

Movie Sync is more than just a video player.

It's a platform that recreates the feeling of watching together—even when you're miles apart. By combining real-time synchronization, chat, room management, and flexible video sources, Movie Sync aims to provide a seamless shared viewing experience for friends, families, classmates, and communities around the world.
