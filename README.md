CHATSERVER PROJECT REPORT

I. PROJECT MOTIVATION
Originally a classroom assignment using Java Socket and Java Swing, the initial version faced significant limitations including outdated UI, low security, and data corruption issues (binary encoding errors and excessive storage consumption). To overcome these challenges, the project was completely re-architected into a modern Web-based platform, prioritizing user experience, data integrity, and global online accessibility.

II. SYSTEM FEATURES
1. User Management: Secure registration, authentication, and real-time online status monitoring.
2. Advanced Messaging: Support for both global public chat rooms and private one-on-one conversations.
3. Multimedia Support: Seamless sharing of various file formats, images, videos, emojis, and GIFs.
4. Message Forwarding: Ability to share existing messages and media with other users within the communication history.
5. Real-time Communication: Integrated high-quality voice and video calling features.

III. TECHNICAL STACK
1. Backend: Java Spring Boot, WebSocket, Docker.
2. Frontend: React (Vite), HTML5, CSS3, JavaScript.
3. Database & Storage: MySQL Server, Firebase Storage, Cloudinary.
4. Networking: WebRTC Protocol, TURN/STUN Services (Metered) for cross-network connectivity.
5. Deployment: Render (Backend), Vercel (Frontend), Railway (Database).

IV. RESOURCE OPTIMIZATION SOLUTIONS
To maintain system stability on high-constraint hardware (500MB RAM Server), the following technical optimizations were implemented:
1. Client-side Upload Mechanism: Files are uploaded directly from the client to Cloud Storage, preventing memory overflow on the backend server.
2. Metadata-driven Architecture: The server exclusively processes and stores URL references instead of raw binary data, minimizing JVM heap memory usage.
3. Multi-threaded Processing: Optimized WebSocket thread management to handle concurrent connections efficiently without service interruption.
