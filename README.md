# Insyd Notification System POC

## Objective

The objective of this assignment is to develop a proof-of-concept (POC) notification system for Insyd, a next-generation social web platform for the architecture industry. The system enables users to follow others, create activities (e.g., posts), and receive real-time notifications (e.g., "User X followed you" or "User Y posted a design"). Designed for 100 daily active users (DAUs) with scalability considerations for 1M DAUs, the POC focuses on simplicity, cost-efficiency, and core functionality using NodeJS, MongoDB, ReactJS, and Socket.io, without authentication or caching.

<div style="text-align: center;">
     <img src="images\home_page.jpeg" alt="ui">
</div>
<br/>

## Tools and Libraries Used

- **React:** Frontend framework for building an intuitive user interface with user selection, activity creation, and notification display.
- **Node.js & Express.js:** Backend runtime and framework for API endpoints to manage users, follows, activities, and notifications.
- **MongoDB:** NoSQL database for storing users, follow relationships, activities, and notifications.
- **Socket.io:** Enables real-time notification delivery to online users via WebSocket.
- **Tailwind CSS:** Utility-first CSS framework (via CDN) for minimal, modern styling of the frontend.
- **Axios:** HTTP client for API calls in the frontend.
- **React-hot-toast:** Lightweight library for toast notifications in the UI.
- **Async:** Library for in-memory queue processing to simulate scalable event handling.
- **Winston:** Logging library for debugging and analytics.
- **Cors:** Middleware to enable cross-origin resource sharing for API calls.

## Improvements with More Time

- **Authentication:** Integrate JWT-based authentication to secure user actions and personalize notifications.
- **Database Optimization:** Add MongoDB sharding and Redis caching for 1M DAUs to handle high query volumes.
- **Real-Time Scalability:** Replace in-memory queue with RabbitMQ for distributed event processing.
- **Push Notifications:** Implement Firebase for mobile push notifications for offline users.
- **Advanced UI Features:** Add responsive design for mobile devices and a notification badge counter.
- **Notification Coalescing:** Group similar notifications (e.g., "5 users followed you") to reduce spam for popular users.
- **Analytics Dashboard:** Use Grafana to visualize notification delivery metrics and user engagement.

## Challenges Faced and Solutions

- **Empty Follows Issue:** The `/activity` endpoint’s `for` loop was skipped due to an empty `follows` array.\
  **Solution:** Added sample data with follow relationships and validated `followeeId` in `POST /follow`. Logs confirmed follower retrieval.
- **Real-Time Notification Delivery:** Socket.io connections needed to scale for multiple users.\
  **Solution:** Used user-specific rooms (`socket.join(userId)`) and a polling fallback (30s interval) for offline users.
- **UI Usability:** Manual user ID input was error-prone.\
  **Solution:** Implemented dropdowns for user selection using `GET /users` and added toast notifications for feedback.

## Set Up Instructions

<details>
<summary>Click to view</summary>summary>

1. **Clone Repositories**:

   - Backend: `git clone github.com/example/insyd-backend`
   - Frontend: `git clone github.com/example/insyd-frontend`

2. **Backend Setup** (`insyd-backend`):

   - Install dependencies: `npm install`
   - Ensure MongoDB is running locally or via Atlas (`mongodb://localhost:27017/insyd`).
   - Import sample data:

     ```bash
     mongoimport --db insyd --collection users --file data/users.json --jsonArray
     mongoimport --db insyd --collection follows --file data/follows.json --jsonArray
     mongoimport --db insyd --collection activities --file data/activities.json --jsonArray
     mongoimport --db insyd --collection notifications --file data/notifications.json --jsonArray
     ```
   - Start server: `node app.js`

3. **Frontend Setup** (`insyd-frontend`):

   - Install dependencies: `npm install`
   - Start app: `npm start`
   - Access at `http://localhost:3000`

4. **Testing**:

   - Use Postman to test API endpoints (see below).
   - Verify frontend displays users, follows, and notifications.
</details>

## Assignment Completion Instructions

Functionality to be added

The app must have the following functionalities:

- Allow users to view all users and follow others, triggering notifications.
- Enable users to create activities (e.g., posts) that notify followers based on preferences.
- Display notifications in real-time for online users via Socket.io and persistently for offline users.
- Support marking notifications as read/unread and filtering by type (e.g., post, follow).
- Ensure scalability for 100 DAUs with considerations for 1M DAUs using async event processing.
- Provide logging for debugging and analytics (e.g., notification counts).
- Exclude authentication, caching, and responsive design for POC simplicity.

## Assignment Completion Checklist
<details>
<summary>Click to view</summary>

- The completion checklist includes the following points:
  - [x] I have completed all the functionalities asked in the assignment.

  - [x] I have used only the resources (NodeJS, Express, MongoDB, ReactJS, Socket.io, Tailwind CSS, etc.) specified.

  - [x] I have modified the README.md file based on assignment instructions.

  - [x] I have completed the assignment **ON TIME** (by 10:28 PM IST on Saturday, August 23, 2025).
- **Specific Checklist**:
  - [x] Implemented `GET /users` to display all users in the frontend dropdown.

  - [x] Enabled `POST /follow` to create relationships and notify followees.

  - [x] Ensured `POST /activity` generates notifications for followers, fixing the empty `follows` issue.

  - [x] Supported `GET /notifications/:userId` with type filtering and `PATCH /notifications/:notificationId` for read/unread toggling.

  - [x] Added sample data for users, follows, activities, and notifications.

  - [x] Verified real-time notifications via Socket.io and polling fallback.

  - [x] Tested all endpoints with Postman and frontend integration.
</details>

## Important Note
<details>
<summary>Click to view</summary>

- No user authentication is implemented; the app runs in demo mode with sample data.
- Responsive design is excluded for POC simplicity, but Tailwind CSS ensures a clean UI.
- Sample data is provided in `data/` directory for testing.
</details>

## Resources

Data Fetch URLs

- `http://localhost:5000/users` - Fetch all users for dropdown.
- `http://localhost:5000/follow` - Create a follow relationship.
- `http://localhost:5000/activity` - Create an activity (e.g., post).
- `http://localhost:5000/notifications/:userId?type=<type>` - Fetch notifications for a user, optionally filtered by type.
- `http://localhost:5000/notifications/:notificationId` - Update notification read status.

## Testing Instructions

Postman Testing

1. **Fetch Users** (`GET /users`):

   - URL: `http://localhost:5000/users`
   - Expected: List of 10 users (e.g., `{"_id": "66c5a1b2f1e2d3f4a5b6c7d8", "username": "ArchiMaster"}`).

2. **Create Follow** (`POST /follow`):

   - URL: `http://localhost:5000/follow`
   - Body: `{"followerId": "66c5a1b2f1e2d3f4a5b6c7df", "followeeId": "66c5a1b2f1e2d3f4a5b6c7d8"}`
   - Expected: 200 OK, notification in `db.notifications` for ArchiMaster.

3. **Create Activity** (`POST /activity`):

   - URL: `http://localhost:5000/activity`
   - Body: `{"userId": "66c5a1b2f1e2d3f4a5b6c7d8", "type": "post", "content": "Modern skyscraper concept"}`
   - Expected: 200 OK, notifications for DesignPro, UrbanPlanner, FacadeFan.

4. **Fetch Notifications** (`GET /notifications/:userId`):

   - URL: `http://localhost:5000/notifications/66c5a1b2f1e2d3f4a5b6c7d9?type=post`
   - Expected: List of post notifications for DesignPro.

5. **Update Notification** (`PATCH /notifications/:notificationId`):

   - URL: `http://localhost:5000/notifications/66c5a1b2f1e2d3f4a5b6c808`
   - Body: `{"isRead": true}`
   - Expected: Updated notification with `isRead: true`.
