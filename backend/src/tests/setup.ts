import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from '../config/server.config';
import logger from '../utils/logger';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri);
    logger.info('Connected to in-memory database');
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    logger.info('Disconnected from in-memory database');
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
}); 