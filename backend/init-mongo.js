// MongoDB initialization script
// This runs when the MongoDB container starts for the first time
// It creates the app database user and sets up initial indexes

db = db.getSiblingDB('jointright_prod');

// Create collections with indexes
db.createCollection('users');
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });
db.users.createIndex({ createdAt: 1 });

db.createCollection('meetings');
db.meetings.createIndex({ meetingId: 1 }, { unique: true });
db.meetings.createIndex({ creator: 1 });
db.meetings.createIndex({ status: 1 });
db.meetings.createIndex({ scheduledTime: 1 });

db.createCollection('cyberscores');
db.cyberscores.createIndex({ userId: 1 }, { unique: true });

db.createCollection('meetingnotifications');
db.meetingnotifications.createIndex({ userId: 1 });
db.meetingnotifications.createIndex({ status: 1 });
db.meetingnotifications.createIndex({ scheduledFor: 1 });

print('✅ JointRight database initialized successfully');
print('   - Collections created: users, meetings, cyberscores, meetingnotifications');
print('   - Indexes created for all collections');
