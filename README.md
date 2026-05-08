CHATSERVER PROJECT REPORT
I. PROJECT MOTIVATION
Originally a classroom assignment using Java Socket and Java Swing, the initial version faced significant issues with UI aesthetics, low security, and data corruption (binary encoding errors and excessive storage consumption). This project was upgraded to a modern Web-based architecture to enhance user experience, ensure data integrity, and enable global accessibility.
II. KEY FEATURES
1. User Management: Registration, authentication, and real-time online status tracking.
2. Messaging Modes: Public global chat and private one-on-one messaging.
3. Multimedia Interaction: Support for multi-format file sharing, images, videos, emojis, and GIFs.
4. Message Forwarding: Capability to share messages and media with other users within the chat history.
5. Real-time Communication: Integrated voice and video calling features via web protocols.
III. TECH STACK
1. Backend: Java Spring Boot, WebSocket, Docker.
2. Frontend: React, Vite.
3. Database & Storage: MySQL Server, Cloudinary.
4. Networking: WebRTC, TURN/STUN Services (Metered).
5. Deployment: Render, Vercel, Railway.
IV. RESOURCE OPTIMIZATION
1. Client-side Upload: Heavy files are uploaded directly to Cloud Storage, bypassing the backend to prevent memory overflow.
2. Metadata Management: The server only processes and stores URLs, significantly reducing the workload on the Java Virtual Machine.
3. Multi-threading: Efficient handling of concurrent WebSocket connections to maintain system stability under load.
